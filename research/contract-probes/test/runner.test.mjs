import test, { describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { runInteractiveSession } from '../session/m0.5-c-runner.mjs';
import { PassThrough } from 'node:stream';

function getTempGuard(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chapa-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'test_guard');
}

function createInteractiveHarness() {
  const stdin = new PassThrough();
  const stdout = new PassThrough();

  let outputData = '';
  let offset = 0;
  let waitingFor = null;

  stdout.on('data', chunk => {
    outputData += chunk.toString();
    if (waitingFor && waitingFor.check()) {
      waitingFor = null;
    }
  });

  return {
    stdin,
    stdout,
    getOutput: () => outputData,
    waitFor: (patternOrString, timeoutMs = 2000) => {
      const check = () => {
        const text = outputData.substring(offset);
        if (typeof patternOrString === 'string') {
          const idx = text.indexOf(patternOrString);
          if (idx !== -1) {
            offset += idx + patternOrString.length;
            return true;
          }
        } else {
          const match = text.match(patternOrString);
          if (match) {
            offset += match.index + match[0].length;
            return true;
          }
        }
        return false;
      };

      if (check()) return Promise.resolve();

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          waitingFor = null;
          reject(new Error(`Timeout waiting for ${patternOrString}\nOutput from offset: ${outputData.substring(offset)}`));
        }, timeoutMs);

        waitingFor = {
          check: () => {
            if (check()) {
              clearTimeout(timer);
              resolve();
              return true;
            }
            return false;
          }
        };
      });
    },
    write: (text) => stdin.write(text)
  };
}

