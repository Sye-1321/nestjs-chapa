/** HTTP methods used by supported Chapa V1 operations.
 * @public
 */
export type ChapaHttpMethod = 'GET' | 'POST' | 'PUT';

/** Stable identifiers used in errors, logs, hooks, and response metadata.
 * @public
 */
export type ChapaOperation =
  'payments.initialize' | 'payments.verify' | 'payments.cancel' | 'metadata.listBanks' | 'metadata.listCurrencies';

/** Safe metadata returned with normalized resource results. Durations are milliseconds.
 * @public
 */
export interface ChapaResponseMetadata {
  /** SDK operation that produced the response. */
  readonly operation: ChapaOperation;
  /** HTTP method sent to Chapa. */
  readonly method: ChapaHttpMethod;
  /** Relative endpoint without credentials. */
  readonly endpoint: string;
  /** HTTP response status. */
  readonly httpStatus: number;
  /** Total transport attempts, including safe-read retries. */
  readonly attempts: number;
  /** Accumulated transport and retry-delay time in milliseconds. */
  readonly durationMs: number;
  /** Caller-provided correlation identifier. */
  readonly correlationId?: string;
}

/** Request passed to an advanced custom transport.
 * @public
 */
export interface ChapaTransportRequest {
  /** SDK-selected HTTP method. */
  readonly method: ChapaHttpMethod;
  /** Fully resolved request URL. */
  readonly url: string;
  /** Request headers; custom transports must not log authorization values. */
  readonly headers: Readonly<Record<string, string>>;
  /** Serialized mutation body, when present. */
  readonly body?: string | Uint8Array;
  /** Signal enforcing caller cancellation and SDK timeout. */
  readonly signal: AbortSignal;
}

/** Response returned by an advanced custom transport.
 * @public
 */
export interface ChapaTransportResponse {
  /** HTTP response status. */
  readonly status: number;
  /** Response headers normalized to strings. */
  readonly headers: Readonly<Record<string, string>>;
  /** Exact response bytes. */
  readonly body: Uint8Array;
  /** Time spent in this attempt, in milliseconds. */
  readonly durationMs: number;
}

/** Advanced single-attempt HTTP boundary; SDK retry policy remains authoritative.
 * @public
 */
export interface ChapaTransport {
  /** Sends exactly one request attempt. */
  send(request: ChapaTransportRequest): Promise<ChapaTransportResponse>;
}

/** Destination for sanitized SDK lifecycle messages.
 * @public
 */
export interface ChapaLogger {
  /** Records debug lifecycle information. */
  debug(message: string, context?: Record<string, unknown>): void;
  /** Records informational lifecycle information. */
  info(message: string, context?: Record<string, unknown>): void;
  /** Records warnings. */
  warn(message: string, context?: Record<string, unknown>): void;
  /** Records errors. */
  error(message: string, context?: Record<string, unknown>): void;
}

/** Allowlisted lifecycle data delivered to logging and instrumentation.
 * @public
 */
export interface ChapaObservation {
  /** Observed SDK operation. */
  readonly operation: ChapaOperation;
  /** Observed HTTP method. */
  readonly method: ChapaHttpMethod;
  /** Relative endpoint without credentials. */
  readonly endpoint: string;
  /** Attempt number at the observation point. */
  readonly attempts: number;
  /** Caller correlation identifier. */
  readonly correlationId?: string;
  /** Response status, when available. */
  readonly httpStatus?: number;
  /** Accumulated duration in milliseconds, when available. */
  readonly durationMs?: number;
}

/** Best-effort callbacks whose failures never change request outcomes.
 * @public
 */
export interface ChapaInstrumentationHooks {
  /** Runs immediately before a transport attempt. */
  onRequest?(event: ChapaObservation): void | Promise<void>;
  /** Runs after a successful response. */
  onResponse?(event: ChapaObservation): void | Promise<void>;
  /** Runs before an eligible safe-read retry; mutations are never retried. */
  onRetry?(event: ChapaObservation & { readonly reason: string }): void | Promise<void>;
}
