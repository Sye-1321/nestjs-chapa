import http from 'node:http';
import { captureRawWebhook, extractWebhookHeaders } from './webhook-capture.mjs';

const SAFE_PATH = /^\/m05e-[A-Za-z0-9_-]{20,100}$/;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

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
  if (!LOOPBACK_HOSTS.has(host)) throw new Error('Webhook receiver configuration failed: non-loopback host');
  if (!SAFE_PATH.test(exactPath ?? '')) throw new Error('Webhook receiver configuration failed: unsafe exact path');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new Error('Webhook receiver configuration failed: invalid timeout');
  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 1) throw new Error('Webhook receiver configuration failed: invalid body limit');
  if (!Number.isInteger(expectedCaptureCount) || expectedCaptureCount < 1) throw new Error('Webhook receiver configuration failed: invalid capture count');
  if (typeof captureIdFactory !== 'function') throw new Error('Webhook receiver configuration failed: capture ID factory required');

  let captureCount = 0;
  let rejectedCount = 0;
  let captureInProgress = false;
  let settled = false;
  let timer;
  let resolveResult;
  const result = new Promise(resolve => { resolveResult = resolve; });

  const finish = (state, { terminateConnections = false } = {}) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    server.close();
    if (terminateConnections) server.closeAllConnections();
    resolveResult({ state, captureCount, rejectedCount });
  };

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
    let requestFinished = false;
    const rejectAcceptedRequest = statusCode => {
      if (requestFinished) return;
      requestFinished = true;
      chunks.length = 0;
      captureInProgress = false;
      if (!settled) rejectedCount += 1;
      if (!response.headersSent && !response.destroyed) {
        response.writeHead(statusCode);
        response.end();
        request.socket.destroySoon();
      } else {
        request.socket.destroy();
      }
    };
    request.on('data', chunk => {
      if (requestFinished) return;
      size += chunk.length;
      if (size > maxBodyBytes) {
        rejectAcceptedRequest(413);
      } else {
        chunks.push(Buffer.from(chunk));
      }
    });
    request.on('end', async () => {
      if (requestFinished || settled) return;
      requestFinished = true;
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
        if (captureCount === expectedCaptureCount) {
          finish('captured');
        } else {
          captureInProgress = false;
        }
      } catch {
        chunks.length = 0;
        if (!response.headersSent && !response.destroyed) response.writeHead(500);
        if (!response.destroyed) response.end();
        finish('capture-failure', { terminateConnections: true });
      }
    });
    request.on('aborted', () => rejectAcceptedRequest(400));
    request.on('error', () => rejectAcceptedRequest(400));
  });

  server.on('clientError', (error, socket) => {
    if (socket && !socket.destroyed) socket.destroy();
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  timer = setTimeout(() => finish('timeout', { terminateConnections: true }), timeoutMs);

  return {
    host,
    port: address.port,
    exactPath,
    result,
    close: async () => {
      if (!settled) {
        finish('closed', { terminateConnections: true });
      }
    }
  };
}
