import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const repository = resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const configModule = await import('../../dist/esm/core/config/configuration.js');
const errors = await import('../../dist/esm/core/errors/errors.js');
const { FetchTransport } = await import('../../dist/esm/core/transport/fetch-transport.js');
const { ChapaRequestExecutor } = await import('../../dist/esm/core/executor/request-executor.js');
const { ChapaClient } = await import('../../dist/esm/core/client/chapa-client.js');

const safePolicy = Object.freeze({ operation: 'metadata.listBanks', method: 'GET', path: '/banks', retry: 'safe-read' });
const mutationPolicy = Object.freeze({ operation: 'payments.initialize', method: 'POST', path: '/transaction/initialize', retry: 'never' });
const cancelPolicy = Object.freeze({ operation: 'payments.cancel', method: 'PUT', path: '/transaction/cancel/synthetic_ref', retry: 'never' });

function response(status = 200, body = { status: 'success' }, headers = { 'content-type': 'application/json' }, durationMs = 4) {
  return { status, headers, body: new TextEncoder().encode(JSON.stringify(body)), durationMs };
}

function executorWith(transport, options = {}, dependencies = {}) {
  const configuration = configModule.resolveChapaConfiguration({
    secretKey: 'synthetic-secret-value',
    retry: { baseDelayMs: 0, maxDelayMs: 0, jitter: false, ...options.retry },
    ...options
  });
  return { configuration, executor: new ChapaRequestExecutor(configuration, transport, dependencies) };
}

test('valid configuration resolves exact defaults', () => {
  const configuration = configModule.resolveChapaConfiguration({ secretKey: 'synthetic-secret-value' });
  assert.equal(configuration.baseUrl, 'https://api.chapa.co/v1');
  assert.equal(configuration.timeoutMs, 30_000);
  assert.deepEqual(configuration.retry, { maxSafeRetries: 1, baseDelayMs: 500, maxDelayMs: 5_000, jitter: true });
});

test('missing and blank secrets fail with configuration error', () => {
  assert.throws(() => configModule.resolveChapaConfiguration({}), errors.ChapaConfigurationError);
  assert.throws(() => configModule.resolveChapaConfiguration({ secretKey: '   ' }), errors.ChapaConfigurationError);
});

test('configuration validates secure URLs, ranges, and transport shape', () => {
  assert.throws(() => configModule.resolveChapaConfiguration({ secretKey: 'x', baseUrl: 'http://example.com' }), errors.ChapaConfigurationError);
  assert.doesNotThrow(() => configModule.resolveChapaConfiguration({ secretKey: 'x', baseUrl: 'http://127.0.0.1:3000', allowInsecureTestUrls: true }));
  assert.doesNotThrow(() => configModule.resolveChapaConfiguration({ secretKey: 'x', baseUrl: 'http://[::1]:3000', allowInsecureTestUrls: true }));
  assert.throws(() => configModule.resolveChapaConfiguration({ secretKey: 'x', timeoutMs: Infinity }), errors.ChapaConfigurationError);
  assert.throws(() => configModule.resolveChapaConfiguration({ secretKey: 'x', transport: {} }), errors.ChapaConfigurationError);
});

test('configuration inspection and errors redact secrets', () => {
  const secret = 'synthetic-secret-value';
  const configuration = configModule.resolveChapaConfiguration({ secretKey: secret, webhookSecret: 'synthetic-webhook-secret' });
  assert.ok(!inspect(configuration).includes(secret));
  const error = new errors.ChapaApiError({
    code: 'api_error', message: 'safe message', retryable: false, raw: { authorization: `Bearer ${secret}`, body: secret, nested: { secretKey: secret } }
  });
  assert.ok(!JSON.stringify(error).includes(secret));
});

test('FetchTransport makes exactly one attempt and preserves raw bytes, headers, status, and duration', async () => {
  let calls = 0;
  const bytes = new Uint8Array([0, 255, 10, 13]);
  const transport = new FetchTransport(async (_url, init) => {
    calls += 1;
    assert.equal(init.redirect, 'manual');
    return new Response(bytes, { status: 202, headers: { 'x-safe': 'value' } });
  });
  const result = await transport.send({ method: 'GET', url: 'https://example.test', headers: {}, signal: new AbortController().signal });
  assert.equal(calls, 1);
  assert.equal(result.status, 202);
  assert.deepEqual(result.body, bytes);
  assert.equal(result.headers['x-safe'], 'value');
  assert.ok(result.durationMs >= 0);
});

test('executor constructs exact authentication and safe headers without correlation header', async () => {
  let captured;
  const { executor } = executorWith({ send: async (request) => { captured = request; return response(); } });
  await executor.execute({ policy: mutationPolicy, body: '{}', options: { correlationId: 'sdk-correlation' } });
  assert.equal(captured.method, 'POST');
  assert.equal(captured.url, 'https://api.chapa.co/v1/transaction/initialize');
  assert.equal(captured.headers.authorization, 'Bearer synthetic-secret-value');
  assert.equal(captured.headers.accept, 'application/json');
  assert.equal(captured.headers['content-type'], 'application/json');
  assert.equal(Object.keys(captured.headers).some((key) => key.includes('correlation')), false);
});

