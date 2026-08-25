import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { executeRequest } from '../lib/request.mjs';
import {
  buildRefundCreateUrl,
  buildRefundVerifyUrl,
  encodeRefundBody
} from '../lib/refund.mjs';
import { executeOperation } from '../probe.mjs';

const target = 'reviewed_payment_reference_01';
const refId = 'reviewed_ref_id_01';
const createUrl = `https://api.chapa.co/v1/refund/${target}`;
const verifyUrl = `https://api.chapa.co/v1/refund/${refId}/verify`;
const formHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };

function response(status = 200) {
  return { arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers(), status };
}

describe('M0.5-D D6 refund-specific local policy', () => {
  test('builders accept only caller-supplied safe reviewed identifiers', () => {
    assert.equal(buildRefundCreateUrl(target), createUrl);
    assert.equal(buildRefundVerifyUrl(refId), verifyUrl);
    for (const value of ['', 'bad/ref', 'bad value', '../bad', null, undefined]) {
      assert.throws(() => buildRefundCreateUrl(value), /local research safety grammar/);
      assert.throws(() => buildRefundVerifyUrl(value), /local research safety grammar/);
    }
  });

  test('refund body uses deterministic canonical form encoding', () => {
    const body = encodeRefundBody({
      reference: 'refund_ref_01',
      reason: 'test only + review',
      amount: '5.00',
      meta: { order_id: 'synthetic 1', retryable: false, sequence: 2 }
    });
    assert.equal(body, 'amount=5.00&meta%5Border_id%5D=synthetic+1&meta%5Bretryable%5D=false&meta%5Bsequence%5D=2&reason=test+only+%2B+review&reference=refund_ref_01');
  });

  test('top-level refund fields are conservative strings', () => {
    for (const field of ['amount', 'reason', 'reference']) {
      for (const value of [null, undefined, true, 1, [], {}]) {
        assert.throws(() => encodeRefundBody({ [field]: value }), new RegExp(`Refund ${field} must be a string`));
      }
    }
    assert.throws(() => encodeRefundBody({ unknown: 'x' }), /unsupported field unknown/);
  });

  test('meta accepts scalar values and rejects arrays, nesting, null, undefined, and unsafe keys', () => {
    for (const value of [null, undefined, [], new Date()]) {
      assert.throws(() => encodeRefundBody({ meta: value }), /Refund meta must be a plain object/);
    }
    for (const value of [null, undefined, [], {}, Infinity, NaN]) {
      assert.throws(() => encodeRefundBody({ meta: { key: value } }), /must be a string, finite number, or boolean/);
    }
    assert.throws(() => encodeRefundBody({ meta: { 'bad[key]': 'x' } }), /meta key fails local research safety grammar/);
  });

  test('duplicate form keys are structurally unavailable', () => {
    const body = encodeRefundBody({ reason: 'one', meta: { reason: 'two' } });
    assert.equal(body, 'meta%5Breason%5D=two&reason=one');
    const keys = [...new URLSearchParams(body).keys()];
    assert.equal(new Set(keys).size, keys.length);
  });
});

