import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { executeRequest } from '../lib/request.mjs';
import { encodeForm } from '../lib/form.mjs';
import { buildCancelUrl, executeOperation } from '../probe.mjs';

const cancelUrl = 'https://api.chapa.co/v1/transaction/cancel/m05d_test_ref';

function response(status = 200) {
  return { arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers(), status };
}

describe('M0.5-D D2 cancellation boundary', () => {
  test('valid exact cancellation is bodyless, manual, and one attempt', async () => {
    const calls = [];
    const result = await executeOperation('cancel', 'm05d_test_ref', {
      fetch: async (url, options) => {
        calls.push({ url: url.toString(), options });
        return response();
      },
      headers: { Authorization: 'Bearer synthetic-secret' },
      timeout: 50
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, cancelUrl);
    assert.equal(calls[0].options.method, 'PUT');
    assert.equal(calls[0].options.redirect, 'manual');
    assert.equal('body' in calls[0].options, false);
    assert.equal(result.attemptCount, 1);
    assert.equal(JSON.stringify(result).includes('synthetic-secret'), false);
  });

  test('body is rejected before fetch', async () => {
    let calls = 0;
    for (const body of [undefined, null, '', '{}', 'amount=1']) {
      await assert.rejects(() => executeRequest(cancelUrl, {
        method: 'PUT', body, providerMode: true, fetch: async () => { calls++; }
      }), /must not carry a body/);
    }
    assert.equal(calls, 0);
  });

  test('wrong methods and paths are rejected before fetch', async () => {
    let calls = 0;
    const fetch = async () => { calls++; };
    await assert.rejects(() => executeRequest(cancelUrl, { method: 'GET', providerMode: true, fetch }), /exactly PUT/);
    await assert.rejects(() => executeRequest('https://api.chapa.co/v1/transaction/cancel', { method: 'PUT', providerMode: true, fetch }), /Pathname not in approved/);
    await assert.rejects(() => executeRequest('https://api.chapa.co/v1/transaction/cancel/bad%2Fref', { method: 'PUT', providerMode: true, fetch }), /Pathname not in approved/);
    assert.equal(calls, 0);
  });

  test('query, fragment, origin, host, port, and userinfo are rejected before fetch', async () => {
    let calls = 0;
    const fetch = async () => { calls++; };
    const options = { method: 'PUT', providerMode: true, fetch };
    const invalid = [
      `${cancelUrl}?x=1`, `${cancelUrl}#x`,
      'http://api.chapa.co/v1/transaction/cancel/ref',
      'https://chapa.co/v1/transaction/cancel/ref',
      'https://api.chapa.co:8443/v1/transaction/cancel/ref',
      'https://user:pass@api.chapa.co/v1/transaction/cancel/ref'
    ];
    for (const url of invalid) await assert.rejects(() => executeRequest(url, options), /Provider guard/);
    assert.equal(calls, 0);
  });

  test('HTTP errors return once without retry', async () => {
    for (const status of [400, 500]) {
      let calls = 0;
      const result = await executeOperation('cancel', 'm05d_test_ref', {
        fetch: async () => { calls++; return response(status); }
      });
      assert.equal(calls, 1);
      assert.equal(result.status, status);
    }
  });

  test('transport uncertainty surfaces once with no automatic GET', async () => {
    const calls = [];
    let error;
    try {
      await executeOperation('cancel', 'm05d_test_ref', {
        fetch: async (url, options) => {
          calls.push([url.toString(), options.method]);
          throw new Error('secret transport detail');
        }
      });
    } catch (caught) { error = caught; }
    assert.equal(error.kind, 'transport');
    assert.equal(error.attemptCount, 1);
    assert.equal(error.txRef, 'm05d_test_ref');
    assert.deepEqual(calls, [[cancelUrl, 'PUT']]);
    assert.equal(error.message.includes('secret transport detail'), false);
  });

  test('timeout surfaces once with no retry or automatic GET', async () => {
    const calls = [];
    let error;
    try {
      await executeOperation('cancel', 'm05d_test_ref', {
        timeout: 10,
        fetch: async (url, options) => {
          calls.push([url.toString(), options.method]);
          return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
        }
      });
    } catch (caught) { error = caught; }
    assert.equal(error.kind, 'timeout');
    assert.equal(error.attemptCount, 1);
    assert.equal(error.txRef, 'm05d_test_ref');
    assert.deepEqual(calls, [[cancelUrl, 'PUT']]);
  });

  test('invalid references and arbitrary headers fail before fetch', async () => {
    let calls = 0;
    assert.throws(() => buildCancelUrl('bad/ref'), /local harness safety grammar/);
    await assert.rejects(() => executeRequest(cancelUrl, {
      method: 'PUT', headers: { Cookie: 'x' }, providerMode: true, fetch: async () => { calls++; }
    }), /Unapproved request header/);
    assert.equal(calls, 0);
  });
});

describe('M0.5-D D2 deterministic form foundation', () => {
  test('encodes supported scalars deterministically', () => {
    assert.equal(encodeForm({ z: true, amount: 10, reason: 'test only' }), 'amount=10&reason=test%20only&z=true');
    assert.equal(encodeForm({ reason: 'test only', amount: 10, z: true }), 'amount=10&reason=test%20only&z=true');
  });

  test('percent-encodes keys and values', () => {
    assert.equal(encodeForm({ 'meta[key]': 'a+b & c/ይ' }), 'meta%5Bkey%5D=a%2Bb%20%26%20c%2F%E1%8B%AD');
  });

  test('rejects unsupported values and performs no network activity', () => {
    assert.throws(() => encodeForm({ meta: { nested: true } }), /must be a string, finite number, or boolean/);
    assert.throws(() => encodeForm({ items: ['a'] }), /must be a string, finite number, or boolean/);
    assert.equal(encodeForm(new Map([['b', '2'], ['a', '1']])), 'a=1&b=2');
    assert.equal(encodeForm.constructor.name, 'Function');
  });
});
