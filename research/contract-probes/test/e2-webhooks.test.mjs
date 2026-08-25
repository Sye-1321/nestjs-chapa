import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import {
  captureRawWebhook,
  defaultWebhookRawRoot,
  extractWebhookHeaders
} from '../lib/webhook-capture.mjs';
import {
  WEBHOOK_CANDIDATE_MATRIX,
  decodeSha256Signature,
  diagnoseRawVsReserialized,
  evaluateWebhookCandidates,
  hmacSha256,
  timingSafeSignatureMatch
} from '../lib/webhook-crypto.mjs';
import { startOneShotWebhookReceiver } from '../lib/webhook-receiver.mjs';

const receiverPath = '/m05e-webhook-0123456789abcdef';
const syntheticWebhookConfiguredSecret = 'synthetic-webhook-configured-secret';
const syntheticApiSecretKey = 'synthetic-api-secret-key';
const formattedRaw = Buffer.from('{ "event" : "charge.synthetic", "value" : 1 }', 'utf8');

async function tempRoot(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'm05e-webhook-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

function request({ port, method = 'POST', requestPath = receiverPath, headers = {}, body = Buffer.alloc(0) }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: requestPath, headers }, response => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    });
    req.on('error', reject);
    req.end(body);
  });
}

function openRawClient(port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port }, () => resolve(socket));
    socket.once('error', reject);
  });
}

function waitForSocketClose(socket) {
  if (socket.destroyed) return Promise.resolve();
  socket.resume();
  return new Promise(resolve => socket.once('close', resolve));
}

describe('M0.5-E E2 raw capture and headers', () => {
  test('preserves exact bytes and only bounded metadata in an injected temp root', async t => {
    const root = await tempRoot(t);
    const raw = Buffer.from([0x00, 0xff, 0x7b, 0x20, 0x7d]);
    const file = await captureRawWebhook({
      captureId: 'capture_01', rawBody: raw, rawRoot: root,
      selectedHeaders: { 'x-chapa-signature': 'synthetic-signature', authorization: 'excluded', cookie: 'excluded' },
      contentType: 'application/json',
      recognizedHeaderCasing: { 'x-chapa-signature': 'X-Chapa-Signature', 'content-type': 'Content-Type' }
    });
    const stored = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.deepEqual(Buffer.from(stored.rawBodyBase64, 'base64'), raw);
    assert.deepEqual(Object.keys(stored.signatures), ['x-chapa-signature']);
    assert.equal(JSON.stringify(stored).includes('authorization'), false);
    assert.equal(JSON.stringify(stored).includes('cookie'), false);
    assert.equal(JSON.stringify(stored).includes('query'), false);
  });

  test('capture collision rejects without overwrite', async t => {
    const root = await tempRoot(t);
    const input = { captureId: 'same_id', rawBody: Buffer.from('first'), rawRoot: root };
    const file = await captureRawWebhook(input);
    await assert.rejects(() => captureRawWebhook({ ...input, rawBody: Buffer.from('second') }), /already exists/);
    const stored = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.equal(Buffer.from(stored.rawBodyBase64, 'base64').toString(), 'first');
  });

  test('invalid capture IDs, non-byte bodies, and symlink roots fail safely', async t => {
    const root = await tempRoot(t);
    for (const captureId of ['', '../escape', 'bad/path', 'bad\\path']) {
      await assert.rejects(() => captureRawWebhook({ captureId, rawBody: Buffer.alloc(0), rawRoot: root }), /invalid capture identifier/);
    }
    await assert.rejects(() => captureRawWebhook({ captureId: 'safe', rawBody: '{}', rawRoot: root }), /raw body must be bytes/);

    const target = await tempRoot(t);
    const link = path.join(os.tmpdir(), `m05e-link-${Date.now()}`);
    try {
      await fs.symlink(target, link, 'junction');
      t.after(() => fs.rm(link, { force: true }));
      await assert.rejects(() => captureRawWebhook({ captureId: 'safe', rawBody: Buffer.alloc(0), rawRoot: link }), /raw root is unsafe/);
    } catch (error) {
      if (!['EPERM', 'EACCES'].includes(error.code)) throw error;
    }
  });

  test('errors contain no body, signature, or secret values', async t => {
    const root = await tempRoot(t);
    const sentinel = 'SYNTHETIC_PRIVATE_SENTINEL';
    await captureRawWebhook({ captureId: 'collision', rawBody: Buffer.from(sentinel), selectedHeaders: { 'x-chapa-signature': sentinel }, rawRoot: root });
    let error;
    try { await captureRawWebhook({ captureId: 'collision', rawBody: Buffer.from(sentinel), selectedHeaders: { 'x-chapa-signature': sentinel }, rawRoot: root }); } catch (caught) { error = caught; }
    assert.equal(error.message.includes(sentinel), false);
  });

  test('case-insensitive extraction preserves minimal recognized casing and excludes unrelated headers', () => {
    const result = extractWebhookHeaders({}, [
      'X-Chapa-Signature', 'abc', 'chapa-SIGNATURE', 'def', 'Content-Type', 'application/json',
      'Authorization', 'Bearer hidden', 'Cookie', 'hidden', 'X-Unrelated', 'hidden'
    ]);
    assert.deepEqual(result.selectedHeaders, { 'x-chapa-signature': 'abc', 'chapa-signature': 'def' });
    assert.equal(result.contentType, 'application/json');
    assert.deepEqual(result.recognizedHeaderCasing, {
      'x-chapa-signature': 'X-Chapa-Signature',
      'chapa-signature': 'chapa-SIGNATURE',
      'content-type': 'Content-Type'
    });
    assert.equal(JSON.stringify(result).includes('Authorization'), false);
    assert.equal(JSON.stringify(result).includes('Cookie'), false);
  });

  test('duplicate and multi-value signature headers reject conservatively', () => {
    assert.throws(() => extractWebhookHeaders({}, ['X-Chapa-Signature', 'a', 'x-chapa-signature', 'b']), /duplicate signature header/);
    assert.throws(() => extractWebhookHeaders({ 'x-chapa-signature': ['a', 'b'] }), /ambiguous recognized header/);
  });
});

