import { NestFactory } from '@nestjs/core';
import { ChapaModule, ChapaService } from '@sye1321/nestjs-chapa';

const secretKey = process.env.CHAPA_SECRET_KEY;
if (!secretKey) throw new Error('CHAPA_SECRET_KEY is required');

const txRef = `sdk_rc_${Date.now()}_${process.pid}`;
const RootModule = class RootModule {};
Reflect.defineProperty(RootModule, 'name', { value: 'SandboxSmokeModule' });
const moduleMetadata = ChapaModule.register({
  secretKey,
  retry: { maxSafeRetries: 0 },
  logging: { enabled: false }
});

const { Module } = await import('@nestjs/common');
Module({ imports: [moduleMetadata] })(RootModule);

const app = await NestFactory.createApplicationContext(RootModule, { logger: false });
let initialized = false;
let failure;
try {
  const chapa = app.get(ChapaService);
  const initialization = await chapa.payments.initialize({ amount: '1', currency: 'ETB', txRef });
  initialized = true;
  console.log(`initialize: PASS (${initialization.response.httpStatus ?? 'response received'})`);
  const verification = await chapa.payments.verify(txRef, { maxRetries: 0 });
  console.log(`verify: PASS (status=${verification.status})`);
} catch (error) {
  failure = error;
  console.error(`smoke: FAIL (${error instanceof Error ? error.name : 'unknown error'})`);
} finally {
  if (initialized) {
    try {
      const chapa = app.get(ChapaService);
      await chapa.payments.cancel(txRef);
      console.log('cleanup cancel: PASS');
    } catch (error) {
      console.error(`cleanup cancel: FAIL (${error instanceof Error ? error.name : 'unknown error'})`);
      failure ??= error;
    }
  }
  await app.close();
}

if (failure) throw new Error('Protected sandbox smoke failed', { cause: failure });
