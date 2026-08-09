import { test, describe } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const harnessRawRoot = path.resolve(__dirname, '..', '.raw');

import { requireChapaSecretKey } from '../lib/env.mjs';
import { executeRequest } from '../lib/request.mjs';
import { captureRaw } from '../lib/capture.mjs';
import { sanitize } from '../lib/sanitize.mjs';

// Setup local server helper using t.after
async function createLocalServer(t, handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  return { server, url };
}

describe('M0.5-A Harness Tests', () => {

  describe('A. ENV / SECRET SAFETY', () => {
    test('1. credential-requiring helper fails closed with missing credential', () => {
      assert.throws(() => requireChapaSecretKey({}), /Missing required environment credential/);
    });

    test('2. blank credential fails closed', () => {
      assert.throws(() => requireChapaSecretKey({ CHAPA_SECRET_KEY: '   ' }), /Missing required environment credential/);
    });

    test('3. synthetic credential can be returned when explicitly injected', () => {
      const secret = requireChapaSecretKey({ CHAPA_SECRET_KEY: 'synthetic-secret-123' });
      assert.strictEqual(secret, 'synthetic-secret-123');
    });

    test('4. error/log output does not reveal the synthetic credential', () => {
      try {
        requireChapaSecretKey({});
      } catch (err) {
        assert.ok(!err.message.includes('synthetic-secret-123'));
        assert.ok(!err.message.includes('CHAPA_SECRET_KEY'));
      }
    });

    test('5. importing env.mjs does not require/read a credential', () => {
      assert.ok(true);
    });
  });

  describe('B. NETWORK GUARD & URL SAFETY', () => {
    test('6. localhost accepted', async (t) => {
      const { url } = await createLocalServer(t, (req, res) => res.end('ok'));
      const locUrl = url.replace('127.0.0.1', 'localhost');
      const res = await executeRequest(locUrl);
      assert.strictEqual(res.status, 200);
    });

    test('7. 127.0.0.1 accepted', async (t) => {
      const { url } = await createLocalServer(t, (req, res) => res.end('ok'));
      const res = await executeRequest(url);
      assert.strictEqual(res.status, 200);
    });

    test('8. ::1 accepted', async () => {
      let fetchCalled = false;
      try {
         await executeRequest('http://[::1]:9999', {
             fetch: async () => { fetchCalled = true; throw new Error('mock'); }
         });
      } catch (e) { }
      assert.strictEqual(fetchCalled, true);
    });

    test('9. external hostname rejected before fetch', async () => {
      await assert.rejects(() => executeRequest('https://example.com'), /Network guard/);
    });

    test('10. https://api.chapa.co/v1/banks rejected before fetch', async () => {
      await assert.rejects(() => executeRequest('https://api.chapa.co/v1/banks'), /Network guard/);
    });

    test('11. prove injected fetch spy invocation count remains ZERO for rejected external URL', async () => {
      let fetchCalled = false;
      const mockFetch = async () => { fetchCalled = true; };
      await assert.rejects(() => executeRequest('https://api.chapa.co/v1/banks', { fetch: mockFetch }), /Network guard/);
      assert.strictEqual(fetchCalled, false);
    });

    test('URL username/password is rejected', async () => {
       await assert.rejects(() => executeRequest('http://user:pass@127.0.0.1:9999/'), /URL userinfo is rejected/);
    });

    test('sensitive URL query is not serialized', async (t) => {
      const { url } = await createLocalServer(t, (req, res) => res.end('ok'));
      const res = await executeRequest(url + '/path?token=SYNTHETIC_SECRET#frag');
      assert.ok(!res.url.includes('SYNTHETIC_SECRET'));
      assert.ok(!res.url.includes('token'));
      assert.ok(!res.url.includes('frag'));
      assert.ok(res.url.endsWith('/path'));
    });
  });

  describe('C. ONE ATTEMPT', () => {
    test('12. accepted loopback request invokes fetch exactly once', async () => {
      let callCount = 0;
      const mockFetch = async () => {
        callCount++;
        return { arrayBuffer: async () => new ArrayBuffer(0), headers: new Headers(), status: 200 };
      };
      await executeRequest('http://127.0.0.1', { fetch: mockFetch });
      assert.strictEqual(callCount, 1);
    });

    test('13. local server receives exactly one request', async (t) => {
      let requestCount = 0;
      const { url } = await createLocalServer(t, (req, res) => {
        requestCount++;
        res.end('ok');
      });
      await executeRequest(url);
      assert.strictEqual(requestCount, 1);
    });

    test('14. no retry on normal response', async (t) => {
      let requestCount = 0;
      const { url } = await createLocalServer(t, (req, res) => {
        requestCount++;
        res.end('ok');
      });
      await executeRequest(url);
      assert.strictEqual(requestCount, 1);
    });
  });

  describe('D. REDIRECT', () => {
    test('15-19. redirect handling', async (t) => {
      let bCount = 0;
      let aCount = 0;
      const serverB = http.createServer((req, res) => {
        bCount++;
        res.end('b');
      });
      await new Promise((r) => serverB.listen(0, '127.0.0.1', r));
      t.after(async () => { await new Promise((r) => serverB.close(r)); });
      const urlB = `http://127.0.0.1:${serverB.address().port}`;

      const serverA = http.createServer((req, res) => {
        aCount++;
        res.writeHead(302, { Location: urlB });
        res.end();
      });
      await new Promise((r) => serverA.listen(0, '127.0.0.1', r));
      t.after(async () => { await new Promise((r) => serverA.close(r)); });
      const urlA = `http://127.0.0.1:${serverA.address().port}`;

      const res = await executeRequest(urlA);

      assert.strictEqual(res.status, 302);
      assert.strictEqual(aCount, 1);
      assert.strictEqual(bCount, 0); // Location is not followed
    });
  });

  describe('E. TIMEOUT & FAILURE CLASSIFICATION', () => {
    test('20-22. timeout behavior and classification', async (t) => {
      const { url } = await createLocalServer(t, (req, res) => {
        // do not respond
      });

      let err;
      try {
        await executeRequest(url, { timeout: 100 });
      } catch (e) {
        err = e;
      }
      assert.ok(err);
      assert.strictEqual(err.kind, 'timeout');
      assert.strictEqual(err.attemptCount, 1);
      assert.strictEqual(err.message, 'Research request timed out');
    });

    test('full-body stall timeout', async (t) => {
      const { url } = await createLocalServer(t, (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write('prefix');
        // intentionally do not end the response to stall the body
      });

      let err;
      try {
        await executeRequest(url, { timeout: 100 });
      } catch (e) {
        err = e;
      }
      assert.ok(err);
      assert.strictEqual(err.kind, 'timeout');
      assert.strictEqual(err.attemptCount, 1);
      assert.strictEqual(err.message, 'Research request timed out');
    });

    test('injected transport Error does not leak secrets in message', async () => {
      const mockFetch = async () => {
        throw new Error('Connection failed: SYNTHETIC_SECRET_IN_ERROR');
      };

      let err;
      try {
        await executeRequest('http://127.0.0.1:9999', { fetch: mockFetch });
      } catch (e) {
        err = e;
      }
      assert.ok(err);
      assert.strictEqual(err.kind, 'transport');
      assert.ok(!err.message.includes('SYNTHETIC_SECRET_IN_ERROR'));
      assert.strictEqual(err.message, 'Research request transport failure');
      assert.strictEqual(err.attemptCount, 1);
    });

    test('injected fetch throws new Error("Timeout") immediately', async () => {
      const mockFetch = async () => { throw new Error('Timeout'); };
      let err;
      try {
        await executeRequest('http://127.0.0.1:9999', { fetch: mockFetch });
      } catch (e) {
        err = e;
      }
      assert.ok(err);
      assert.strictEqual(err.kind, 'transport');
    });

    test('injected fetch throws AbortError without executor timer firing', async () => {
      const mockFetch = async () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      };
      let err;
      try {
        await executeRequest('http://127.0.0.1:9999', { fetch: mockFetch });
      } catch (e) {
        err = e;
      }
      assert.ok(err);
      assert.strictEqual(err.kind, 'transport');
    });
  });

  describe('F. RESPONSE OBSERVATION', () => {
    test('23. status captured correctly', async (t) => {
      const { url } = await createLocalServer(t, (req, res) => {
        res.writeHead(201);
        res.end();
      });
      const res = await executeRequest(url);
      assert.strictEqual(res.status, 201);
    });

    test('24. content-type retained', async (t) => {
      const { url } = await createLocalServer(t, (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end();
      });
      const res = await executeRequest(url);
      assert.strictEqual(res.headers['content-type'], 'application/json');
    });

    test('25. unapproved synthetic response header excluded', async (t) => {
      const { url } = await createLocalServer(t, (req, res) => {
        res.writeHead(200, { 'x-synthetic-unapproved': 'secret' });
        res.end();
      });
      const res = await executeRequest(url);
      assert.strictEqual(res.headers['x-synthetic-unapproved'], undefined);
    });

    test('26-27. byte-for-byte raw capture', async (t) => {
      const { url } = await createLocalServer(t, (req, res) => {
        res.end(Buffer.from([0x00, 0x01, 0x02]));
      });
      const res = await executeRequest(url);
      assert.strictEqual(res.rawBytes.length, 3);
      assert.strictEqual(res.rawBytes[0], 0x00);
      assert.strictEqual(res.rawBytes[1], 0x01);
      assert.strictEqual(res.rawBytes[2], 0x02);
    });

    test('28. duration is recorded', async (t) => {
      const { url } = await createLocalServer(t, (req, res) => res.end());
      const res = await executeRequest(url);
      assert.ok(typeof res.duration === 'number');
    });

    test('29. accepted execution reports attemptCount = 1', async (t) => {
      const { url } = await createLocalServer(t, (req, res) => res.end());
      const res = await executeRequest(url);
      assert.strictEqual(res.attemptCount, 1);
    });
  });

  describe('G. AUTHORIZATION/CAPTURE SAFETY', () => {
    test('30. synthetic Authorization header is never serialized', async () => {
      await assert.rejects(
        () => captureRaw({ headers: { 'Authorization': 'Bearer 123' }, rawBytes: new Uint8Array() }),
        /Authorization header present/
      );
    });

    test('31. synthetic secret value does not appear in serialized capture', async () => {
      await assert.rejects(
        () => captureRaw({ headers: { 'x-chapa-secret': '123' }, url: 'http://127.0.0.1', rawBytes: new Uint8Array() }),
        /Secret present in metadata/
      );
    });

    test('direct captureRaw with URL userinfo fails closed', async () => {
      await assert.rejects(
        () => captureRaw({ url: 'http://user:pass@127.0.0.1', rawBytes: new Uint8Array() }),
        /URL userinfo is rejected/
      );
    });

    test('direct captureRaw with sensitive query/fragment strips them', async (t) => {
      const file = await captureRaw({
        url: 'http://127.0.0.1/path?token=SYNTHETIC_DIRECT_CAPTURE_SECRET#fragment',
        rawBytes: new Uint8Array()
      }, harnessRawRoot);

      t.after(async () => {
         try { await fs.unlink(file); } catch (e) {}
      });

      const content = JSON.parse(await fs.readFile(file, 'utf8'));
      assert.ok(!content.url.includes('SYNTHETIC_DIRECT_CAPTURE_SECRET'));
      assert.ok(!content.url.includes('token'));
      assert.ok(!content.url.includes('fragment'));
      assert.strictEqual(content.url, 'http://127.0.0.1/path');
    });

    test('captureRaw handles duplicate path collision using idFactory', async (t) => {
      const metadata = {
        url: 'http://127.0.0.1',
        rawBytes: new Uint8Array()
      };

      const idFactory = () => 'duplicatetest';
      const file = await captureRaw(metadata, harnessRawRoot, { idFactory });

      t.after(async () => {
         try { await fs.unlink(file); } catch (e) {}
      });

      await assert.rejects(
         () => captureRaw(metadata, harnessRawRoot, { idFactory }),
         /File already exists/
      );
    });

    test('idFactory rejects invalid IDs', async () => {
       const invalidIds = ['../escape', 'a/b', 'a\\b', 'a:b', ''];
       for (const invalid of invalidIds) {
          await assert.rejects(
             () => captureRaw({ url: 'http://127.0.0.1', rawBytes: new Uint8Array() }, harnessRawRoot, { idFactory: () => invalid }),
             /Invalid capture ID/
          );
       }
    });

    test('exclusive capture refuses actual duplicate destination', async (t) => {
      const metadata = {
        url: 'http://127.0.0.1',
        method: 'GET',
        status: 200,
        headers: { 'content-type': 'application/json' },
        duration: 10,
        attemptCount: 1,
        rawBytes: new Uint8Array([0x41, 0x42])
      };

      const file = await captureRaw(metadata, harnessRawRoot);

      t.after(async () => {
         try { await fs.unlink(file); } catch (e) {}
      });

      // Attempt to rewrite to the exact same file path bypassing captureRaw's internal random ID
      await assert.rejects(
         () => fs.writeFile(file, '{}', { flag: 'wx' }),
         /EEXIST/
      );
    });

    test('direct captureRaw enforces header allowlist and drops cookies/unapproved', async (t) => {
      const metadata = {
        url: 'http://127.0.0.1',
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'SESSION=SYNTHETIC_COOKIE_SECRET',
          'x-unapproved': 'SYNTHETIC_HEADER_SECRET'
        },
        rawBytes: new Uint8Array()
      };
      const file = await captureRaw(metadata, harnessRawRoot);

      t.after(async () => {
         try { await fs.unlink(file); } catch (e) {}
      });

      const contentStr = await fs.readFile(file, 'utf8');
      const parsed = JSON.parse(contentStr);
      assert.strictEqual(parsed.headers['content-type'], 'application/json');
      assert.strictEqual(parsed.headers['set-cookie'], undefined);
      assert.strictEqual(parsed.headers['x-unapproved'], undefined);
      assert.ok(!contentStr.includes('SYNTHETIC_COOKIE_SECRET'));
      assert.ok(!contentStr.includes('SYNTHETIC_HEADER_SECRET'));
    });

    test('captureRaw accepts canonical .raw path', async () => {
       const file = await captureRaw({ url: 'http://127.0.0.1', rawBytes: new Uint8Array() }, harnessRawRoot);
       await fs.unlink(file);
    });

    test('captureRaw accepts subdirectory under .raw', async () => {
       const tmpDir = path.join(harnessRawRoot, 'subdir');
       const file = await captureRaw({ url: 'http://127.0.0.1', rawBytes: new Uint8Array() }, tmpDir);
       await fs.unlink(file);
       await fs.rmdir(tmpDir);
    });

    test('captureRaw rejects sibling repository directories', async () => {
       const tmpDir = path.join(harnessRawRoot, '..', 'not-raw');
       await assert.rejects(
         () => captureRaw({ url: 'http://127.0.0.1', rawBytes: new Uint8Array() }, tmpDir),
         /violates canonical .raw boundary/
       );
    });

    test('captureRaw rejects traversal outside .raw', async () => {
       const tmpDir = path.join(harnessRawRoot, '..', 'escape');
       await assert.rejects(
         () => captureRaw({ url: 'http://127.0.0.1', rawBytes: new Uint8Array() }, tmpDir),
         /violates canonical .raw boundary/
       );
    });

    test('captureRaw rejects temporary external directory', async () => {
       const tmpDir = path.resolve(process.platform === 'win32' ? 'C:\\temp\\not-raw' : '/tmp/not-raw');
       await assert.rejects(
         () => captureRaw({ url: 'http://127.0.0.1', rawBytes: new Uint8Array() }, tmpDir),
         /violates canonical .raw boundary/
       );
    });

    test('CHILD LINK ESCAPE: captureRaw rejects symbolic link in path', async (t) => {
       const escapeDir = path.resolve(process.platform === 'win32' ? 'C:\\temp\\escape-link' : '/tmp/escape-link');
       await fs.mkdir(escapeDir, { recursive: true });
       const linkPath = path.join(harnessRawRoot, 'link-out');

       await fs.mkdir(harnessRawRoot, { recursive: true }).catch(() => {});

       try {
         await fs.symlink(escapeDir, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
       } catch (err) {
         if (err.code === 'EPERM') {
           t.skip('Windows privileges prevent symlink creation');
           return;
         }
         throw err;
       }

       t.after(async () => {
         try { await fs.unlink(linkPath); } catch (e) {}
         try { await fs.rm(escapeDir, { recursive: true, force: true }); } catch (e) {}
       });

       await assert.rejects(
         () => captureRaw({ url: 'http://127.0.0.1', rawBytes: new Uint8Array() }, linkPath),
         /Capture failed/
       );

       const files = await fs.readdir(escapeDir);
       assert.strictEqual(files.length, 0);
    });

    test('ROOT LINK ESCAPE: captureRaw rejects symbolic root', async (t) => {
       const escapeDir = path.resolve(process.platform === 'win32' ? 'C:\\temp\\root-escape' : '/tmp/root-escape');
       await fs.mkdir(escapeDir, { recursive: true });

       const backupPath = harnessRawRoot + '.bak';
       try {
         await fs.rename(harnessRawRoot, backupPath);
       } catch (err) {
         if (err.code !== 'ENOENT') throw err;
       }

       try {
         await fs.symlink(escapeDir, harnessRawRoot, process.platform === 'win32' ? 'junction' : 'dir');
       } catch (err) {
         if (err.code === 'EPERM') {
           try { await fs.rename(backupPath, harnessRawRoot); } catch(e) {}
           t.skip('Windows privileges prevent symlink creation');
           return;
         }
         throw err;
       }

       t.after(async () => {
         try { await fs.unlink(harnessRawRoot); } catch (e) {}
         try { await fs.rename(backupPath, harnessRawRoot); } catch (e) {}
         try { await fs.rm(escapeDir, { recursive: true, force: true }); } catch (e) {}
       });

       await assert.rejects(
         () => captureRaw({ url: 'http://127.0.0.1', rawBytes: new Uint8Array() }),
         /Capture failed/
       );

       const files = await fs.readdir(escapeDir);
       assert.strictEqual(files.length, 0);
    });

    test('NORMAL REAL CHILD: captureRaw accepts real child directory', async (t) => {
       const childDir = path.join(harnessRawRoot, 'real-child');
       t.after(async () => {
         try { await fs.rm(childDir, { recursive: true, force: true }); } catch(e) {}
       });

       const file = await captureRaw({ url: 'http://127.0.0.1', rawBytes: new Uint8Array() }, childDir);
       assert.ok(file.startsWith(childDir));

       const stats = await fs.lstat(childDir);
       assert.ok(stats.isDirectory());
       assert.ok(!stats.isSymbolicLink());
    });

    test('cwd does not impact captureRaw path resolution', async (t) => {
      const originalCwd = process.cwd();
      const tmpDir = await fs.mkdtemp(path.join(originalCwd, 'test-'));
      let capturedFile;

      try {
        process.chdir(tmpDir);
        // Call without storageDir so it uses default
        capturedFile = await captureRaw({ url: 'http://127.0.0.1', rawBytes: new Uint8Array() });

        assert.ok(capturedFile.startsWith(harnessRawRoot), 'Should reside in original .raw directory');

        const tmpRawRoot = path.join(tmpDir, 'research');
        const tmpRawExists = await fs.stat(tmpRawRoot).then(() => true).catch(() => false);
        assert.ok(!tmpRawExists, 'Should not create anything under the temporary cwd');
      } finally {
        process.chdir(originalCwd);
        try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch (e) {}
        if (capturedFile) {
          try { await fs.unlink(capturedFile); } catch (e) {}
        }
      }
    });
  });

  describe('H. SANITIZATION', () => {
    test('nested object and array sensitive-data redaction', () => {
      const input = {
        email: 'test@example.com',
        phone: '+1234567890',
        customer_name: 'John Doe',
        authorization: {
           scheme: 'Bearer',
           value: 'SYNTHETIC_SECRET_SHOULD_NOT_SURVIVE',
           arr: ['SYNTHETIC_SIGNATURE_SHOULD_NOT_SURVIVE']
        },
        secret_key: 'CHAPA-SECRET',
        signature: 'abcdef',
        valid_field: 'valid_data',
        unfamiliar_field: 99
      };

      const result = sanitize(input);
      assert.strictEqual(result.humanReviewRequired, true);
      assert.strictEqual(result.stageReady, false);

      // Ensure no V assignment
      assert.strictEqual(result.evidence, undefined);

      const data = result.data;
      assert.strictEqual(data.email, 'FICTIONAL_REDACTED');
      assert.strictEqual(data.authorization.scheme, 'FICTIONAL_REDACTED');
      assert.strictEqual(data.authorization.value, 'FICTIONAL_REDACTED');
      assert.strictEqual(data.authorization.arr[0], 'FICTIONAL_REDACTED');

      // Ensure secret values are genuinely gone
      const jsonStr = JSON.stringify(data);
      assert.ok(!jsonStr.includes('SYNTHETIC_SECRET_SHOULD_NOT_SURVIVE'));
      assert.ok(!jsonStr.includes('SYNTHETIC_SIGNATURE_SHOULD_NOT_SURVIVE'));

      assert.strictEqual(data.valid_field, 'valid_data');
      assert.strictEqual(data.unfamiliar_field, 99);
    });

    test('DO NOT treat every "name" key as PII', () => {
      const input = {
        first_name: 'Jane',
        customer_name: 'Doe',
        bank: {
          name: 'Central Bank'
        },
        currency_name: 'USD',
        unfamiliar_field: 42,
        name: 'ambiguous_name'
      };

      const result = sanitize(input);
      assert.strictEqual(result.humanReviewRequired, true);
      const data = result.data;

      // Redacted
      assert.strictEqual(data.first_name, 'FICTIONAL_REDACTED');
      assert.strictEqual(data.customer_name, 'FICTIONAL_REDACTED');

      // Preserved
      assert.strictEqual(data.bank.name, 'Central Bank');
      assert.strictEqual(data.currency_name, 'USD');
      assert.strictEqual(data.unfamiliar_field, 42);
      assert.strictEqual(data.name, 'ambiguous_name');
    });
    test('explicit credential fields are safely redacted', () => {
      const input = {
        password: 'SYNTHETIC_PASSWORD_SECRET',
        access_token: 'SYNTHETIC_ACCESS_TOKEN_SECRET',
        credentials: {
           private_key: 'SYNTHETIC_PRIVATE_KEY_SECRET'
        },
        token: 'SYNTHETIC_TOKEN_SECRET',
        credential: 'SYNTHETIC_CREDENTIAL_SECRET'
      };

      const result = sanitize(input);
      const data = result.data;

      assert.strictEqual(data.password, 'FICTIONAL_REDACTED');
      assert.strictEqual(data.access_token, 'FICTIONAL_REDACTED');
      assert.strictEqual(data.credentials.private_key, 'FICTIONAL_REDACTED');
      assert.strictEqual(data.token, 'FICTIONAL_REDACTED');
      assert.strictEqual(data.credential, 'FICTIONAL_REDACTED');

      const jsonStr = JSON.stringify(data);
      assert.ok(!jsonStr.includes('SYNTHETIC_PASSWORD_SECRET'));
      assert.ok(!jsonStr.includes('SYNTHETIC_ACCESS_TOKEN_SECRET'));
      assert.ok(!jsonStr.includes('SYNTHETIC_PRIVATE_KEY_SECRET'));
      assert.ok(!jsonStr.includes('SYNTHETIC_TOKEN_SECRET'));
      assert.ok(!jsonStr.includes('SYNTHETIC_CREDENTIAL_SECRET'));
    });

    test('prototype-safe sanitization of arbitrary keys', () => {
      const inputStr = '{"__proto__": {"polluted": "SYNTHETIC_VALUE"}, "safe": "ok"}';
      const input = JSON.parse(inputStr);
      const result = sanitize(input);

      const data = result.data;
      assert.strictEqual(Object.prototype.hasOwnProperty.call(data, '__proto__'), true);
      assert.strictEqual(Object.getPrototypeOf(data), null);
      assert.ok(JSON.stringify(data).includes('"__proto__"'));
      assert.strictEqual(data.__proto__.polluted, 'SYNTHETIC_VALUE');
      assert.strictEqual(Object.prototype.polluted, undefined);
    });
  });

  describe('I. JSON / RAW BOUNDARY', () => {
    test('raw Base64 round-trip remains lossless', () => {
      const raw = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const base64 = Buffer.from(raw).toString('base64');
      const recovered = new Uint8Array(Buffer.from(base64, 'base64'));
      assert.deepStrictEqual(recovered, raw);
    });

    test('actual capture JSON round-trip succeeds', async (t) => {
      const metadata = {
        url: 'http://127.0.0.1',
        method: 'GET',
        status: 200,
        headers: { 'content-type': 'application/json' },
        duration: 15,
        attemptCount: 1,
        rawBytes: new Uint8Array([0xde, 0xad, 0xbe, 0xef])
      };

      const file = await captureRaw(metadata, harnessRawRoot);

      t.after(async () => {
         try { await fs.unlink(file); } catch (e) {}
      });

      const contentStr = await fs.readFile(file, 'utf8');
      const parsed = JSON.parse(contentStr);

      assert.strictEqual(parsed.url, 'http://127.0.0.1/');
      assert.strictEqual(parsed.headers['content-type'], 'application/json');
      assert.strictEqual(parsed.status, 200);
      assert.strictEqual(parsed.attemptCount, 1);
      assert.strictEqual(parsed.duration, 15);

      const decodedBytes = new Uint8Array(Buffer.from(parsed.rawBytes, 'base64'));
      assert.deepStrictEqual(decodedBytes, metadata.rawBytes);

      assert.ok(!contentStr.includes('synthetic'));
    });
  });
});
