import { performance } from 'node:perf_hooks';

/**
 * Bounded research request executor.
 *
 * @param {string} url - Target URL
 * @param {Object} options - Fetch options (method, headers, body, timeout, fetch)
 * @returns {Object} Capture metadata including raw bytes and status
 */
export async function executeRequest(url, options = {}) {
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname;

  if (options.providerMode === true) {
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Provider guard: Protocol must be https:');
    }
    if (hostname !== 'api.chapa.co') {
      throw new Error('Provider guard: Hostname must be api.chapa.co');
    }
    if (parsedUrl.origin !== 'https://api.chapa.co') {
      throw new Error('Provider guard: Origin must be exactly https://api.chapa.co');
    }
    if (parsedUrl.port !== '' && parsedUrl.port !== '443') {
      throw new Error('Provider guard: Standard HTTPS port only');
    }
    if (parsedUrl.username || parsedUrl.password) {
      throw new Error('Provider guard: URL userinfo is rejected');
    }
    if (parsedUrl.search !== '') {
      throw new Error('Provider guard: URL query is rejected');
    }
    if (parsedUrl.hash !== '') {
      throw new Error('Provider guard: URL fragment is rejected');
    }
    const method = options.method || 'GET';
    if (method !== 'GET') {
      throw new Error('Provider guard: Method must be exactly GET');
    }
    if ('body' in options && options.body !== undefined) {
      throw new Error('Provider guard: GET requests must not carry a body');
    }
    if (typeof options.fetch !== 'function') {
      throw new Error('Provider guard: injected fetch function is explicitly required');
    }

    // Do NOT infer that Authorization is required by any Chapa endpoint.
    // This is only for synthetic local-test compatibility.
    if (options.headers) {
      let headerNames = [];
      if (options.headers instanceof Headers) {
        for (const [key] of options.headers.entries()) {
          headerNames.push(key);
        }
      } else {
        headerNames = Object.keys(options.headers);
      }
      for (const key of headerNames) {
        if (key.toLowerCase() !== 'authorization') {
          throw new Error(`Provider guard: Unapproved request header ${key}`);
        }
      }
    }

    const path = parsedUrl.pathname;
    const isBanks = path === '/v1/banks';
    const isCurrencies = path === '/v1/currency_supported';
    let isVerify = false;

    if (path.startsWith('/v1/transaction/verify/')) {
       const ref = path.substring('/v1/transaction/verify/'.length);
       if (ref.length > 0 && /^[A-Za-z0-9_-]+$/.test(ref)) {
          isVerify = true;
       }
    }

    if (!isBanks && !isCurrencies && !isVerify) {
       throw new Error('Provider guard: Pathname not in approved M0.5-B allowlist');
    }

  } else {
    // M0.5-A Loopback-only validation
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '[::1]') {
      throw new Error('Network guard: Only loopback execution is allowed in M0.5-A');
    }

    // Reject userinfo
    if (parsedUrl.username || parsedUrl.password) {
      throw new Error('Network guard: URL userinfo is rejected');
    }
  }

  const controller = new AbortController();
  const timeoutMs = options.timeout || 5000;
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const fetchOptions = {
    method: options.method || 'GET',
    headers: options.headers || {},
    redirect: 'manual',
    signal: controller.signal
  };

  if ('body' in options && options.body !== undefined) {
    fetchOptions.body = options.body;
  }

  const fetchFunc = options.fetch || globalThis.fetch;
  const startTime = performance.now();
  let attemptCount = 0;

  try {
    attemptCount = 1;
    const response = await fetchFunc(parsedUrl, fetchOptions);

    const arrayBuffer = await response.arrayBuffer();
    const rawBytes = new Uint8Array(arrayBuffer);
    const duration = performance.now() - startTime;

    // Header allowlist and name observation
    const allowedHeaders = ['content-type'];
    const capturedHeaders = {};
    const unknownHeaderNames = [];

    for (const [headerName, headerValue] of response.headers.entries()) {
      const lowerName = headerName.toLowerCase();
      if (allowedHeaders.includes(lowerName)) {
        capturedHeaders[lowerName] = headerValue;
      } else if (lowerName !== 'set-cookie' && lowerName !== 'authorization') {
        if (!unknownHeaderNames.includes(lowerName)) {
          unknownHeaderNames.push(lowerName);
        }
      }
    }

    const result = {
      status: response.status,
      headers: capturedHeaders,
      duration,
      attemptCount,
      rawBytes,
      method: fetchOptions.method,
      url: parsedUrl.origin + parsedUrl.pathname
    };

    if (options.providerMode === true && unknownHeaderNames.length > 0) {
      result.unknownHeaderNames = unknownHeaderNames.sort();
    }

    return result;
  } catch (error) {
    const kind = timedOut ? 'timeout' : 'transport';

    const customError = new Error(
      timedOut ? 'Research request timed out' : 'Research request transport failure'
    );

    customError.attemptCount = attemptCount;
    customError.duration = performance.now() - startTime;
    customError.kind = kind;

    throw customError;
  } finally {
    clearTimeout(timeoutId);
  }
}
