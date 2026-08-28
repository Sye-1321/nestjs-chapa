import assert from 'node:assert/strict';
import test from 'node:test';

const { ChapaClient } = await import('../../dist/esm/core/client/chapa-client.js');
const errors = await import('../../dist/esm/core/errors/errors.js');

function reply(status, value, durationMs = 1) {
  return {
    status,
    headers: { 'content-type': 'application/json' },
    body: new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)),
    durationMs
  };
}

function harness(responses, options = {}) {
  const requests = [];
  let index = 0;
  const transport = {
    send: async (request) => {
      requests.push(request);
      const next = responses[Math.min(index++, responses.length - 1)];
      if (next instanceof Error) throw next;
      if (typeof next === 'function') return next(request);
      return next;
    }
  };
  const client = new ChapaClient({
    secretKey: 'synthetic-secret',
    transport,
    retry: { maxSafeRetries: 1, baseDelayMs: 0, maxDelayMs: 0, jitter: false },
    ...options
  });
  return { client, requests };
}

const minimal = { amount: '10', currency: 'ETB', txRef: 'payment_ref' };
const initSuccess = reply(200, {
  status: 'success',
  message: 'ready',
  data: { checkout_url: 'https://checkout.example.test/pay' }
});

test('initialize sends exact minimal JSON mapping and preserves caller money string', async () => {
  const { client, requests } = harness([initSuccess]);
  const result = await client.payments.initialize(minimal);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].url, 'https://api.chapa.co/v1/transaction/initialize');
  assert.deepEqual(JSON.parse(requests[0].body), { amount: '10', currency: 'ETB', tx_ref: 'payment_ref' });
  assert.equal(result.txRef, 'payment_ref');
  assert.equal(result.checkoutUrl, 'https://checkout.example.test/pay');
});

test('initialize maps only approved optional identity, URL, customization, and meta fields', async () => {
  const { client, requests } = harness([initSuccess]);
  await client.payments.initialize({
    ...minimal,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.test',
    phoneNumber: '0912345678',
    callbackUrl: 'https://merchant.example.test/callback',
    returnUrl: 'https://merchant.example.test/return',
    customization: { title: 'Order', description: 'Test', logo: 'https://merchant.example.test/logo.png' },
    meta: { order: 'A', nested: { ok: true } }
  });
  assert.deepEqual(JSON.parse(requests[0].body), {
    amount: '10',
    currency: 'ETB',
    tx_ref: 'payment_ref',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.test',
    phone_number: '0912345678',
    callback_url: 'https://merchant.example.test/callback',
    return_url: 'https://merchant.example.test/return',
    customization: { title: 'Order', description: 'Test', logo: 'https://merchant.example.test/logo.png' },
    meta: { order: 'A', nested: { ok: true } }
  });
});

test('initialize rejects invalid amount forms before transport without Number conversion', async () => {
  for (const amount of ['0', '0.0', '0.00', '-1', '+1', '1e2', ' 1', '1,000', '01', '1.234', '', 10]) {
    const { client, requests } = harness([initSuccess]);
    await assert.rejects(client.payments.initialize({ ...minimal, amount }), errors.ChapaValidationError);
    assert.equal(requests.length, 0);
  }
  const huge = '9'.repeat(200) + '.99';
  const { client, requests } = harness([initSuccess]);
  await client.payments.initialize({ ...minimal, amount: huge });
  assert.equal(JSON.parse(requests[0].body).amount, huge);
});

test('initialize accepts txRef lengths 1 and 50 and rejects 51', async () => {
  for (const txRef of ['a', 'A'.repeat(50)])
    await harness([initSuccess]).client.payments.initialize({ ...minimal, txRef });
  const { client, requests } = harness([initSuccess]);
  await assert.rejects(client.payments.initialize({ ...minimal, txRef: 'A'.repeat(51) }), errors.ChapaValidationError);
  assert.equal(requests.length, 0);
});

test('initialize rejects invalid email, phone, unknown subaccounts, and callback policy', async () => {
  for (const input of [
    { ...minimal, email: 'invalid' },
    { ...minimal, phoneNumber: '123' },
    { ...minimal, subaccounts: [] },
    { ...minimal, callbackUrl: 'http://merchant.example.test/callback' }
  ]) {
    const { client, requests } = harness([initSuccess]);
    await assert.rejects(client.payments.initialize(input), errors.ChapaValidationError);
    assert.equal(requests.length, 0);
  }
  await harness([initSuccess], { allowInsecureTestUrls: true }).client.payments.initialize({
    ...minimal,
    callbackUrl: 'http://127.0.0.1/callback'
  });
});

test('initialize requires usable status and checkout URL', async () => {
  for (const value of [
    { data: { checkout_url: 'https://example.test' } },
    { status: 'success', data: {} },
    { status: 'success', data: { checkout_url: 'not a url' } },
    { status: 'success', data: { checkoutUrl: 'https://invented.example.test' } }
  ])
    await assert.rejects(harness([reply(200, value)]).client.payments.initialize(minimal), errors.ChapaResponseError);
});

test('initialize rejects cyclic and non-JSON-safe meta before transport', async () => {
  const cyclic = {};
  cyclic.self = cyclic;
  for (const meta of [
    { cyclic },
    { bad: undefined },
    { bad: 1n },
    { bad() {} },
    { bad: Symbol('x') },
    { bad: Number.NaN },
    { bad: Infinity }
  ]) {
    const { client, requests } = harness([initSuccess]);
    await assert.rejects(client.payments.initialize({ ...minimal, meta }), errors.ChapaValidationError);
    assert.equal(requests.length, 0);
  }
});