describe('M0.5-E E2 one-shot receiver', () => {
  test('module import caused no listener and explicit start defaults to loopback', async t => {
    const root = await tempRoot(t);
    const receiver = await startOneShotWebhookReceiver({ exactPath: receiverPath, timeoutMs: 1000, maxBodyBytes: 100, rawRoot: root, captureIdFactory: () => 'explicit_start' });
    assert.equal(receiver.host, '127.0.0.1');
    await receiver.close();
  });

  test('rejects non-loopback hosts before listening', async () => {
    for (const host of ['0.0.0.0', '::', '192.168.1.10', '203.0.113.10']) {
      await assert.rejects(
        () => startOneShotWebhookReceiver({ host, exactPath: receiverPath, timeoutMs: 1000, maxBodyBytes: 100, captureIdFactory: () => 'never' }),
        /non-loopback host/
      );
    }
  });

  test('malformed HTTP exercises clientError and destroys only the socket', async t => {
    const root = await tempRoot(t);
    const receiver = await startOneShotWebhookReceiver({ exactPath: receiverPath, timeoutMs: 80, maxBodyBytes: 100, rawRoot: root, captureIdFactory: () => 'never' });
    const socket = await openRawClient(receiver.port);
    socket.write('INVALID HTTP REQUEST\r\n\r\n');
    await Promise.race([
      waitForSocketClose(socket),
      new Promise((_, reject) => setTimeout(() => reject(new Error('clientError socket remained open')), 300))
    ]);
    assert.deepEqual(await receiver.result, { state: 'timeout', captureCount: 0, rejectedCount: 0 });
    assert.deepEqual(await fs.readdir(root), []);
  });

  test('exact POST/path captures raw invalid JSON without parsing and closes at one', async t => {
    const root = await tempRoot(t);
    const receiver = await startOneShotWebhookReceiver({ exactPath: receiverPath, timeoutMs: 1000, maxBodyBytes: 100, rawRoot: root, captureIdFactory: () => 'one_shot' });
    const body = Buffer.from('{ not-json : exact bytes }');
    const status = await request({ port: receiver.port, headers: { 'X-Chapa-Signature': 'synthetic', 'Content-Type': 'application/json' }, body });
    assert.equal(status, 200);
    assert.deepEqual(await receiver.result, { state: 'captured', captureCount: 1, rejectedCount: 0 });
    const stored = JSON.parse(await fs.readFile(path.join(root, 'webhook-one_shot.json'), 'utf8'));
    assert.deepEqual(Buffer.from(stored.rawBodyBase64, 'base64'), body);
    await assert.rejects(() => request({ port: receiver.port, body }), /ECONNREFUSED|socket hang up/);
  });

  test('GET, wrong path, and query reject without evidence', async t => {
    const root = await tempRoot(t);
    const receiver = await startOneShotWebhookReceiver({ exactPath: receiverPath, timeoutMs: 1000, maxBodyBytes: 100, rawRoot: root, captureIdFactory: () => 'never' });
    assert.equal(await request({ port: receiver.port, method: 'GET' }), 405);
    assert.equal(await request({ port: receiver.port, requestPath: '/wrong' }), 404);
    assert.equal(await request({ port: receiver.port, requestPath: `${receiverPath}?x=1` }), 404);
    assert.deepEqual(await fs.readdir(root), []);
    await receiver.close();
  });

  test('body exactly at limit accepted and limit plus one rejected', async t => {
    const acceptedRoot = await tempRoot(t);
    const accepted = await startOneShotWebhookReceiver({ exactPath: receiverPath, timeoutMs: 1000, maxBodyBytes: 5, rawRoot: acceptedRoot, captureIdFactory: () => 'at_limit' });
    assert.equal(await request({ port: accepted.port, body: Buffer.alloc(5) }), 200);
    assert.equal((await accepted.result).state, 'captured');

    const rejectedRoot = await tempRoot(t);
    const rejected = await startOneShotWebhookReceiver({ exactPath: receiverPath, timeoutMs: 80, maxBodyBytes: 5, rawRoot: rejectedRoot, captureIdFactory: () => 'over_limit' });
    const status = await request({ port: rejected.port, body: Buffer.alloc(6) }).catch(error => error.code);
    assert.notEqual(status, 200);
    assert.ok(status === 413 || ['ECONNRESET', 'EPIPE'].includes(status));
    assert.deepEqual(await fs.readdir(rejectedRoot), []);
    assert.deepEqual(await rejected.result, { state: 'timeout', captureCount: 0, rejectedCount: 1 });
  });

  test('accepted POST that never ends cannot defeat the receiver timeout', async t => {
    const root = await tempRoot(t);
    const receiver = await startOneShotWebhookReceiver({ exactPath: receiverPath, timeoutMs: 60, maxBodyBytes: 100, rawRoot: root, captureIdFactory: () => 'partial' });
    const socket = await openRawClient(receiver.port);
    socket.write(`POST ${receiverPath} HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 20\r\n\r\npartial`);
    const startedAt = Date.now();
    const outcome = await Promise.race([
      receiver.result,
      new Promise((_, reject) => setTimeout(() => reject(new Error('receiver exceeded bounded timeout')), 400))
    ]);
    assert.equal(outcome.state, 'timeout');
    assert.ok(Date.now() - startedAt < 400);
    await waitForSocketClose(socket);
    assert.deepEqual(await fs.readdir(root), []);
  });

  test('oversized streaming body terminates without waiting for end or creating evidence', async t => {
    const root = await tempRoot(t);
    const receiver = await startOneShotWebhookReceiver({ exactPath: receiverPath, timeoutMs: 100, maxBodyBytes: 5, rawRoot: root, captureIdFactory: () => 'oversized_stream' });
    const socket = await openRawClient(receiver.port);
    socket.write(`POST ${receiverPath} HTTP/1.1\r\nHost: 127.0.0.1\r\nTransfer-Encoding: chunked\r\n\r\n6\r\n123456\r\n`);
    await Promise.race([
      waitForSocketClose(socket),
      new Promise((_, reject) => setTimeout(() => reject(new Error('oversized socket remained open')), 400))
    ]);
    assert.deepEqual(await receiver.result, { state: 'timeout', captureCount: 0, rejectedCount: 1 });
    assert.deepEqual(await fs.readdir(root), []);
  });

  test('aborted accepted request creates no evidence and leaves the session bounded', async t => {
    const root = await tempRoot(t);
    const receiver = await startOneShotWebhookReceiver({ exactPath: receiverPath, timeoutMs: 80, maxBodyBytes: 100, rawRoot: root, captureIdFactory: () => 'aborted' });
    const socket = await openRawClient(receiver.port);
    socket.write(`POST ${receiverPath} HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 20\r\n\r\npartial`);
    socket.destroy();
    assert.deepEqual(await receiver.result, { state: 'timeout', captureCount: 0, rejectedCount: 1 });
    assert.deepEqual(await fs.readdir(root), []);
  });

  test('configured bounded capture count closes exactly at the expected count', async t => {
    const root = await tempRoot(t);
    const receiver = await startOneShotWebhookReceiver({
      exactPath: receiverPath, timeoutMs: 1000, maxBodyBytes: 10, expectedCaptureCount: 2,
      rawRoot: root, captureIdFactory: index => `bounded_${index}`
    });
    assert.equal(await request({ port: receiver.port, body: Buffer.from('one') }), 200);
    assert.equal(await request({ port: receiver.port, body: Buffer.from('two') }), 200);
    assert.deepEqual(await receiver.result, { state: 'captured', captureCount: 2, rejectedCount: 0 });
    assert.deepEqual((await fs.readdir(root)).sort(), ['webhook-bounded_0.json', 'webhook-bounded_1.json']);
  });

  test('timeout exits with explicit state', async t => {
    const root = await tempRoot(t);
    const receiver = await startOneShotWebhookReceiver({ exactPath: receiverPath, timeoutMs: 20, maxBodyBytes: 10, rawRoot: root, captureIdFactory: () => 'timeout' });
    assert.deepEqual(await receiver.result, { state: 'timeout', captureCount: 0, rejectedCount: 0 });
  });

  test('capture collision gives 500 and capture-failure without overwrite', async t => {
    const root = await tempRoot(t);
    await captureRawWebhook({ captureId: 'collision', rawBody: Buffer.from('first'), rawRoot: root });
    const receiver = await startOneShotWebhookReceiver({ exactPath: receiverPath, timeoutMs: 1000, maxBodyBytes: 10, rawRoot: root, captureIdFactory: () => 'collision' });
    assert.equal(await request({ port: receiver.port, body: Buffer.from('second') }), 500);
    assert.equal((await receiver.result).state, 'capture-failure');
    const stored = JSON.parse(await fs.readFile(path.join(root, 'webhook-collision.json'), 'utf8'));
    assert.equal(Buffer.from(stored.rawBodyBase64, 'base64').toString(), 'first');
  });

  test('200 is emitted only after durable capture resolves', async t => {
    const root = await tempRoot(t);
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let captureStarted = false;
    const receiver = await startOneShotWebhookReceiver({
      exactPath: receiverPath, timeoutMs: 1000, maxBodyBytes: 10, rawRoot: root, captureIdFactory: () => 'durable',
      capture: async input => { captureStarted = true; await gate; return captureRawWebhook(input); }
    });
    let responseSettled = false;
    const response = request({ port: receiver.port, body: Buffer.from('ok') }).then(status => { responseSettled = true; return status; });
    while (!captureStarted) await new Promise(resolve => setTimeout(resolve, 1));
    assert.equal(responseSettled, false);
    release();
    assert.equal(await response, 200);
    assert.equal((await receiver.result).state, 'captured');
  });

  test('tests never use the real raw root', async () => {
    await assert.rejects(() => fs.access(defaultWebhookRawRoot), /ENOENT/);
  });
});

