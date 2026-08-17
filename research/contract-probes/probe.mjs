import { fileURLToPath } from 'node:url';

export function buildBanksUrl() {
  return 'https://api.chapa.co/v1/banks';
}

export function buildCurrenciesUrl() {
  return 'https://api.chapa.co/v1/currency_supported';
}

export function buildVerifyUnknownUrl(reference) {
  // Temporary local harness safety constraint:
  // This is NOT a claim about Chapa's tx_ref grammar.
  // The real B3 reference grammar remains subject to authoritative documentation
  // review before Human Authorization.
  if (typeof reference !== 'string' || !/^[A-Za-z0-9_-]+$/.test(reference)) {
    throw new Error('Invalid reference: fails local harness safety grammar');
  }

  return `https://api.chapa.co/v1/transaction/verify/${reference}`;
}

export function buildInitializeUrl() {
  return 'https://api.chapa.co/v1/transaction/initialize';
}

export async function executeOperation(operation, payloadOrReference, options = {}) {
  if (typeof options.fetch !== 'function') {
    throw new Error('Provider execution blocked: no injected fetch function');
  }

  let url;
  let method = 'GET';
  let body;
  let txRef;

  if (operation === 'banks') {
    url = buildBanksUrl();
  } else if (operation === 'currencies') {
    url = buildCurrenciesUrl();
  } else if (operation === 'verify-unknown') {
    url = buildVerifyUnknownUrl(payloadOrReference);
  } else if (operation === 'initialize') {
    url = buildInitializeUrl();
    method = 'POST';
    if (!payloadOrReference || typeof payloadOrReference !== 'object' || Array.isArray(payloadOrReference)) {
      throw new Error('Local guard: initialize payload must be a non-null JSON object');
    }
    try {
      body = JSON.stringify(payloadOrReference);
    } catch (err) {
      throw new Error('Local guard: initialize payload stringification failed');
    }
    if (typeof payloadOrReference.tx_ref === 'string') {
      txRef = payloadOrReference.tx_ref;
    }
  } else {
    throw new Error('Unknown operation');
  }

  const { executeRequest } = await import('./lib/request.mjs');

  try {
    return await executeRequest(url, {
      ...options,
      method,
      body,
      providerMode: true,
      fetch: options.fetch
    });
  } catch (err) {
    if (operation === 'initialize' && txRef && (err.kind === 'timeout' || err.kind === 'transport')) {
      err.txRef = txRef;
    }
    throw err;
  }
}

const isMain = typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  console.log('M0.5-B Local Preparation');
  console.log('Provider execution remains blocked pending Human Authorization.');
  process.exit(1);
}
