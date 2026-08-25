import http from 'node:http';
import { captureRawWebhook, extractWebhookHeaders } from './webhook-capture.mjs';

const SAFE_PATH = /^\/m05e-[A-Za-z0-9_-]{20,100}$/;

export async function startOneShotWebhookReceiver({
  host = '127.0.0.1',
  port = 0,
  exactPath,
  timeoutMs,
  maxBodyBytes,
  expectedCaptureCount = 1,
  rawRoot,
  captureIdFactory,
  capture = captureRawWebhook
}) {
  if (!SAFE_PATH.test(exactPath ?? '')) throw new Error('Webhook receiver configuration failed: unsafe exact path');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new Error('Webhook receiver configuration failed: invalid timeout');
  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 1) throw new Error('Webhook receiver configuration failed: invalid body limit');
  if (!Number.isInteger(expectedCaptureCount) || expectedCaptureCount < 1) throw new Error('Webhook receiver configuration failed: invalid capture count');
  if (typeof captureIdFactory !== 'function') throw new Error('Webhook receiver configuration failed: capture ID factory required');

  let captureCount = 0;
  let rejectedCount = 0;
  let captureInProgress = false;
  let settled = false;
  let resolveResult;
  const result = new Promise(resolve => { resolveResult = resolve; });

  const server = http.createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== exactPath) {
      rejectedCount += 1;
      response.writeHead(request.method === 'POST' ? 404 : 405);
      response.end();
      request.resume();
      return;
    }
    if (captureInProgress) {
      rejectedCount += 1;
      response.writeHead(409);
      response.end();
      request.resume();
      return;
    }
    captureInProgress = true;

    let extracted;
    try {
      extracted = extractWebhookHeaders(request.headers, request.rawHeaders);
    } catch {
      rejectedCount += 1;
      response.writeHead(400);
      response.end();
      request.resume();
      captureInProgress = false;
      return;
    }

    const chunks = [];
    let size = 0;
    let oversized = false;
    request.on('data', chunk => {
      if (oversized) return;
      size += chunk.length;
      if (size > maxBodyBytes) {
        oversized = true;
        chunks.length = 0;
      } else {
        chunks.push(Buffer.from(chunk));
      }
    });
    request.on('end', async () => {
      if (oversized) {
        rejectedCount += 1;
        response.writeHead(413);
        response.end();
        captureInProgress = false;
        return;
      }
      try {
        const captureId = captureIdFactory(captureCount);
        await capture({
          captureId,
          rawBody: Buffer.concat(chunks),
          selectedHeaders: extracted.selectedHeaders,
          contentType: extracted.contentType,
          recognizedHeaderCasing: extracted.recognizedHeaderCasing,
          rawRoot
        });
        captureCount += 1;
        response.writeHead(200);
        response.end();
        if (captureCount === expectedCaptureCount && !settled) {
          settled = true;
          clearTimeout(timer);
          server.close(() => resolveResult({ state: 'captured', captureCount, rejectedCount }));
        } else {
          captureInProgress = false;
        }
      } catch {
        response.writeHead(500);
        response.end();
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          server.close(() => resolveResult({ state: 'capture-failure', captureCount, rejectedCount }));
        }
      }
    });
    request.on('error', () => {
      captureInProgress = false;
      if (!response.headersSent) response.writeHead(400);
      response.end();
    });
  });

  server.on('clientError', socket => socket.destroy());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    server.close(() => resolveResult({ state: 'timeout', captureCount, rejectedCount }));
  }, timeoutMs);

  return {
    host,
    port: address.port,
    exactPath,
    result,
    close: async () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        await new Promise(resolve => server.close(resolve));
        resolveResult({ state: 'closed', captureCount, rejectedCount });
      }
    }
  };
}