describe('M0.5-E E2 crypto primitives and frozen matrix', () => {
  test('strict hex supports letter case and rejects malformed lengths, characters, and whitespace', () => {
    const bytes = Buffer.alloc(32, 0xab);
    assert.deepEqual(decodeSha256Signature(bytes.toString('hex'), 'hex'), bytes);
    assert.deepEqual(decodeSha256Signature(bytes.toString('hex').toUpperCase(), 'hex'), bytes);
    for (const value of ['a'.repeat(63), 'a'.repeat(65), 'g'.repeat(64), ` ${'a'.repeat(64)}`, `${'a'.repeat(64)} `]) {
      assert.throws(() => decodeSha256Signature(value, 'hex'), /malformed hex/);
    }
  });

  test('strict base64 accepts exactly 32 bytes and rejects malformed/wrong-length values', () => {
    const valid = Buffer.alloc(32, 0xcd).toString('base64');
    assert.deepEqual(decodeSha256Signature(valid, 'base64'), Buffer.alloc(32, 0xcd));
    for (const value of ['not base64', Buffer.alloc(31).toString('base64'), Buffer.alloc(33).toString('base64'), `${valid}\n`]) {
      assert.throws(() => decodeSha256Signature(value, 'base64'), /malformed base64/);
    }
  });

  test('timing-safe comparison validates lengths before comparison', () => {
    const digest = Buffer.alloc(32, 1);
    assert.equal(timingSafeSignatureMatch(digest, digest.toString('hex'), 'hex'), true);
    assert.equal(timingSafeSignatureMatch(digest, Buffer.alloc(32, 2).toString('hex'), 'hex'), false);
    assert.throws(() => timingSafeSignatureMatch(Buffer.alloc(31), digest.toString('hex'), 'hex'), /invalid digest length/);
    assert.throws(() => timingSafeSignatureMatch(digest, 'aa', 'hex'), /malformed hex/);
  });

  test('HMAC consumes exact bytes and mutations, whitespace, wrong secret, and wrong payload fail', () => {
    const expected = hmacSha256(syntheticWebhookConfiguredSecret, formattedRaw);
    assert.equal(timingSafeSignatureMatch(expected, expected.toString('hex'), 'hex'), true);
    const oneByteMutation = Buffer.from(formattedRaw); oneByteMutation[1] ^= 1;
    assert.equal(timingSafeSignatureMatch(hmacSha256(syntheticWebhookConfiguredSecret, oneByteMutation), expected.toString('hex'), 'hex'), false);
    assert.equal(timingSafeSignatureMatch(hmacSha256(syntheticWebhookConfiguredSecret, Buffer.from(JSON.stringify(JSON.parse(formattedRaw)))), expected.toString('hex'), 'hex'), false);
    assert.equal(timingSafeSignatureMatch(hmacSha256('wrong-secret', formattedRaw), expected.toString('hex'), 'hex'), false);
    assert.equal(timingSafeSignatureMatch(hmacSha256(syntheticWebhookConfiguredSecret, Buffer.from('wrong')), expected.toString('hex'), 'hex'), false);
  });

  test('matrix is frozen at exactly X1, X2, C1, C2 with no duplicate IDs', () => {
    assert.deepEqual(WEBHOOK_CANDIDATE_MATRIX.map(item => item.id), ['X1', 'X2', 'C1', 'C2']);
    assert.equal(new Set(WEBHOOK_CANDIDATE_MATRIX.map(item => item.id)).size, 4);
    assert.deepEqual(WEBHOOK_CANDIDATE_MATRIX.slice(0, 2).map(item => item.messageSource), ['exactRawBody', 'exactRawBody']);
    assert.deepEqual(WEBHOOK_CANDIDATE_MATRIX.slice(2).map(item => item.messageSource), ['webhookConfiguredSecretUtf8', 'apiSecretKeyUtf8']);
    assert.equal(Object.isFrozen(WEBHOOK_CANDIDATE_MATRIX), true);
    assert.throws(() => WEBHOOK_CANDIDATE_MATRIX.push({ id: 'X3' }), /not extensible/);
  });

  test('synthetic evaluator proves X/C independence and returns safe facts only', () => {
    const xSignature = createHmac('sha256', syntheticWebhookConfiguredSecret).update(formattedRaw).digest('hex');
    const cSignature = createHmac('sha256', syntheticApiSecretKey).update(Buffer.from(syntheticApiSecretKey, 'utf8')).digest('hex');
    const results = evaluateWebhookCandidates({
      rawBody: formattedRaw,
      selectedHeaders: { 'x-chapa-signature': xSignature, 'chapa-signature': cSignature },
      secrets: { webhookConfiguredSecret: syntheticWebhookConfiguredSecret, apiSecretKey: syntheticApiSecretKey }
    });
    assert.deepEqual(results.map(item => item.match), [true, false, false, true]);
    const serialized = JSON.stringify(results);
    for (const forbidden of [syntheticWebhookConfiguredSecret, syntheticApiSecretKey, xSignature, cSignature, formattedRaw.toString()]) {
      assert.equal(serialized.includes(forbidden), false);
    }
  });

  test('missing header, malformed syntax, and missing secret are not evaluated', () => {
    const malformed = evaluateWebhookCandidates({ rawBody: formattedRaw, selectedHeaders: { 'x-chapa-signature': 'bad' }, secrets: {} });
    assert.deepEqual(malformed.map(item => item.match), ['not-evaluated', 'not-evaluated', 'not-evaluated', 'not-evaluated']);
    assert.equal(malformed[0].syntaxClassification, 'malformed');
    assert.equal(malformed[2].syntaxClassification, 'missing');
  });

  test('safe errors leak no synthetic secret, signature, digest, or raw body', () => {
    const sentinel = 'SYNTHETIC_SENTINEL_NEVER_LEAK';
    let error;
    try { hmacSha256(null, Buffer.from(sentinel)); } catch (caught) { error = caught; }
    assert.equal(error.message.includes(sentinel), false);
    try { decodeSha256Signature(sentinel, 'hex'); } catch (caught) { error = caught; }
    assert.equal(error.message.includes(sentinel), false);
  });
});

