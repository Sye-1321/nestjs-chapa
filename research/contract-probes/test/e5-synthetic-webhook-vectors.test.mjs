import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  decodeSha256Signature,
  evaluateWebhookCandidates,
  hmacSha256,
  timingSafeSignatureMatch
} from '../lib/webhook-crypto.mjs';

// SYNTHETIC ONLY: these values are deterministic local contract vectors.
// They contain no captured provider payload, signature, digest, or secret.
const webhookConfiguredSecret = 'm05e-synthetic-webhook-secret-v1';
const apiStyleSecret = 'm05e-synthetic-distinct-api-secret-v1';
const rawBody = Buffer.from('{"event":"charge.synthetic","status":"success","data":{"value":1}}', 'utf8');

function syntheticXSignature(secret = webhookConfiguredSecret, body = rawBody) {
  return createHmac('sha256', Buffer.from(secret, 'utf8')).update(body).digest('hex');
}

function syntheticCSignature(secret = webhookConfiguredSecret) {
  return createHmac('sha256', Buffer.from(secret, 'utf8')).update(Buffer.from(secret, 'utf8')).digest('hex');
}

describe('M0.5-E E5 SYNTHETIC provider-derived contract vectors', () => {
  test('independently verifies synthetic X1 over exact raw bytes', () => {
    const signature = syntheticXSignature();
    assert.equal(timingSafeSignatureMatch(hmacSha256(webhookConfiguredSecret, rawBody), signature, 'hex'), true);
  });

  test('independently verifies synthetic C1 over UTF-8 secret bytes', () => {
    const signature = syntheticCSignature();
    const message = Buffer.from(webhookConfiguredSecret, 'utf8');
    assert.equal(timingSafeSignatureMatch(hmacSha256(webhookConfiguredSecret, message), signature, 'hex'), true);
  });

  test('distinct API-style secret fails X2 and C2', () => {
    const results = evaluateWebhookCandidates({
      rawBody,
      selectedHeaders: {
        'x-chapa-signature': syntheticXSignature(),
        'chapa-signature': syntheticCSignature()
      },
      secrets: { webhookConfiguredSecret, apiSecretKey: apiStyleSecret }
    });
    assert.deepEqual(results.map(result => result.match), [true, false, true, false]);
  });

  test('one-byte raw mutation fails the synthetic x-chapa signature', () => {
    const mutated = Buffer.from(rawBody);
    mutated[mutated.length - 2] = 0x32;
    assert.equal(timingSafeSignatureMatch(hmacSha256(webhookConfiguredSecret, mutated), syntheticXSignature(), 'hex'), false);
  });

  test('whitespace-only raw mutation fails the synthetic x-chapa signature', () => {
    const mutated = Buffer.from(` ${rawBody.toString('utf8')}`, 'utf8');
    assert.equal(timingSafeSignatureMatch(hmacSha256(webhookConfiguredSecret, mutated), syntheticXSignature(), 'hex'), false);
  });

  test('secret mutation fails both synthetic signatures', () => {
    const mutatedSecret = `${webhookConfiguredSecret}-mutated`;
    assert.equal(timingSafeSignatureMatch(hmacSha256(mutatedSecret, rawBody), syntheticXSignature(), 'hex'), false);
    assert.equal(
      timingSafeSignatureMatch(hmacSha256(mutatedSecret, Buffer.from(mutatedSecret, 'utf8')), syntheticCSignature(), 'hex'),
      false
    );
  });

  test('existing decoder policy accepts upper- and lowercase synthetic hex', () => {
    const signature = syntheticXSignature();
    assert.deepEqual(decodeSha256Signature(signature, 'hex'), decodeSha256Signature(signature.toUpperCase(), 'hex'));
  });

  test('malformed and wrong-length synthetic signatures fail closed', () => {
    for (const signature of ['a'.repeat(63), 'a'.repeat(65), 'g'.repeat(64), ` ${'a'.repeat(64)}`]) {
      assert.throws(() => decodeSha256Signature(signature, 'hex'), /malformed hex/);
    }
  });

  test('both synthetic headers remain independently evaluated', () => {
    const wrongC = syntheticCSignature(`${webhookConfiguredSecret}-wrong`);
    const results = evaluateWebhookCandidates({
      rawBody,
      selectedHeaders: {
        'x-chapa-signature': syntheticXSignature(),
        'chapa-signature': wrongC
      },
      secrets: { webhookConfiguredSecret }
    });
    assert.equal(results.find(result => result.candidateId === 'X1').match, true);
    assert.equal(results.find(result => result.candidateId === 'C1').match, false);
  });
});
