import { createHmac } from 'node:crypto';

/**
 * Test-only helpers for generating deterministic Chapa webhook signatures without provider calls.
 *
 * @packageDocumentation
 */

/** Input bytes and secret used to sign a synthetic webhook in tests.
 * @public
 */
export interface GenerateChapaTestSignatureInput {
  /** The exact bytes that the application will pass to webhook verification. */
  readonly rawBody: Buffer | Uint8Array;
  /** A fictional test secret; never put production credentials in test fixtures. */
  readonly secret: string;
}

/** Generates the primary SHA-256 HMAC signature accepted by webhook verification.
 * @public
 */
export function generateChapaTestSignature(input: GenerateChapaTestSignatureInput): string {
  if (!input || (!Buffer.isBuffer(input.rawBody) && !(input.rawBody instanceof Uint8Array)))
    throw new TypeError('rawBody must be Buffer or Uint8Array');
  if (typeof input.secret !== 'string' || input.secret.length === 0)
    throw new TypeError('secret must be a non-empty string');
  return createHmac('sha256', input.secret).update(input.rawBody).digest('hex');
}