test('initialize supports explicitly enabled IPv6 loopback callback and base URLs', async () => {
  const { client, requests } = harness([initSuccess], { baseUrl: 'http://[::1]/v1', allowInsecureTestUrls: true });
  await client.payments.initialize({ ...minimal, callbackUrl: 'http://[::1]/callback' });
  assert.equal(requests[0].url, 'http://[::1]/v1/transaction/initialize');
});

test('checkout URL is exposed on success but redacted from response errors and serialization', async () => {
  const checkoutUrl = 'https://checkout.example.test/pay?token=sensitive-token';
  const success = await harness([
    reply(200, { status: 'success', data: { checkout_url: checkoutUrl } })
  ]).client.payments.initialize(minimal);
  assert.equal(success.checkoutUrl, checkoutUrl);
  await assert.rejects(
    harness([reply(200, { status: 'success', checkout_url: checkoutUrl })]).client.payments.verify('payment_ref'),
    (error) => {
      assert.ok(error instanceof errors.ChapaResponseError);
      assert.ok(!JSON.stringify(error).includes(checkoutUrl));
      assert.ok(!JSON.stringify(error.toJSON()).includes('sensitive-token'));
      return true;
    }
  );
});

test('initialize timeout and network uncertainty make exactly one POST', async () => {
  const timeoutHarness = harness([
    (request) =>
      new Promise((_resolve, reject) =>
        request.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), {
          once: true
        })
      )
  ]);
  await assert.rejects(timeoutHarness.client.payments.initialize(minimal, { timeoutMs: 10 }), errors.ChapaTimeoutError);
  assert.equal(timeoutHarness.requests.length, 1);
  const network = harness([new Error('socket')]);
  await assert.rejects(network.client.payments.initialize(minimal), errors.ChapaNetworkError);
  assert.equal(network.requests.length, 1);
});

test('initialize rejects mutation maxRetries supplied through untyped JavaScript', async () => {
  const { client, requests } = harness([initSuccess]);
  await assert.rejects(client.payments.initialize(minimal, { maxRetries: 1 }), errors.ChapaValidationError);
  assert.equal(requests.length, 0);
});

test('verify uses exact GET path and transaction data.status only', async () => {
  const { client, requests } = harness([reply(200, { status: 'success', data: { status: 'pending' } })]);
  const result = await client.payments.verify('payment_ref', { maxRetries: 0 });
  assert.equal(requests[0].method, 'GET');
  assert.equal(requests[0].url, 'https://api.chapa.co/v1/transaction/verify/payment_ref');
  assert.equal(result.status, 'pending');
});

test('verify normalizes known and unknown provider transaction statuses', async () => {
  for (const [provider, expected] of [
    ['success', 'success'],
    ['pending', 'pending'],
    ['future_state', 'unknown']
  ]) {
    const result = await harness([
      reply(200, { status: 'success', data: { status: provider } })
    ]).client.payments.verify('payment_ref');
    assert.equal(result.status, expected);
    assert.equal(result.raw.data.status, provider);
  }
});

test('verify 404 remains ChapaApiError and missing data.status is ChapaResponseError', async () => {
  await assert.rejects(
    harness([reply(404, { status: 'failed', message: 'unknown' })]).client.payments.verify('payment_ref'),
    (error) => error instanceof errors.ChapaApiError && !(error instanceof errors.ChapaResponseError)
  );
  await assert.rejects(
    harness([reply(200, { status: 'success', data: {} })]).client.payments.verify('payment_ref'),
    errors.ChapaResponseError
  );
});

test('verify retries eligible safe GET once and bounds requested retries by global config', async () => {
  const { client, requests } = harness([reply(503, {}), reply(200, { data: { status: 'success' } })]);
  const result = await client.payments.verify('payment_ref', { maxRetries: 2 });
  assert.equal(result.status, 'success');
  assert.equal(result.response.attempts, 2);
  assert.equal(requests.length, 2);
});

test('verify omits numeric money, preserves valid lexical strings, and echoes caller txRef', async () => {
  const numeric = await harness([
    reply(200, { data: { status: 'success', amount: 10.1, charge: 0.3, tx_ref: 'provider_alias' } })
  ]).client.payments.verify('caller_ref');
  assert.equal(numeric.amount, undefined);
  assert.equal(numeric.charge, undefined);
  assert.equal(numeric.txRef, 'caller_ref');
  const lexical = await harness([
    reply(200, { data: { status: 'success', amount: '10.10', charge: '0.30' } })
  ]).client.payments.verify('caller_ref');
  assert.equal(lexical.amount, '10.10');
  assert.equal(lexical.charge, '0.30');
});

test('cancel sends exact bodyless PUT with no content type and returns no invented state', async () => {
  const { client, requests } = harness([reply(200, { status: 'success', message: 'link expired' })]);
  const result = await client.payments.cancel('payment_ref');
  assert.equal(requests[0].method, 'PUT');
  assert.equal(requests[0].url, 'https://api.chapa.co/v1/transaction/cancel/payment_ref');
  assert.equal(requests[0].body, undefined);
  assert.equal(requests[0].headers['content-type'], undefined);
  assert.equal(result.message, 'link expired');
  assert.equal(result.status, undefined);
});

test('cancel never retries and unknown or repeat failures remain generic ChapaApiError', async () => {
  for (const status of [400, 404, 503]) {
    const { client, requests } = harness([reply(status, { status: 'failed', message: 'provider message' })]);
    await assert.rejects(
      client.payments.cancel('payment_ref'),
      (error) => error instanceof errors.ChapaApiError && error.constructor === errors.ChapaApiError
    );
    assert.equal(requests.length, 1);
  }
});
