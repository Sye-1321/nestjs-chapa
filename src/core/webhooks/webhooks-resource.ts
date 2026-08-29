import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ResolvedChapaConfiguration } from '../config/configuration.js';
import {
  ChapaConfigurationError,
  ChapaResponseError,
  ChapaValidationError,
  ChapaWebhookSignatureError
} from '../errors/errors.js';
import type { ChapaWebhookEvent, ChapaWebhooks, VerifiedWebhook, VerifyWebhookInput } from './types.js';

const HEX_SIGNATURE = /^[0-9A-Fa-f]{64}$/;

function signatureError(): ChapaWebhookSignatureError {
  return new ChapaWebhookSignatureError({
    code: 'webhook_signature_error',
    message: 'Invalid webhook signature',
    retryable: false
  });
}

function header(headers: VerifyWebhookInput['headers'], name: string): string | undefined {
  const matches = Object.entries(headers).filter(([key]) => key.toLowerCase() === name);
  if (matches.length > 1) throw signatureError();
  if (matches.length === 0) return undefined;
  const value = matches[0]?.[1];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'string') return value[0];
  throw signatureError();
}

function verifyDigest(signature: string | undefined, expected: Buffer): string {
  if (signature === undefined || !HEX_SIGNATURE.test(signature)) throw signatureError();
  const supplied = Buffer.from(signature, 'hex');
  if (supplied.length !== 32 || expected.length !== 32 || !timingSafeEqual(supplied, expected)) throw signatureError();
  return signature;
}

function usableString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function normalize(raw: Record<string, unknown>): ChapaWebhookEvent {
  if (!usableString(raw.event)) {
    throw new ChapaResponseError({
      code: 'response_error',
      message: 'Webhook payload has no usable event',
      retryable: false
    });
  }
  const common = {
    event: raw.event,
    ...(usableString(raw.tx_ref) ? { txRef: raw.tx_ref } : {}),
    ...(usableString(raw.status) ? { status: raw.status } : {}),
    ...(typeof raw.amount === 'string' ? { amount: raw.amount } : {}),
    ...(usableString(raw.currency) ? { currency: raw.currency } : {}),
    raw
  };
  if (raw.event === 'charge.success' && raw.status === 'success')
    return { ...common, event: 'charge.success', status: 'success' };
  return common;
}

export class WebhooksResource implements ChapaWebhooks {
  constructor(private readonly configuration: ResolvedChapaConfiguration) {}

  verify(input: VerifyWebhookInput): VerifiedWebhook {
    if (!input || (!Buffer.isBuffer(input.rawBody) && !(input.rawBody instanceof Uint8Array))) {
      throw new ChapaValidationError('Invalid webhook input', [
        { path: ['rawBody'], message: 'rawBody must be Buffer or Uint8Array' }
      ]);
    }
    const rawBody = Buffer.from(input.rawBody);
    const secret = input.secret !== undefined ? input.secret : this.configuration.webhookSecret();
    if (typeof secret !== 'string' || secret.trim().length === 0) {
      throw new ChapaConfigurationError({
        code: 'configuration_error',
        message: 'Webhook verification is not configured',
        retryable: false
      });
    }
    if (!input.headers || typeof input.headers !== 'object') {
      throw new ChapaValidationError('Invalid webhook input', [
        { path: ['headers'], message: 'headers must be an object' }
      ]);
    }
    const primary = header(input.headers, 'x-chapa-signature');
    const signature = verifyDigest(primary, createHmac('sha256', secret).update(rawBody).digest());
    const secondary = header(input.headers, 'chapa-signature');
    if (secondary !== undefined) verifyDigest(secondary, createHmac('sha256', secret).update(secret, 'utf8').digest());

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new ChapaResponseError({
        code: 'response_error',
        message: 'Webhook payload is not valid JSON',
        retryable: false
      });
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new ChapaResponseError({
        code: 'response_error',
        message: 'Webhook payload must be an object',
        retryable: false
      });
    }
    return { verifiedBy: 'x-chapa-signature', event: normalize(parsed as Record<string, unknown>), rawBody, signature };
  }
}
