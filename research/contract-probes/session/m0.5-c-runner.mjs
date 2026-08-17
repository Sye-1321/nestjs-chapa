import readline from 'node:readline';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { executeOperation } from '../probe.mjs';
import { captureRaw } from '../lib/capture.mjs';
import { sanitize } from '../lib/sanitize.mjs';
import { fileURLToPath } from 'node:url';

function createTxRef(prefix) {
  const hex = crypto.randomBytes(8).toString('hex');
  const ref = `${prefix}${hex}`;
  return ref.substring(0, 50);
}

function summarizeMessage(message) {
  if (message === null || message === undefined) return 'null/undefined';
  if (typeof message === 'string') {
    const safeStrings = [
      'Hosted Link',
      'Payment details fetched successfully',
      'Transaction successfully fetched',
      'success',
      'failed'
    ];
    if (safeStrings.includes(message)) {
      return `"${message}"`;
    }
    return `[String: length ${message.length}]`;
  }

  if (typeof message === 'object') {
    const keys = Object.keys(message);
    const summary = {};
    const allowedKeys = ['amount', 'currency', 'tx_ref', 'email', 'first_name', 'last_name', 'phone_number'];

    for (const k of keys) {
      const displayKey = allowedKeys.includes(k) ? k : '[REDACTED_KEY]';
      const val = message[k];
      if (Array.isArray(val)) {
        const safeArray = val.map(v => {
          if (typeof v === 'string' && v.startsWith('validation.')) return v;
          if (typeof v === 'string' && v === 'The tx ref must not exceed 50 characters.') return v;
          return '[Unrecognized validation string]';
        });
        summary[displayKey] = safeArray;
      } else {
        summary[displayKey] = `[Type: ${typeof val}]`;
      }
    }
    return JSON.stringify(summary);
  }
  return `[Type: ${typeof message}]`;
}

