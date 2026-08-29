import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

const { ChapaClient } = await import('../../dist/esm/core/client/chapa-client.js');
const errors = await import('../../dist/esm/core/errors/errors.js');
const { generateChapaTestSignature } = await import('../../dist/esm/testing/index.js');

const secret = 'synthetic-webhook-secret';
const body = Buffer.from(
  '{"event":"charge.success","status":"success","tx_ref":"tx_1","amount":"001.20","currency":"ETB","extra":{"safe":true}}'
);
const signature = generateChapaTestSignature({ rawBody: body, secret });
const secondary = createHmac('sha256', secret).update(secret, 'utf8').digest('hex');
const webhooks = new ChapaClient({ secretKey: 'synthetic-api-secret', webhookSecret: secret }).webhooks;

function verify(rawBody = body, headers = { 'x-chapa-signature': signature }, options = {}) {
  return webhooks.verify({ rawBody, headers, ...options });
}

test('X1 accepts exact lowercase and uppercase HMAC and configured/explicit secret precedence', () => {
  assert.equal(verify().verifiedBy, 'x-chapa-signature');
  assert.equal(verify(body, { 'X-Chapa-Signature': signature.toUpperCase() }).signature, signature.toUpperCase());
  assert.equal(
    webhooks.verify({
      rawBody: body,
      headers: { 'x-chapa-signature': generateChapaTestSignature({ rawBody: body, secret: 'override' }) },
      secret: 'override'
    }).event.event,
    'charge.success'
  );
});

test('X1 rejects missing, wrong, mutated, malformed, whitespace, and reconstructed bytes', () => {
  const variants = [
    {},
    { 'x-chapa-signature': '0'.repeat(64) },
    { 'x-chapa-signature': signature.slice(0, 63) },
    { 'x-chapa-signature': `${signature}0` },
    { 'x-chapa-signature': 'g'.repeat(64) },
    { 'x-chapa-signature': ` ${signature}` },
    { 'x-chapa-signature': `${signature} ` }
  ];
  for (const headers of variants) assert.throws(() => verify(body, headers), errors.ChapaWebhookSignatureError);
  const mutated = Buffer.from(body);
  mutated[0] ^= 1;
  assert.throws(() => verify(mutated), errors.ChapaWebhookSignatureError);
  assert.throws(() => verify(Buffer.from(`${body.toString()} `)), errors.ChapaWebhookSignatureError);
  const pretty = Buffer.from(JSON.stringify(JSON.parse(body), null, 2));
  assert.throws(() => verify(pretty), errors.ChapaWebhookSignatureError);
});

test('C1 is optional secondary consistency only and never rescues X1', () => {
  assert.equal(verify().event.event, 'charge.success');
  assert.equal(
    verify(body, { 'x-chapa-signature': signature, 'chapa-signature': secondary }).event.event,
    'charge.success'
  );
  for (const value of ['bad', '0'.repeat(64)])
    assert.throws(
      () => verify(body, { 'x-chapa-signature': signature, 'chapa-signature': value }),
      errors.ChapaWebhookSignatureError
    );
  assert.throws(
    () => verify(body, { 'x-chapa-signature': '0'.repeat(64), 'chapa-signature': secondary }),
    errors.ChapaWebhookSignatureError
  );
});

test('header lookup is case-insensitive and fails closed on arrays and ambiguity', () => {
  assert.equal(verify(body, { 'X-CHAPA-SIGNATURE': [signature] }).event.event, 'charge.success');
  assert.throws(() => verify(body, { 'x-chapa-signature': [signature, signature] }), errors.ChapaWebhookSignatureError);
  assert.throws(
    () => verify(body, { 'x-chapa-signature': signature, 'X-Chapa-Signature': signature }),
    errors.ChapaWebhookSignatureError
  );
});

test('signature verification precedes parsing and signed invalid JSON/non-object payloads reject safely', () => {
  const invalid = Buffer.from('{');
  assert.throws(() => verify(invalid, { 'x-chapa-signature': '0'.repeat(64) }), errors.ChapaWebhookSignatureError);
  for (const raw of [invalid, Buffer.from('[]'), Buffer.from('null'), Buffer.from('1')]) {
    const signed = generateChapaTestSignature({ rawBody: raw, secret });
    assert.throws(() => verify(raw, { 'x-chapa-signature': signed }), errors.ChapaResponseError);
  }
});

test('event normalization preserves known, unknown, exact string money, and raw provider object', () => {
  const known = verify();
  assert.deepEqual(
    {
      event: known.event.event,
      status: known.event.status,
      txRef: known.event.txRef,
      amount: known.event.amount,
      currency: known.event.currency
    },
    { event: 'charge.success', status: 'success', txRef: 'tx_1', amount: '001.20', currency: 'ETB' }
  );
  assert.equal(known.event.raw.extra.safe, true);
  for (const payload of [
    { event: 'charge.success', status: 'failed' },
    {
      event: 'future.event',
      status: 'new',
      trx_ref: 'bad',
      reference: 'bad',
      ref_id: 'bad',
      payment_reference: 'bad',
      amount: 12.5
    }
  ]) {
    const raw = Buffer.from(JSON.stringify(payload));
    const result = verify(raw, { 'x-chapa-signature': generateChapaTestSignature({ rawBody: raw, secret }) });
    assert.equal(result.event.event, payload.event);
    if (payload.event === 'future.event') {
      assert.equal(result.event.txRef, undefined);
      assert.equal(result.event.amount, undefined);
    }
  }
  const noEvent = Buffer.from('{"status":"success"}');
  assert.throws(
    () => verify(noEvent, { 'x-chapa-signature': generateChapaTestSignature({ rawBody: noEvent, secret }) }),
    errors.ChapaResponseError
  );
});

test('signature errors redact secrets, signatures, raw bodies and caller bytes are unchanged', () => {
  const caller = Buffer.from(body);
  const before = Buffer.from(caller);
  assert.throws(
    () => verify(caller, { 'x-chapa-signature': '0'.repeat(64) }),
    (error) => {
      const serialized = JSON.stringify(error);
      assert.doesNotMatch(serialized, new RegExp(secret));
      assert.doesNotMatch(serialized, /0000000000000000/);
      assert.doesNotMatch(serialized, /charge\.success/);
      return true;
    }
  );
  const result = verify(caller);
  result.rawBody[0] ^= 1;
  assert.deepEqual(caller, before);
});

test('missing configured and explicit webhook secret is a configuration error distinct from API key', () => {
  const resource = new ChapaClient({ secretKey: secret }).webhooks;
  assert.throws(
    () => resource.verify({ rawBody: body, headers: { 'x-chapa-signature': signature } }),
    errors.ChapaConfigurationError
  );
});
