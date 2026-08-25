import { encodeForm } from './form.mjs';

const SAFE_REFERENCE = /^[A-Za-z0-9_-]+$/;
const REFUND_FIELDS = new Set(['reason', 'amount', 'reference', 'meta']);

export function assertSafeResearchReference(value, label) {
  if (typeof value !== 'string' || !SAFE_REFERENCE.test(value)) {
    throw new TypeError(`${label} fails local research safety grammar`);
  }
  return value;
}

function assertPlainObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object`);
  }
}

export function encodeRefundBody(input = {}) {
  assertPlainObject(input, 'Refund input');
  for (const key of Object.keys(input)) {
    if (!REFUND_FIELDS.has(key)) throw new TypeError(`Refund input contains unsupported field ${key}`);
  }

  const form = {};
  for (const field of ['amount', 'reason', 'reference']) {
    if (Object.hasOwn(input, field)) {
      if (typeof input[field] !== 'string') {
        throw new TypeError(`Refund ${field} must be a string`);
      }
      form[field] = input[field];
    }
  }

  if (Object.hasOwn(input, 'meta')) {
    assertPlainObject(input.meta, 'Refund meta');
    for (const [key, value] of Object.entries(input.meta)) {
      if (!SAFE_REFERENCE.test(key)) {
        throw new TypeError('Refund meta key fails local research safety grammar');
      }
      form[`meta[${key}]`] = value;
    }
  }

  return encodeForm(form);
}

export function buildRefundCreateUrl(reviewedTargetIdentifier) {
  const target = assertSafeResearchReference(reviewedTargetIdentifier, 'Refund target identifier');
  return `https://api.chapa.co/v1/refund/${target}`;
}

export function buildRefundVerifyUrl(reviewedRefId) {
  const refId = assertSafeResearchReference(reviewedRefId, 'Refund verification ref_id');
  return `https://api.chapa.co/v1/refund/${refId}/verify`;
}