export async function runInteractiveSession({
  stdin = process.stdin,
  stdout = process.stdout,
  fetchFunc = globalThis.fetch,
  env = process.env
} = {}) {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  const question = (query) => new Promise(resolve => rl.question(query, resolve));
  const print = (msg) => stdout.write(msg + '\n');

  try {
    const modeConfirmation = await question('Are you in TEST MODE? Type "TEST MODE" to confirm: ');
    if (modeConfirmation.trim() !== 'TEST MODE') {
      print('Aborted: TEST MODE not confirmed.');
      return;
    }

    const scenarios = [
      {
        id: 'C11-AMOUNT-EXCESSIVE-SCALE-01',
        name: 'amount excessive scale (1.12345678901234567890)',
        type: 'initialize',
        payloadFactory: async () => ({
          amount: "1.12345678901234567890",
          currency: "ETB",
          tx_ref: createTxRef('m05c_scale_')
        })
      },
      {
        id: 'AMOUNT-LEADING-ZERO-01',
        name: 'amount leading-zero bounded probe',
        type: 'initialize',
        payloadFactory: async () => ({
          amount: "00010.50",
          currency: "ETB",
          tx_ref: createTxRef('m05c_lz_')
        })
      },
      {
        id: 'AMOUNT-LARGE-DIGIT-01',
        name: 'bounded large-digit amount probe',
        type: 'initialize',
        payloadFactory: async () => ({
          amount: "999999999.99",
          currency: "ETB",
          tx_ref: createTxRef('m05c_large_')
        })
      },
      {
        id: 'DUPLICATE-INITIALIZATION',
        name: 'duplicate initialization probe (one-time)',
        type: 'initialize',
        payloadFactory: async () => {
          return {
            amount: "10",
            currency: "ETB",
            tx_ref: "m05c_init_20260817_minimal_a2968f3244ab436c"
          };
        }
      },
      {
        id: 'VERIFY-UNKNOWN',
        name: 'provider-valid-style unknown verification',
        type: 'verify-unknown',
        payloadFactory: async () => {
          return createTxRef('m05c_unknown_');
        }
      }
    ];

    while (true) {
      print('\n=======================================');
      print('Available M0.5-C Scenarios:');
      scenarios.forEach((s, idx) => {
        print(`  ${idx + 1}. [${s.id}] ${s.name}`);
      });
      print('  0. Exit');
      print('=======================================');

      const choice = await question('Select scenario (0 to exit): ');
      const idx = parseInt(choice.trim(), 10) - 1;

      if (choice.trim() === '0') {
        break;
      }

      const scenario = scenarios[idx];
      if (!scenario) {
        print('Invalid selection.');
        continue;
      }

      print(`\nPreparing scenario: ${scenario.id}`);
      let payloadOrRef;
      try {
        payloadOrRef = await scenario.payloadFactory();
      } catch (err) {
        print(err.message);
        continue;
      }

      let urlStr, methodStr, bodyStr, txRefStr, txRefLen;
      if (scenario.type === 'initialize') {
        urlStr = 'https://api.chapa.co/v1/transaction/initialize';
        methodStr = 'POST';
        const sanitizedPayload = sanitize(payloadOrRef).data;
        bodyStr = JSON.stringify(sanitizedPayload, null, 2);
        txRefStr = payloadOrRef.tx_ref;
        txRefLen = String(txRefStr).length;
      } else {
        urlStr = `https://api.chapa.co/v1/transaction/verify/${payloadOrRef}`;
        methodStr = 'GET';
        bodyStr = 'no body';
        txRefStr = payloadOrRef;
        txRefLen = String(txRefStr).length;
      }

      let credState = 'MISSING';
      let secret = null;
      if (env.CHAPA_SECRET_KEY && env.CHAPA_SECRET_KEY.trim() !== '') {
        credState = 'PRESENT';
        secret = env.CHAPA_SECRET_KEY.trim();
      }

      print('\n--- HUMAN AUTHORIZATION GATE ---');
      print(`Operation ID: ${scenario.id}`);
      print(`Environment: TEST MODE`);
      print(`HTTP Method: ${methodStr}`);
      print(`Exact URL: ${urlStr}`);
      print(`Sanitized exact request body:\n${bodyStr}`);
      print(`Exact tx_ref/reference: ${txRefStr}`);
      print(`tx_ref length: ${txRefLen}`);
      print(`Timeout: 5000ms`);
      print(`Expected attemptCount: 1`);
      print(`Automatic retries: 0`);
      print(`Redirect behavior: manual`);
      print(`Credential state: ${credState}`);
      print('----------------------------------');

      if (credState === 'MISSING') {
        print('Aborted: Credential is MISSING from environment.');
        continue;
      }

      const authInput = await question('Type EXACTLY "AUTHORIZE" to perform this single request: ');
      if (authInput !== 'AUTHORIZE') {
        print('Authorization denied. Canceling request.');
        continue;
      }

      if (scenario.id === 'DUPLICATE-INITIALIZATION') {
        const rawDir = path.join(fileURLToPath(import.meta.url), '../../.raw');
        const duplicateGuardPath = path.join(rawDir, 'm05c_duplicate_guard');
        try {
          if (!fs.existsSync(rawDir)) {
            fs.mkdirSync(rawDir, { recursive: true });
          }
          fs.writeFileSync(duplicateGuardPath, '', { flag: 'wx' });
        } catch (e) {
          print('Aborted: Persistent duplicate guard already exists or creation failed.');
          continue;
        }
      }

      print('\nExecuting request...');
      const headers = {
        'Authorization': `Bearer ${secret}`
      };
      if (scenario.type === 'initialize') {
        headers['Content-Type'] = 'application/json';
      }

      const fetchOptions = {
        fetch: fetchFunc,
        headers,
        timeout: 5000
      };

      try {
        const result = await executeOperation(scenario.type, payloadOrRef, fetchOptions);

        await captureRaw(result, null, { idFactory: () => `${scenario.id.toLowerCase()}-${txRefStr}` });
        print(`Raw evidence captured safely to local boundary.`);

        print('\n--- SANITIZED SUMMARY ---');
        print(`HTTP Status: ${result.status}`);
        print(`Method: ${result.method}`);
        const parsedUrl = new URL(result.url);
        print(`Origin + Pathname: ${parsedUrl.origin + parsedUrl.pathname}`);
        print(`Content Type: ${result.headers['content-type'] || 'none'}`);
        print(`Response byte length: ${result.rawBytes.length}`);
        print(`AttemptCount: ${result.attemptCount}`);
        print(`Submitted tx_ref: ${txRefStr}`);

        let jsonBody = null;
        try {
          const bodyDecoded = new TextDecoder().decode(result.rawBytes);
          jsonBody = JSON.parse(bodyDecoded);
        } catch(e) {}

        if (jsonBody) {
          const topLevelKeys = Object.keys(jsonBody).join(', ');
          print(`Top-level keys: ${topLevelKeys}`);
          print(`Top-level status: ${jsonBody.status || 'undefined'}`);

          if ('message' in jsonBody) {
            print(`Safe message info: ${summarizeMessage(jsonBody.message)}`);
          }
          if (jsonBody.data) {
            const dataKeys = typeof jsonBody.data === 'object' && jsonBody.data !== null ? Object.keys(jsonBody.data).join(', ') : 'null';
            print(`Data keys: ${dataKeys}`);
            if (typeof jsonBody.data === 'object' && jsonBody.data !== null && 'checkout_url' in jsonBody.data) {
              print(`checkoutUrlPresent: true`);
            }
          }
        }
        print('-------------------------\n');

      } catch (err) {
        if (err.kind === 'timeout' || err.kind === 'transport') {
          if (scenario.type === 'initialize') {
            print('\n--- UNCERTAIN INITIALIZATION SAFETY ---');
            print(`AttemptCount: ${err.attemptCount}`);
            print(`Exact tx_ref preserved: ${err.txRef}`);
            print(`Error kind: ${err.kind}`);
            print(`Do not replay POST. Do not substitute tx_ref.`);
            print(`Separate verification authorization required.`);
            print('---------------------------------------');
          } else {
            print('\n--- UNCERTAIN VERIFICATION SAFETY ---');
            print(`AttemptCount: ${err.attemptCount}`);
            print(`Exact synthetic verification reference preserved: ${txRefStr}`);
            print(`Error kind: ${err.kind}`);
            print(`No automatic retry.`);
            print('-------------------------------------');
          }
        } else {
          print(`\nError: ${err.message}`);
        }
      }
    }
  } finally {
    rl.close();
  }
}

const isMain = typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runInteractiveSession().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