describe('M0.5-E E2 raw-versus-reserialized diagnostic', () => {
  test('reports safe facts and leaves exact raw bytes immutable', () => {
    const before = Buffer.from(formattedRaw);
    const signature = hmacSha256(syntheticWebhookConfiguredSecret, formattedRaw).toString('hex');
    const result = diagnoseRawVsReserialized(formattedRaw, { key: syntheticWebhookConfiguredSecret, signatureValue: signature, encoding: 'hex' });
    assert.deepEqual(formattedRaw, before);
    assert.equal(result.parseSucceeded, true);
    assert.equal(result.bytesIdentical, false);
    assert.equal(result.originalLength, formattedRaw.length);
    assert.ok(result.reserializedLength < result.originalLength);
    assert.equal(result.reserializedMatch, false);
    assert.equal(JSON.stringify(result).includes(formattedRaw.toString()), false);
  });

  test('invalid JSON reports parse failure without returning body contents', () => {
    const raw = Buffer.from('{ invalid synthetic json');
    const result = diagnoseRawVsReserialized(raw);
    assert.deepEqual(result, { parseSucceeded: false, bytesIdentical: false, originalLength: raw.length, reserializedLength: null });
    assert.equal(JSON.stringify(result).includes(raw.toString()), false);
  });
});
