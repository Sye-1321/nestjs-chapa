import type { ChapaInstrumentationHooks, ChapaLogger, ChapaTransport } from '../contracts.js';

/** Retry limits for idempotent GET operations. POST and PUT operations are never retried.
 * @public
 */
export interface ChapaRetryOptions {
  /** Maximum safe-read retries, from 0 through 2. Defaults to 1. */
  readonly maxSafeRetries?: 0 | 1 | 2;
  /** Initial backoff delay in milliseconds, from 0 through 60,000. */
  readonly baseDelayMs?: number;
  /** Backoff cap in milliseconds, from 0 through 300,000. */
  readonly maxDelayMs?: number;
  /** Whether to jitter computed delays. Defaults to true. */
  readonly jitter?: boolean;
}

/** Configuration for synchronous registration and asynchronous option factories.
 * @public
 */
export interface ChapaModuleOptions {
  /** Chapa secret key; the host application owns secure loading and rotation. */
  readonly secretKey: string;
  /** Default secret used for webhook HMAC verification. */
  readonly webhookSecret?: string;
  /** Advanced API base URL override. HTTPS is required outside explicit local tests. */
  readonly baseUrl?: string;
  /** Per-attempt timeout in milliseconds, from 1 through 300,000. */
  readonly timeoutMs?: number;
  /** Safe-read retry configuration. */
  readonly retry?: ChapaRetryOptions;
  /** Sanitized SDK lifecycle logging configuration. */
  readonly logging?: {
    /** Enables SDK logging. Defaults to false. */
    readonly enabled?: boolean;
    /** Minimum emitted logging level. */
    readonly level?: 'error' | 'warn' | 'info' | 'debug';
  };
  /** Custom single-attempt transport for tests or host HTTP infrastructure. */
  readonly transport?: ChapaTransport;
  /** Custom destination for sanitized SDK observations. */
  readonly logger?: ChapaLogger;
  /** Best-effort request lifecycle hooks. */
  readonly hooks?: ChapaInstrumentationHooks;
  /** Allows HTTP only for loopback test URLs; never enable for production endpoints. */
  readonly allowInsecureTestUrls?: boolean;
}
