import { createHmac } from 'node:crypto';

export interface GenerateChapaTestSignatureInput {
  readonly rawBody: Buffer | Uint8Array;
  readonly secret: string;
}

export function generateChapaTestSignature(input: GenerateChapaTestSignatureInput): string {
  if (!input || (!Buffer.isBuffer(input.rawBody) && !(input.rawBody instanceof Uint8Array))) throw new TypeError('rawBody must be Buffer or Uint8Array');
  if (typeof input.secret !== 'string' || input.secret.length === 0) throw new TypeError('secret must be a non-empty string');
  return createHmac('sha256', input.secret).update(input.rawBody).digest('hex');
}