test('successful response preserves attempts, duration, and caller correlationId', async () => {
  const { executor } = executorWith({ send: async () => response(200, { value: 1 }, undefined, 7) });
  const result = await executor.execute({ policy: safePolicy, options: { correlationId: 'corr-1', maxRetries: 0 } });
  assert.deepEqual(result.data, { value: 1 });
  assert.equal(result.metadata.attempts, 1);
  assert.equal(result.metadata.durationMs, 7);
  assert.equal(result.metadata.correlationId, 'corr-1');
  assert.deepEqual(result.responseBytes, new TextEncoder().encode(JSON.stringify({ value: 1 })));
});

test('malformed JSON response carries safe request context and redacted raw material', async () => {
  const body = new TextEncoder().encode('{"token":"synthetic-secret-value"');
  const { executor } = executorWith({ send: async () => ({ status: 200, headers: { 'content-type': 'application/json' }, body, durationMs: 1 }) });
  await assert.rejects(executor.execute({ policy: safePolicy, options: { maxRetries: 0, correlationId: 'corr-json' } }), (error) => {
    assert.ok(error instanceof errors.ChapaResponseError);
    assert.equal(error.operation, 'metadata.listBanks');
    assert.equal(error.method, 'GET');
    assert.equal(error.endpoint, '/banks');
    assert.equal(error.httpStatus, 200);
    assert.equal(error.attempts, 1);
    assert.equal(error.correlationId, 'corr-json');
    assert.equal(error.raw, '[REDACTED]');
    return true;
  });
});

test('POST initialize and PUT cancel transport failures each make one attempt and never retry', async () => {
  let calls = 0;
  const { executor } = executorWith({ send: async () => { calls += 1; throw new Error('socket'); } });
  for (const policy of [mutationPolicy, cancelPolicy]) {
    await assert.rejects(executor.execute({ policy, body: policy.method === 'POST' ? '{}' : undefined }), (error) => {
      assert.ok(error instanceof errors.ChapaNetworkError);
      assert.equal(error.attempts, 1);
      assert.equal(error.retryable, false);
      return true;
    });
  }
  assert.equal(calls, 2);
});

test('mutation HTTP failure makes one attempt and rejects runtime retry controls', async () => {
  let calls = 0;
  const { executor } = executorWith({ send: async () => { calls += 1; return response(500); } });
  await assert.rejects(executor.execute({ policy: mutationPolicy, body: '{}' }), errors.ChapaApiError);
  await assert.rejects(executor.execute({ policy: mutationPolicy, body: '{}', options: { maxRetries: 1 } }), errors.ChapaValidationError);
  assert.equal(calls, 1);
});

test('safe read retries one eligible network failure and accounts attempts', async () => {
  let calls = 0;
  const { executor } = executorWith({ send: async () => { calls += 1; if (calls === 1) throw new Error('socket'); return response(); } });
  const result = await executor.execute({ policy: safePolicy });
  assert.equal(calls, 2);
  assert.equal(result.metadata.attempts, 2);
});

test('safe read retries eligible HTTP status and respects configured maximum', async () => {
  let calls = 0;
  const { executor } = executorWith({ send: async () => { calls += 1; return response(503); } }, { retry: { maxSafeRetries: 2 } });
  await assert.rejects(executor.execute({ policy: safePolicy, options: { maxRetries: 2 } }), (error) => {
    assert.ok(error instanceof errors.ChapaApiError);
    assert.equal(error.attempts, 3);
    assert.equal(error.retryable, true);
    return true;
  });
  assert.equal(calls, 3);
});

test('safe read does not retry ineligible HTTP status or unusable 429', async () => {
  for (const status of [400, 404, 409, 422, 429]) {
    let calls = 0;
    const { executor } = executorWith({ send: async () => { calls += 1; return response(status); } });
    await assert.rejects(executor.execute({ policy: safePolicy }));
    assert.equal(calls, 1);
  }
});

test('usable Retry-After enables bounded 429 retry', async () => {
  let calls = 0;
  const delays = [];
  const { executor } = executorWith(
    { send: async () => { calls += 1; return calls === 1 ? response(429, {}, { 'content-type': 'application/json', 'retry-after': '0' }) : response(); } },
    {},
    { sleep: async (delay) => { delays.push(delay); } }
  );
  const result = await executor.execute({ policy: safePolicy });
  assert.equal(result.metadata.attempts, 2);
  assert.deepEqual(delays, [0]);
});

test('SDK timeout maps distinctly and never duplicates mutation', async () => {
  let calls = 0;
  const { executor } = executorWith({ send: (request) => new Promise((_resolve, reject) => {
    calls += 1;
    request.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  }) });
  await assert.rejects(executor.execute({ policy: mutationPolicy, body: '{}', options: { timeoutMs: 10 } }), errors.ChapaTimeoutError);
  assert.equal(calls, 1);
});