describe('M0.5-D D6 refund request boundary', () => {
  test('valid refund POST sends exact body once with manual redirect', async () => {
    const calls = [];
    const input = { amount: '5.00', reason: 'test only', reference: 'refund_ref_01' };
    const result = await executeOperation('refund-create', { targetIdentifier: target, input }, {
      fetch: async (url, options) => { calls.push([url.toString(), options]); return response(202); },
      headers: { ...formHeaders, Authorization: 'Bearer synthetic-secret' },
      timeout: 50
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], createUrl);
    assert.equal(calls[0][1].method, 'POST');
    assert.equal(calls[0][1].redirect, 'manual');
    assert.equal(calls[0][1].body, 'amount=5.00&reason=test+only&reference=refund_ref_01');
    assert.equal(result.attemptCount, 1);
    assert.equal(JSON.stringify(result).includes('synthetic-secret'), false);
  });

  test('refund verification GET is bodyless, exact, and one attempt', async () => {
    const calls = [];
    await executeOperation('refund-verify', refId, {
      fetch: async (url, options) => { calls.push([url.toString(), options]); return response(); }
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], verifyUrl);
    assert.equal(calls[0][1].method, 'GET');
    assert.equal(calls[0][1].redirect, 'manual');
    assert.equal('body' in calls[0][1], false);
  });

  test('method, path, body, content type, and headers are coupled before fetch', async () => {
    let calls = 0;
    const fetch = async () => { calls++; return response(); };
    await assert.rejects(() => executeRequest(createUrl, { method: 'GET', providerMode: true, fetch }), /exactly POST/);
    await assert.rejects(() => executeRequest(verifyUrl, { method: 'POST', body: '', providerMode: true, fetch }), /exactly GET/);
    await assert.rejects(() => executeRequest(createUrl, { method: 'POST', providerMode: true, fetch, headers: formHeaders }), /body must be a string/);
    await assert.rejects(() => executeRequest(createUrl, { method: 'POST', body: '', providerMode: true, fetch }), /Content-Type is required/);
    await assert.rejects(() => executeRequest(createUrl, { method: 'POST', body: '', providerMode: true, fetch, headers: { 'Content-Type': 'application/json' } }), /application\/x-www-form-urlencoded/);
    await assert.rejects(() => executeRequest(createUrl, { method: 'POST', body: '', providerMode: true, fetch, headers: { ...formHeaders, Cookie: 'x' } }), /Unapproved request header/);
    await assert.rejects(() => executeRequest(verifyUrl, { method: 'GET', body: '', providerMode: true, fetch }), /GET requests must not carry a body/);
    assert.equal(calls, 0);
  });

  test('query, fragment, origin, port, userinfo, and malformed paths reject before fetch', async () => {
    let calls = 0;
    const fetch = async () => { calls++; };
    const options = { method: 'POST', body: '', headers: formHeaders, providerMode: true, fetch };
    const invalid = [
      `${createUrl}?x=1`, `${createUrl}#x`,
      `http://api.chapa.co/v1/refund/${target}`,
      `https://chapa.co/v1/refund/${target}`,
      `https://api.chapa.co:8443/v1/refund/${target}`,
      `https://user:pass@api.chapa.co/v1/refund/${target}`,
      'https://api.chapa.co/v1/refund/bad%2Fref',
      'https://api.chapa.co/v1/refund/ref/verify/extra'
    ];
    for (const url of invalid) await assert.rejects(() => executeRequest(url, options), /Provider guard/);
    assert.equal(calls, 0);
  });

  test('HTTP errors do not retry refund POST', async () => {
    for (const status of [400, 500]) {
      let calls = 0;
      const result = await executeOperation('refund-create', { targetIdentifier: target, input: {} }, {
        fetch: async () => { calls++; return response(status); }, headers: formHeaders
      });
      assert.equal(calls, 1);
      assert.equal(result.status, status);
    }
  });

  test('transport uncertainty surfaces once with no replay or automatic verification', async () => {
    const calls = [];
    let error;
    try {
      await executeOperation('refund-create', { targetIdentifier: target, input: {} }, {
        fetch: async (url, options) => { calls.push([url.toString(), options.method]); throw new Error('unsafe detail'); },
        headers: formHeaders
      });
    } catch (caught) { error = caught; }
    assert.equal(error.kind, 'transport');
    assert.equal(error.attemptCount, 1);
    assert.equal(error.txRef, target);
    assert.deepEqual(calls, [[createUrl, 'POST']]);
    assert.equal(error.message.includes('unsafe detail'), false);
  });

  test('timeout surfaces once with no replay or automatic verification', async () => {
    const calls = [];
    let error;
    try {
      await executeOperation('refund-create', { targetIdentifier: target, input: {} }, {
        timeout: 10,
        headers: formHeaders,
        fetch: async (url, options) => {
          calls.push([url.toString(), options.method]);
          return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
        }
      });
    } catch (caught) { error = caught; }
    assert.equal(error.kind, 'timeout');
    assert.equal(error.attemptCount, 1);
    assert.equal(error.txRef, target);
    assert.deepEqual(calls, [[createUrl, 'POST']]);
  });
});
