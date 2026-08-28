import type { RawBodyRequest } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request } from 'express';
import { SynchronousExampleModule } from './sdk-usage.js';

export async function createExpressApplication(): Promise<NestExpressApplication> {
  return NestFactory.create<NestExpressApplication>(SynchronousExampleModule, { rawBody: true });
}

export function expressRawBody(request: RawBodyRequest<Request>): Buffer {
  if (!request.rawBody) throw new Error('raw body is required');
  return request.rawBody;
}
