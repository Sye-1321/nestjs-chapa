import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CHAPA_LOGGER,
  CHAPA_TRANSPORT,
  ChapaConfigurationError,
  ChapaModule,
  ChapaService
} from '../../dist/esm/index.js';

const synthetic = 'synthetic-api-secret';
const transport = {
  send: async () => {
    throw new Error('network must not run during bootstrap');
  }
};
const logger = { debug() {}, info() {}, warn() {}, error() {} };

async function compile(dynamicModule) {
  return Test.createTestingModule({ imports: [dynamicModule] }).compile();
}

function assertResources(service) {
  for (const name of ['payments', 'metadata', 'webhooks', 'references']) assert.ok(service[name]);
}

function currenciesResponse() {
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: new TextEncoder().encode(
      JSON.stringify({ currency_code: [987], currency_name: ['SYNTHETIC'], sensitive_marker: 'must-not-be-logged' })
    ),
    durationMs: 1
  };
}

test('register constructs and injects the real service without network', async () => {
  const module = await compile(ChapaModule.register({ secretKey: synthetic, transport, logger }));
  assertResources(module.get(ChapaService));
  assert.equal(module.get(CHAPA_TRANSPORT), transport);
  assert.equal(module.get(CHAPA_LOGGER), logger);
  await module.close();
});

test('registerAsync supports useFactory', async () => {
  const module = await compile(
    ChapaModule.registerAsync({ useFactory: () => ({ secretKey: synthetic, transport, logger }) })
  );
  assertResources(module.get(ChapaService));
  await module.close();
});

test('registerAsync supports useClass', async () => {
  class OptionsFactory {
    create() {
      return { secretKey: synthetic, transport, logger };
    }
  }
  const module = await compile(ChapaModule.registerAsync({ useClass: OptionsFactory }));
  assertResources(module.get(ChapaService));
  await module.close();
});

test('registerAsync supports useExisting', async () => {
  class ExistingFactory {
    create() {
      return { secretKey: synthetic, transport, logger };
    }
  }
  class OptionsModule {}
  Module({ providers: [ExistingFactory], exports: [ExistingFactory] })(OptionsModule);
  const module = await compile(ChapaModule.registerAsync({ imports: [OptionsModule], useExisting: ExistingFactory }));
  assertResources(module.get(ChapaService));
  await module.close();
});

test('missing or blank secretKey fails provider construction', async () => {
  for (const secretKey of [undefined, '   ']) {
    await assert.rejects(compile(ChapaModule.register({ secretKey, transport })), ChapaConfigurationError);
  }
});

test('overridden CHAPA_TRANSPORT is the transport used by ChapaService resources', async () => {
  const requests = [];
  const overriddenTransport = {
    send: async (request) => {
      requests.push(request);
      return currenciesResponse();
    }
  };
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('global fetch must not be used');
  };
  try {
    const module = await Test.createTestingModule({ imports: [ChapaModule.register({ secretKey: synthetic })] })
      .overrideProvider(CHAPA_TRANSPORT)
      .useValue(overriddenTransport)
      .compile();
    const result = await module.get(ChapaService).metadata.listCurrencies({ maxRetries: 0 });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://api.chapa.co/v1/currency_supported');
    assert.deepEqual(result.currencies, [
      { providerCode: 987, name: 'SYNTHETIC', raw: { currency_code: 987, currency_name: 'SYNTHETIC' } }
    ]);
    assert.equal(fetchCalls, 0);
    await module.close();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('overridden CHAPA_LOGGER is the logger actually used by ChapaClient', async () => {
  const observations = [];
  const overriddenLogger = {
    debug: (message, context) => observations.push({ message, context }),
    info() {},
    warn() {},
    error() {}
  };
  const overriddenTransport = { send: async () => currenciesResponse() };
  const module = await Test.createTestingModule({
    imports: [ChapaModule.register({ secretKey: synthetic, logging: { enabled: true, level: 'debug' } })]
  })
    .overrideProvider(CHAPA_TRANSPORT)
    .useValue(overriddenTransport)
    .overrideProvider(CHAPA_LOGGER)
    .useValue(overriddenLogger)
    .compile();
  await module.get(ChapaService).metadata.listCurrencies({ maxRetries: 0 });
  assert.deepEqual(
    observations.map(({ message }) => message),
    ['Chapa request', 'Chapa response']
  );
  const serialized = JSON.stringify(observations);
  assert.doesNotMatch(serialized, new RegExp(synthetic));
  assert.doesNotMatch(serialized, /must-not-be-logged|currency_code|currency_name|authorization/i);
  await module.close();
});

test('src/core has zero Nest imports', async () => {
  const core = resolve(new URL('../../src/core', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else assert.doesNotMatch(await readFile(path, 'utf8'), /from ['"]@nestjs\//);
    }
  }
  await visit(core);
});