describe('M0.5-C Interactive Runner Tests', () => {
  let rawSnapshotBefore;
  const realRawDir = path.join(fileURLToPath(import.meta.url), '../../.raw');
  test.before(() => {
    if (fs.existsSync(realRawDir)) {
      rawSnapshotBefore = fs.readdirSync(realRawDir).sort();
    } else {
      rawSnapshotBefore = [];
    }
  });

  test.after(() => {
    const rawSnapshotAfter = fs.existsSync(realRawDir) ? fs.readdirSync(realRawDir).sort() : [];
    assert.deepStrictEqual(rawSnapshotAfter, rawSnapshotBefore, 'No test artifacts should be left in .raw directory');
  });


  test('1. actual module import/evaluation makes zero fetch calls', async (t) => {
    let fetchCalled = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (...args) => { fetchCalled++; return originalFetch(...args); };
    await import('../session/m0.5-c-runner.mjs');
    assert.strictEqual(fetchCalled, 0);
    globalThis.fetch = originalFetch;
  });

  test('2. startup performs zero network and TEST MODE required', async (t) => {
    const h = createInteractiveHarness();
    let fetchCalled = 0;
    const fetchFunc = async () => { fetchCalled++; };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' } });

    await h.waitFor('Are you in TEST MODE?');
    assert.strictEqual(fetchCalled, 0);

    h.write('NO\n');
    await runnerPromise;
    assert.match(h.getOutput(), /Aborted: TEST MODE not confirmed/);
    assert.strictEqual(fetchCalled, 0);
  });

  test('3. scenario display performs zero network', async (t) => {
    const h = createInteractiveHarness();
    let fetchCalled = 0;
    const fetchFunc = async () => { fetchCalled++; };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' } });

    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');
    assert.match(h.getOutput(), /Available M0.5-C Scenarios/);
    assert.strictEqual(fetchCalled, 0);

    h.write('0\n');
    await runnerPromise;
  });

  test('4. missing credential => zero fetch', async (t) => {
    const h = createInteractiveHarness();
    let fetchCalled = 0;
    const fetchFunc = async () => { fetchCalled++; };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: {} });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('1\n');
    await h.waitFor('Credential is MISSING');
    assert.strictEqual(fetchCalled, 0);

    h.write('0\n');
    await runnerPromise;
  });

  test('5. AUTHORIZE required for every exact request, random text cannot authorize', async (t) => {
    const h = createInteractiveHarness();
    let fetchCalled = 0;
    const fetchFunc = async () => { fetchCalled++; };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' } });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('1\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');

    h.write('NOT AUTHORIZE\n');
    await h.waitFor('Authorization denied');
    assert.strictEqual(fetchCalled, 0);

    h.write('0\n');
    await runnerPromise;
  });

  test('6. pre-buffered/multiple AUTHORIZE lines cannot authorize a later request', async (t) => {
    const h = createInteractiveHarness();
    let fetchCalled = 0;
    const fetchFunc = async (url) => {
      fetchCalled++;
      return { url: url.toString(), arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers(), status: 200 };
    };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' } });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('1\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');
    h.write('AUTHORIZE\n');
    // Simulate someone mashing AUTHORIZE
    h.write('AUTHORIZE\n');

    await h.waitFor('Select scenario');

    // Try to trigger scenario 2
    h.write('2\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');
    h.write('NO\n');
    await h.waitFor('Authorization denied');

    assert.strictEqual(fetchCalled, 1);

    h.write('0\n');
    await runnerPromise;
  });

  test('7. one authorization => exactly one fetch, authorization cannot carry between scenarios', async (t) => {
    const h = createInteractiveHarness();
    let fetchCalled = 0;
    const fetchFunc = async (url) => {
      fetchCalled++;
      return { url: url.toString(), arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers(), status: 200 };
    };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' } });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('1\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');
    h.write('AUTHORIZE\n');
    await h.waitFor('Select scenario');
    assert.strictEqual(fetchCalled, 1);

    h.write('2\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');
    h.write('NO\n');
    await h.waitFor('Authorization denied');
    assert.strictEqual(fetchCalled, 1);

    h.write('0\n');
    await runnerPromise;
  });

  test('8. initialize => exactly one POST, verify => exactly one GET, no runner retry', async (t) => {
    const h = createInteractiveHarness();
    const calls = [];
    const fetchFunc = async (url, opts) => {
      calls.push({ method: opts.method, url: url.toString() });
      return { url: url.toString(), arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers(), status: 200 };
    };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' } });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('1\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');
    h.write('AUTHORIZE\n');
    await h.waitFor('Select scenario');

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].method, 'POST');

    h.write('5\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');
    h.write('AUTHORIZE\n');
    await h.waitFor('Select scenario');

    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[1].method, 'GET');

    h.write('0\n');
    await runnerPromise;
  });

  test('9. initialization timeout preserves tx_ref, no replay, no auto verify', async (t) => {
    const h = createInteractiveHarness();
    let fetchCalled = 0;
    const fetchFunc = async (url, opts) => {
      fetchCalled++;
      throw new Error('timeout');
    };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' } });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('1\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');
    h.write('AUTHORIZE\n');
    await h.waitFor('UNCERTAIN INITIALIZATION SAFETY');

    const out = h.getOutput();
    assert.strictEqual(fetchCalled, 1);
    assert.match(out, /AttemptCount: 1/);
    assert.match(out, /Exact tx_ref preserved/);
    assert.match(out, /Do not replay POST/);
    assert.match(out, /Separate verification authorization required/);

    h.write('0\n');
    await runnerPromise;
  });

  test('10. verification transport failure uses verification-specific behavior', async (t) => {
    const h = createInteractiveHarness();
    let fetchCalled = 0;
    const fetchFunc = async (url, opts) => {
      fetchCalled++;
      throw new Error('timeout');
    };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' } });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('5\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');
    h.write('AUTHORIZE\n');
    await h.waitFor('UNCERTAIN VERIFICATION SAFETY');

    const out = h.getOutput();
    assert.strictEqual(fetchCalled, 1);
    assert.match(out, /AttemptCount: 1/);
    assert.match(out, /Exact synthetic verification reference preserved/);
    assert.match(out, /No automatic retry/);
    assert.ok(!out.includes('Do not replay POST'));

    h.write('0\n');
    await runnerPromise;
  });

  test('11. secret absent from success and error output, checkout URL/token absent from all output', async (t) => {
    const h = createInteractiveHarness();
    const fetchFunc = async (url) => {
      const resp = {
        message: 'Hosted Link',
        status: 'success',
        data: { checkout_url: 'https://checkout.chapa.co/super-secret-token-123' }
      };
      return { url: url.toString(), arrayBuffer: async () => Buffer.from(JSON.stringify(resp)), headers: new Headers(), status: 200 };
    };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'my-super-secret-key-12345' } });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('1\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');
    h.write('AUTHORIZE\n');
    await h.waitFor('Select scenario');

    const out = h.getOutput();
    assert.ok(!out.includes('super-secret-token-123'), 'checkout token hidden');
    assert.ok(out.includes('checkoutUrlPresent: true'), 'checkout boolean present');
    assert.ok(!out.includes('my-super-secret-key-12345'), 'secret hidden');
    assert.ok(!out.toLowerCase().includes('authorization: bearer'), 'Authorization header hidden');

    h.write('0\n');
    await runnerPromise;
  });

  test('12. generated refs <= 50 and match conservative grammar', async (t) => {
    const h = createInteractiveHarness();
    const fetchFunc = async (url) => {
      return { url: url.toString(), arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers(), status: 200 };
    };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' } });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('1\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');

    const out = h.getOutput();
    const txRefMatch = out.match(/tx_ref length: (\d+)/);
    assert.ok(txRefMatch);
    assert.ok(parseInt(txRefMatch[1], 10) <= 50);

    const refMatch = out.match(/Exact tx_ref\/reference: ([^\n]+)/);
    assert.ok(refMatch);
    assert.match(refMatch[1], /^[A-Za-z0-9_]+$/);

    h.write('NO\n');
    await h.waitFor('Select scenario');

    h.write('5\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');

    const out2 = h.getOutput();
    const refMatch2 = out2.match(/Exact tx_ref\/reference: (m05c_unknown_[^\n]+)/);
    assert.ok(refMatch2);
    assert.match(refMatch2[1], /^[A-Za-z0-9_]+$/);

    h.write('NO\n');
    await h.waitFor('Select scenario');
    h.write('0\n');
    await runnerPromise;
  });

  test('13. duplicate uses exact accepted payload, can execute once only, persistent guard blocks across sessions', async (t) => {
    const guardPath = getTempGuard(t);

    const h = createInteractiveHarness();
    let fetchCalled = 0;
    let fetchOpts = null;
    let fetchUrl = null;
    const fetchFunc = async (url, opts) => {
      fetchCalled++;
      fetchOpts = opts;
      fetchUrl = url;
      return { url: url.toString(), arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers(), status: 200 };
    };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' }, duplicateGuardPath: guardPath });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('4\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');

    const out = h.getOutput();
    assert.match(out, /m05c_init_20260817_minimal_a2968f3244ab436c/);

    h.write('AUTHORIZE\n');
    await h.waitFor('Select scenario');
    assert.strictEqual(fetchCalled, 1);
    assert.strictEqual(fetchOpts.method, 'POST');
    assert.deepStrictEqual(JSON.parse(fetchOpts.body), {
      amount: "10",
      currency: "ETB",
      tx_ref: "m05c_init_20260817_minimal_a2968f3244ab436c"
    });

    h.write('0\n');
    await runnerPromise;

    // START NEW SESSION TO PROVE PERSISTENT BLOCK
    const h2 = createInteractiveHarness();
    const runnerPromise2 = runInteractiveSession({ captureFunc: async () => {}, stdin: h2.stdin, stdout: h2.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' }, duplicateGuardPath: guardPath });
    await h2.waitFor('TEST MODE');
    h2.write('TEST MODE\n');
    await h2.waitFor('Select scenario');

    h2.write('4\n');
    await h2.waitFor('Type EXACTLY "AUTHORIZE"');
    h2.write('AUTHORIZE\n');

    await h2.waitFor('Aborted: Persistent duplicate guard already exists or creation failed.');
    await h2.waitFor('Select scenario');
    assert.strictEqual(fetchCalled, 1, 'No additional fetch calls made');

    h2.write('0\n');
    await runnerPromise2;
  });

  test('14. unknown verification generates a fresh reference in accepted observed-style grammar <= 50 chars', async (t) => {
    const h = createInteractiveHarness();
    let fetchUrl = null;
    const fetchFunc = async (url) => {
      fetchUrl = url.toString();
      return { url: url.toString(), arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers(), status: 200 };
    };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' } });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('5\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');

    const out = h.getOutput();
    const refMatch = out.match(/Exact tx_ref\/reference: (m05c_unknown_[A-Za-z0-9_]+)/);
    assert.ok(refMatch);
    const generatedRef = refMatch[1];
    assert.ok(generatedRef.length <= 50);

    h.write('AUTHORIZE\n');
    await h.waitFor('Select scenario');

    assert.ok(fetchUrl.includes(generatedRef), 'exact generated ref appears in GET URL');

    h.write('0\n');
    await runnerPromise;
  });

  test('15. runner cannot silently/batch execute scenarios, returning to menu performs no additional fetch', async (t) => {
    const h = createInteractiveHarness();
    let fetchCalled = 0;
    const fetchFunc = async (url) => {
      fetchCalled++;
      return { url: url.toString(), arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers(), status: 200 };
    };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' } });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('1\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');
    h.write('AUTHORIZE\n');
    await h.waitFor('Select scenario');
    assert.strictEqual(fetchCalled, 1);

    h.write('1\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');
    h.write('NO\n');
    await h.waitFor('Authorization denied');
    await h.waitFor('Select scenario');
    assert.strictEqual(fetchCalled, 1, 'Returning to menu performs zero additional fetches');

    h.write('0\n');
    await runnerPromise;
  });

  test('16. fake provider execution causes raw capture only under .raw', async (t) => {
    const h = createInteractiveHarness();
    let captureUrl = null;
    const fetchFunc = async (url) => {
      return { url: url.toString(), arrayBuffer: async () => Buffer.from('{"status":"test"}'), headers: new Headers(), status: 200, method: 'GET' };
    };

    const runnerPromise = runInteractiveSession({ stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' }, duplicateGuardPath: getTempGuard(t) });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('5\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');

    const out = h.getOutput();
    const refMatch = out.match(/Exact tx_ref\/reference: (m05c_unknown_[A-Za-z0-9_]+)/);
    assert.ok(refMatch);
    const txRef = refMatch[1];

    h.write('AUTHORIZE\n');
    await h.waitFor('Select scenario');

    const rawDir = path.join(fileURLToPath(import.meta.url), '../../.raw');
    const captureFile = path.join(rawDir, `capture-verify-unknown-${txRef}.json`);

    assert.ok(fs.existsSync(captureFile), 'Capture file was created');
    fs.unlinkSync(captureFile);

    h.write('0\n');
    await runnerPromise;
  });

  test('17. provider message hardening adversarial tests (malicious object keys)', async (t) => {
    const h = createInteractiveHarness();
    const fetchFunc = async (url) => {
      const resp = {
        message: {
          "token-key-super-secret": "some value",
          "http://hacked.com/key": "some value",
          "amount": "100"
        }
      };
      return { url: url.toString(), arrayBuffer: async () => Buffer.from(JSON.stringify(resp)), headers: new Headers(), status: 200 };
    };

    const runnerPromise = runInteractiveSession({ captureFunc: async () => {}, stdin: h.stdin, stdout: h.stdout, fetchFunc, env: { CHAPA_SECRET_KEY: 'test' } });
    await h.waitFor('TEST MODE');
    h.write('TEST MODE\n');
    await h.waitFor('Select scenario');

    h.write('1\n');
    await h.waitFor('Type EXACTLY "AUTHORIZE"');
    h.write('AUTHORIZE\n');
    await h.waitFor('Select scenario');

    const out = h.getOutput();
    assert.ok(!out.includes('token-key-super-secret'), 'Malicious key hidden');
    assert.ok(!out.includes('http://hacked.com/key'), 'Malicious URL key hidden');
    assert.ok(out.includes('amount'), 'Allowed key shown');
    assert.ok(out.includes('[REDACTED_KEY]'), 'Unknown keys shown generically');

    h.write('0\n');
    await runnerPromise;
  });
});
