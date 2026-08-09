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

  // M0.5-A Loopback-only validation
  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '[::1]') {
    throw new Error('Network guard: Only loopback execution is allowed in M0.5-A');
  }

  // Reject userinfo
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('Network guard: URL userinfo is rejected');
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

  if (options.body) {
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

    // Header allowlist
    const allowedHeaders = ['content-type'];
    const capturedHeaders = {};
    for (const headerName of allowedHeaders) {
      if (response.headers.has(headerName)) {
        capturedHeaders[headerName] = response.headers.get(headerName);
      }
    }

    return {
      status: response.status,
      headers: capturedHeaders,
      duration,
      attemptCount,
      rawBytes,
      method: fetchOptions.method,
      url: parsedUrl.origin + parsedUrl.pathname
    };
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
