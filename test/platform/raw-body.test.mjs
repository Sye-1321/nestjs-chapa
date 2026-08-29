import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import test from 'node:test';
import { Controller, Inject, Module, Post, Req } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ChapaModule, ChapaService } from '../../dist/esm/index.js';
import { generateChapaTestSignature } from '../../dist/esm/testing/index.js';

const webhookSecret = 'fictional-platform-webhook-secret';
const rawBody = Buffer.from(
  '{"event":"charge.success","status":"success","tx_ref":"fictional-platform-reference"}',
  'utf8'
);
const signature = generateChapaTestSignature({ rawBody, secret: webhookSecret });

function platformModule(state) {
  class WebhookController {
    constructor(chapa) {
      this.chapa = chapa;
    }

    receive(request) {
      assert.ok(Buffer.isBuffer(request.rawBody));
      assert.deepEqual(request.rawBody, rawBody);
      const verified = this.chapa.webhooks.verify({ rawBody: request.rawBody, headers: request.headers });
      assert.deepEqual(verified.rawBody, rawBody);
      assert.equal(verified.event.event, 'charge.success');
      assert.equal(verified.event.txRef, 'fictional-platform-reference');
      state.verified = true;
      return { accepted: true };
    }
  }
  Inject(ChapaService)(WebhookController, undefined, 0);
  Controller()(WebhookController);
  Post('webhook')(
    WebhookController.prototype,
    'receive',
    Object.getOwnPropertyDescriptor(WebhookController.prototype, 'receive')
  );
  Req()(WebhookController.prototype, 'receive', 0);

  class PlatformModule {}
  Module({
    imports: [
      ChapaModule.register({
        secretKey: 'CHASECK_TEST-FICTIONAL',
        webhookSecret,
        transport: {
          send: async () => {
            state.transportCalls += 1;
            throw new Error('provider transport must not run');
          }
        }
      })
    ],
    controllers: [WebhookController]
  })(PlatformModule);
  return PlatformModule;
}

function post(address) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path: '/webhook',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': rawBody.length,
          'x-chapa-signature': signature
        }
      },
      (response) => {
        response.resume();
        response.once('end', () => resolve(response.statusCode));
      }
    );
    request.once('error', reject);
    request.end(rawBody);
  });
}

test('Express raw-body boot + verification', async () => {
  const state = { transportCalls: 0, verified: false };
  const app = await NestFactory.create(platformModule(state), { rawBody: true, logger: false });
  try {
    await app.listen(0, '127.0.0.1');
    assert.equal(await post(app.getHttpServer().address()), 201);
    assert.equal(state.verified, true);
    assert.equal(state.transportCalls, 0);
  } finally {
    await app.close();
  }
});

test('Fastify raw-body boot + verification', async () => {
  const state = { transportCalls: 0, verified: false };
  const adapter = new FastifyAdapter();
  const app = await NestFactory.create(platformModule(state), adapter, { rawBody: true, logger: false });
  try {
    await app.init();
    const response = await adapter.getInstance().inject({
      method: 'POST',
      url: '/webhook',
      headers: { 'content-type': 'application/json', 'x-chapa-signature': signature },
      payload: rawBody.toString('utf8')
    });
    assert.equal(response.statusCode, 201);
    assert.equal(state.verified, true);
    assert.equal(state.transportCalls, 0);
  } finally {
    await app.close();
  }
});
