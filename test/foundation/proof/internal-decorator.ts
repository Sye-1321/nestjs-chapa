import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

const internalSchema = z.object({ value: z.string() });

@Injectable()
export class InternalDecoratorProof {
  constructor(readonly value: string) {}

  parse(input: unknown): string {
    return internalSchema.parse(input).value;
  }
}