test('caller abort maps distinctly and stops retry progression', async () => {
  const caller = new AbortController();
  let calls = 0;
  const { executor } = executorWith({ send: async () => { calls += 1; throw new Error('socket'); } }, {}, {
    sleep: async (_delay, signal) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      caller.abort();
    })
  });
  await assert.rejects(executor.execute({ policy: safePolicy, options: { signal: caller.signal } }), errors.ChapaAbortError);
  assert.equal(calls, 1);
});

test('HTTP status maps to typed API errors with safe metadata', async () => {
  const cases = [[401, errors.ChapaAuthenticationError], [403, errors.ChapaPermissionError], [429, errors.ChapaRateLimitError], [500, errors.ChapaApiError]];
  for (const [status, Type] of cases) {
    const { executor } = executorWith({ send: async () => response(status, { status: 'failed', message: 'safe' }) }, { retry: { maxSafeRetries: 0 } });
    await assert.rejects(executor.execute({ policy: safePolicy }), (error) => error instanceof Type && error.httpStatus === status && error.attempts === 1);
  }
});

test('transport errors retain only safe cause metadata', async () => {
  const secret = 'synthetic-secret-value';
  const { executor } = executorWith({ send: async () => { throw new Error(`leak ${secret}`); } }, { retry: { maxSafeRetries: 0 } });
  await assert.rejects(executor.execute({ policy: safePolicy }), (error) => {
    assert.ok(!JSON.stringify(error).includes(secret));
    assert.ok(!inspect(error).includes(`leak ${secret}`));
    return true;
  });
});

test('observability receives allowlisted metadata only and failures are best-effort', async () => {
  const contexts = [];
  const logger = { debug: (_message, context) => contexts.push(context), info() {}, warn() {}, error() {} };
  const hooks = { onRequest: () => { throw new Error('observer failure'); } };
  const { executor } = executorWith({ send: async () => response() }, { logging: { enabled: true, level: 'debug' }, logger, hooks });
  await executor.execute({ policy: safePolicy, options: { maxRetries: 0, correlationId: 'corr-safe' } });
  assert.equal(contexts.length, 2);
  assert.deepEqual(Object.keys(contexts[0]).sort(), ['attempts', 'correlationId', 'endpoint', 'method', 'operation']);
  assert.deepEqual(Object.keys(contexts[1]).sort(), ['attempts', 'correlationId', 'durationMs', 'endpoint', 'httpStatus', 'method', 'operation']);
});

test('configured logging level filters lower-level observations while hooks remain independent', async () => {
  for (const [level, expected] of [['debug', 2], ['info', 0], ['warn', 0], ['error', 0]]) {
    const calls = [];
    const hookCalls = [];
    const logger = Object.fromEntries(['debug', 'info', 'warn', 'error'].map((name) => [name, () => calls.push(name)]));
    const hooks = { onRequest: () => hookCalls.push('request'), onResponse: () => hookCalls.push('response') };
    const { executor } = executorWith({ send: async () => response() }, { logging: { enabled: true, level }, logger, hooks });
    await executor.execute({ policy: safePolicy, options: { maxRetries: 0 } });
    assert.equal(calls.length, expected);
    assert.deepEqual(hookCalls, ['request', 'response']);
  }
  const calls = [];
  const logger = Object.fromEntries(['debug', 'info', 'warn', 'error'].map((name) => [name, () => calls.push(name)]));
  const { executor } = executorWith({ send: async () => response() }, { logging: { enabled: false, level: 'debug' }, logger });
  await executor.execute({ policy: safePolicy, options: { maxRetries: 0 } });
  assert.equal(calls.length, 0);
});

test('internal ChapaClient composes resolved configuration, transport, and executor', () => {
  const transport = { send: async () => response() };
  const client = new ChapaClient({ secretKey: 'synthetic-secret-value', transport });
  assert.equal(client.configuration.baseUrl, 'https://api.chapa.co/v1');
  assert.ok(client.executor instanceof ChapaRequestExecutor);
});

test('core imports no NestJS modules', async () => {
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else assert.doesNotMatch(await readFile(path, 'utf8'), /from ['"]@nestjs\//);
    }
  }
  await visit(resolve(repository, 'src/core'));
});

test('internal client, executor, FetchTransport, retry machinery, and Zod stay outside public API', async () => {
  const root = await import('@sye1321/nestjs-chapa');
  for (const name of ['ChapaClient', 'ChapaRequestExecutor', 'FetchTransport']) assert.equal(root[name], undefined);
  const report = await readFile(resolve(repository, 'etc/api-reports/nestjs-chapa.api.md'), 'utf8');
  assert.doesNotMatch(report, /ChapaClient|ChapaRequestExecutor|FetchTransport|SafeReadOperationPolicy|MutationOperationPolicy|\bz\.|Zod/);
});
