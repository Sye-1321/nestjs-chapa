import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CHAPA_LOGGER, CHAPA_TRANSPORT, ChapaConfigurationError, ChapaModule, ChapaService } from '../../dist/esm/index.js';

const synthetic = 'synthetic-api-secret';
const transport = { send: async () => { throw new Error('network must not run during bootstrap'); } };
const logger = { debug() {}, info() {}, warn() {}, error() {} };

async function compile(dynamicModule) {
  return Test.createTestingModule({ imports: [dynamicModule] }).compile();
}

function assertResources(service) {
  for (const name of ['payments', 'metadata', 'webhooks', 'references']) assert.ok(service[name]);
}

test('register constructs and injects the real service without network', async () => {
  const module = await compile(ChapaModule.register({ secretKey: synthetic, transport, logger }));
  assertResources(module.get(ChapaService));
  assert.equal(module.get(CHAPA_TRANSPORT), transport);
  assert.equal(module.get(CHAPA_LOGGER), logger);
  await module.close();
});

test('registerAsync supports useFactory', async () => {
  const module = await compile(ChapaModule.registerAsync({ useFactory: () => ({ secretKey: synthetic, transport, logger }) }));
  assertResources(module.get(ChapaService));
  await module.close();
});

test('registerAsync supports useClass', async () => {
  class OptionsFactory { create() { return { secretKey: synthetic, transport, logger }; } }
  const module = await compile(ChapaModule.registerAsync({ useClass: OptionsFactory }));
  assertResources(module.get(ChapaService));
  await module.close();
});

test('registerAsync supports useExisting', async () => {
  class ExistingFactory { create() { return { secretKey: synthetic, transport, logger }; } }
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
