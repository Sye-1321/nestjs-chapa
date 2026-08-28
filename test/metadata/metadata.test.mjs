import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const { ChapaClient } = await import('../../dist/esm/core/client/chapa-client.js');
const errors = await import('../../dist/esm/core/errors/errors.js');
const root = resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const banksFixture = JSON.parse(
  await readFile(resolve(root, 'test/fixtures/chapa/banks.test-mode.success.json'), 'utf8')
);
const currenciesFixture = JSON.parse(
  await readFile(resolve(root, 'test/fixtures/chapa/currencies.test-mode.success.json'), 'utf8')
);

function reply(status, value) {
  return {
    status,
    headers: { 'content-type': 'application/json' },
    body: new TextEncoder().encode(JSON.stringify(value)),
    durationMs: 1
  };
}

function harness(responses) {
  const requests = [];
  let index = 0;
  const transport = {
    send: async (request) => {
      requests.push(request);
      const value = responses[Math.min(index++, responses.length - 1)];
      return value;
    }
  };
  return {
    client: new ChapaClient({
      secretKey: 'synthetic-secret',
      transport,
      retry: { maxSafeRetries: 1, baseDelayMs: 0, maxDelayMs: 0, jitter: false }
    }),
    requests
  };
}

test('banks use exact GET path and normalize the committed fixture', async () => {
  const { client, requests } = harness([reply(200, banksFixture.data)]);
  const result = await client.metadata.listBanks({ maxRetries: 0 });
  assert.equal(requests[0].method, 'GET');
  assert.equal(requests[0].url, 'https://api.chapa.co/v1/banks');
  assert.equal(result.banks.length, banksFixture.data.data.length);
  assert.deepEqual(result.raw, banksFixture.data);
});

test('banks map only evidence-backed fields and preserve numeric id', async () => {
  const result = await harness([reply(200, banksFixture.data)]).client.metadata.listBanks();
  assert.deepEqual(result.banks[0], {
    id: 656,
    name: 'Awash Bank',
    slug: 'awash_bank',
    swift: 'AWINETAA',
    accountLength: 15,
    currency: 'ETB',
    raw: banksFixture.data.data[0]
  });
  assert.equal(typeof result.banks[0].id, 'number');
});

test('bank unknown and integer/null flag fields remain raw without public boolean projections', async () => {
  const result = await harness([reply(200, banksFixture.data)]).client.metadata.listBanks();
  const bank = result.banks[0];
  assert.equal(bank.raw.is_mobilemoney, 0);
  assert.equal(bank.raw.is_payout, null);
  for (const key of [
    'isMobileMoney',
    'isActive',
    'isRtgs',
    'active',
    'is24hrs',
    'canProcessPayouts',
    'canProcessPayments'
  ])
    assert.equal(bank[key], undefined);
  assert.deepEqual(Object.keys(bank).sort(), ['accountLength', 'currency', 'id', 'name', 'raw', 'slug', 'swift']);
});

test('bank optional fields require usable wire types', async () => {
  const body = {
    data: [{ name: 'Minimal', id: null, slug: 1, swift: '', acct_length: '10', currency: null, unknown: 'retained' }]
  };
  const result = await harness([reply(200, body)]).client.metadata.listBanks();
  assert.deepEqual(result.banks[0], { name: 'Minimal', raw: body.data[0] });
  assert.equal(result.banks[0].raw.unknown, 'retained');
});

test('missing or unusable bank name throws ChapaResponseError', async () => {
  for (const body of [{}, { data: [{ id: 1 }] }, { data: [{ name: '' }] }, { data: [null] }]) {
    await assert.rejects(harness([reply(200, body)]).client.metadata.listBanks(), errors.ChapaResponseError);
  }
});

test('banks safe-read retries eligible failure once', async () => {
  const { client, requests } = harness([reply(503, {}), reply(200, banksFixture.data)]);
  const result = await client.metadata.listBanks();
  assert.equal(requests.length, 2);
  assert.equal(result.response.attempts, 2);
});

test('currencies use exact GET path and normalize committed parallel arrays by index', async () => {
  const { client, requests } = harness([reply(200, currenciesFixture.data)]);
  const result = await client.metadata.listCurrencies({ maxRetries: 0 });
  assert.equal(requests[0].method, 'GET');
  assert.equal(requests[0].url, 'https://api.chapa.co/v1/currency_supported');
  assert.deepEqual(result.currencies, [
    { providerCode: 1, name: 'ETB', raw: { currency_code: 1, currency_name: 'ETB' } },
    { providerCode: 2, name: 'USD', raw: { currency_code: 2, currency_name: 'USD' } }
  ]);
  assert.deepEqual(result.raw, currenciesFixture.data);
});

test('currency membership is not hard-coded and numeric provider code remains numeric', async () => {
  const result = await harness([
    reply(200, { currency_code: [987], currency_name: ['FUTURE'] })
  ]).client.metadata.listCurrencies();
  assert.deepEqual(result.currencies[0], {
    providerCode: 987,
    name: 'FUTURE',
    raw: { currency_code: 987, currency_name: 'FUTURE' }
  });
  assert.equal(typeof result.currencies[0].providerCode, 'number');
});

test('currency arrays must exist and have equal lengths', async () => {
  for (const body of [{}, { currency_code: [], currency_name: null }, { currency_code: [1], currency_name: [] }]) {
    await assert.rejects(harness([reply(200, body)]).client.metadata.listCurrencies(), errors.ChapaResponseError);
  }
});

test('currency codes must be finite numbers and names usable strings', async () => {
  for (const body of [
    { currency_code: ['1'], currency_name: ['ETB'] },
    { currency_code: [Number.NaN], currency_name: ['ETB'] },
    { currency_code: [1], currency_name: [2] },
    { currency_code: [1], currency_name: [''] }
  ])
    await assert.rejects(harness([reply(200, body)]).client.metadata.listCurrencies(), errors.ChapaResponseError);
});

test('currencies safe-read retries eligible failure once', async () => {
  const { client, requests } = harness([reply(503, {}), reply(200, currenciesFixture.data)]);
  const result = await client.metadata.listCurrencies();
  assert.equal(requests.length, 2);
  assert.equal(result.response.attempts, 2);
});

test('metadata performs no hidden caching', async () => {
  const { client, requests } = harness([reply(200, banksFixture.data), reply(200, banksFixture.data)]);
  await client.metadata.listBanks();
  await client.metadata.listBanks();
  assert.equal(requests.length, 2);
});

test('metadata 404 remains generic ChapaApiError', async () => {
  await assert.rejects(
    harness([reply(404, { message: 'missing' })]).client.metadata.listBanks(),
    (error) => error.constructor === errors.ChapaApiError
  );
});

test('metadata implementation stays internal while public contracts are exported', async () => {
  const publicRoot = await import('@sye1321/nestjs-chapa');
  assert.equal(publicRoot.MetadataResource, undefined);
  const report = await readFile(resolve(root, 'etc/api-reports/nestjs-chapa.public.api.md'), 'utf8');
  for (const contract of ['ChapaMetadata', 'ChapaBank', 'ListBanksResult', 'ChapaCurrency', 'ListCurrenciesResult'])
    assert.match(report, new RegExp(contract));
  assert.doesNotMatch(report, /class MetadataResource/);
});
