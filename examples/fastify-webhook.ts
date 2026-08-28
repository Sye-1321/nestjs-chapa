import type { RawBodyRequest } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import { SynchronousExampleModule } from './sdk-usage.js';

export async function createFastifyApplication(): Promise<NestFastifyApplication> {
  return NestFactory.create<NestFastifyApplication>(SynchronousExampleModule, new FastifyAdapter(), {
    rawBody: true
  });
}

export function fastifyRawBody(request: RawBodyRequest<FastifyRequest>): Buffer {
  if (!request.rawBody) throw new Error('raw body is required');
  return request.rawBody;
}
