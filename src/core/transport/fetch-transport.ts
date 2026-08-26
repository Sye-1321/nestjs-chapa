import type { ChapaTransport, ChapaTransportRequest, ChapaTransportResponse } from '../contracts.js';

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class FetchTransport implements ChapaTransport {
  readonly #fetch: FetchLike;

  constructor(fetchImplementation: FetchLike = globalThis.fetch) {
    if (typeof fetchImplementation !== 'function') throw new TypeError('fetch implementation must be callable');
    this.#fetch = fetchImplementation;
  }

  async send(request: ChapaTransportRequest): Promise<ChapaTransportResponse> {
    const startedAt = performance.now();
    const response = await this.#fetch(request.url, {
      method: request.method,
      headers: request.headers,
      ...(request.body !== undefined ? { body: request.body as BodyInit } : {}),
      signal: request.signal,
      redirect: 'manual'
    });
    const body = new Uint8Array(await response.arrayBuffer());
    return {
      status: response.status,
      headers: Object.freeze(Object.fromEntries(response.headers.entries())),
      body,
      durationMs: Math.max(0, performance.now() - startedAt)
    };
  }
}
