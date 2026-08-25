import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const defaultWebhookRawRoot = path.resolve(moduleDir, '..', '.raw', 'm0.5-e-webhooks');
const CAPTURE_ID = /^[A-Za-z0-9_-]{1,100}$/;

async function prepareRoot(rawRoot) {
  const resolved = path.resolve(rawRoot);
  try {
    const existing = await fs.lstat(resolved);
    if (!existing.isDirectory() || existing.isSymbolicLink()) {
      throw new Error('Webhook capture failed: raw root is unsafe');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.mkdir(resolved, { recursive: true });
    const created = await fs.lstat(resolved);
    if (!created.isDirectory() || created.isSymbolicLink()) {
      throw new Error('Webhook capture failed: raw root is unsafe');
    }
  }
  return resolved;
}

export async function captureRawWebhook({
  captureId,
  rawBody,
  selectedHeaders,
  contentType,
  recognizedHeaderCasing,
  rawRoot = defaultWebhookRawRoot
}) {
  if (typeof captureId !== 'string' || !CAPTURE_ID.test(captureId)) {
    throw new Error('Webhook capture failed: invalid capture identifier');
  }
  if (!Buffer.isBuffer(rawBody) && !(rawBody instanceof Uint8Array)) {
    throw new Error('Webhook capture failed: raw body must be bytes');
  }

  const root = await prepareRoot(rawRoot);
  const realRoot = await fs.realpath(root);
  const destination = path.join(root, `webhook-${captureId}.json`);
  const relative = path.relative(realRoot, path.resolve(destination));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Webhook capture failed: destination escapes raw root');
  }

  const signatures = {};
  for (const key of ['x-chapa-signature', 'chapa-signature']) {
    if (selectedHeaders && Object.hasOwn(selectedHeaders, key)) {
      if (typeof selectedHeaders[key] !== 'string') {
        throw new Error('Webhook capture failed: invalid selected header');
      }
      signatures[key] = selectedHeaders[key];
    }
  }

  const casing = {};
  for (const key of ['x-chapa-signature', 'chapa-signature', 'content-type']) {
    if (recognizedHeaderCasing && Object.hasOwn(recognizedHeaderCasing, key)) {
      const value = recognizedHeaderCasing[key];
      if (typeof value !== 'string' || value.toLowerCase() !== key) {
        throw new Error('Webhook capture failed: invalid header casing observation');
      }
      casing[key] = value;
    }
  }

  const payload = {
    captureId,
    rawBodyBase64: Buffer.from(rawBody).toString('base64'),
    signatures,
    ...(typeof contentType === 'string' ? { contentType } : {}),
    recognizedHeaderCasing: casing
  };

  try {
    await fs.writeFile(destination, JSON.stringify(payload, null, 2), { flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Webhook capture failed: capture already exists');
    throw new Error('Webhook capture failed: local write failure');
  }
  return destination;
}

export function extractWebhookHeaders(headers = {}, rawHeaders) {
  const observations = new Map();
  const add = (name, value) => {
    const lower = String(name).toLowerCase();
    if (!['x-chapa-signature', 'chapa-signature', 'content-type'].includes(lower)) return;
    if (Array.isArray(value) || typeof value !== 'string') {
      throw new Error('Webhook header extraction failed: ambiguous recognized header');
    }
    const list = observations.get(lower) ?? [];
    list.push({ name: String(name), value });
    observations.set(lower, list);
  };

  if (Array.isArray(rawHeaders)) {
    if (rawHeaders.length % 2 !== 0) throw new Error('Webhook header extraction failed: malformed raw headers');
    for (let index = 0; index < rawHeaders.length; index += 2) add(rawHeaders[index], rawHeaders[index + 1]);
  } else {
    for (const [name, value] of Object.entries(headers)) add(name, value);
  }

  for (const name of ['x-chapa-signature', 'chapa-signature']) {
    if ((observations.get(name)?.length ?? 0) > 1) {
      throw new Error('Webhook header extraction failed: duplicate signature header');
    }
  }
  if ((observations.get('content-type')?.length ?? 0) > 1) {
    throw new Error('Webhook header extraction failed: duplicate content-type header');
  }

  const selectedHeaders = {};
  const recognizedHeaderCasing = {};
  for (const [name, values] of observations) {
    const [{ name: originalName, value }] = values;
    recognizedHeaderCasing[name] = originalName;
    if (name === 'content-type') continue;
    selectedHeaders[name] = value;
  }
  return {
    selectedHeaders,
    contentType: observations.get('content-type')?.[0].value,
    recognizedHeaderCasing
  };
}
