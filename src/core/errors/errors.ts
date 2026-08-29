import type { ChapaHttpMethod, ChapaOperation } from '../contracts.js';
import { redactSensitive, safeCause } from '../validation/redaction.js';

/** One validation failure with a structured input path.
 * @public
 */
export interface ChapaValidationIssue {
  /** Path segments locating the invalid value. */
  readonly path: readonly (string | number)[];
  /** Human-readable validation failure. */
  readonly message: string;
}

/** Base class for all errors intentionally surfaced by the SDK.
 * @public
 */
export class ChapaError extends Error {
  /** Stable machine-readable error category. */
  readonly code: string;
  /** SDK operation that failed. */
  readonly operation: ChapaOperation | undefined;
  /** HTTP method used by the failed operation. */
  readonly method: ChapaHttpMethod | undefined;
  /** Relative provider endpoint without credentials. */
  readonly endpoint: string | undefined;
  /** HTTP response status, when a response was received. */
  readonly httpStatus: number | undefined;
  /** Provider envelope status, when safely available. */
  readonly chapaStatus: string | undefined;
  /** Provider message, when safely available. */
  readonly chapaMessage: string | undefined;
  /** Caller correlation identifier, when supplied. */
  readonly correlationId: string | undefined;
  /** Number of transport attempts completed. */
  readonly attempts: number | undefined;
  /** Whether the failed operation is safe for an application-controlled retry. */
  readonly retryable: boolean;
  /** Redacted provider material retained for diagnostics. */
  readonly raw: unknown;

  /**
   * SDK error construction is not a supported consumer API.
   * @internal
   */
  constructor(details: {
    readonly code: string;
    readonly message: string;
    readonly operation?: ChapaOperation;
    readonly method?: ChapaHttpMethod;
    readonly endpoint?: string;
    readonly httpStatus?: number;
    readonly chapaStatus?: string;
    readonly chapaMessage?: string;
    readonly correlationId?: string;
    readonly attempts?: number;
    readonly retryable: boolean;
    readonly cause?: unknown;
    readonly raw?: unknown;
  }) {
    super(details.message, { cause: safeCause(details.cause) });
    this.name = new.target.name;
    this.code = details.code;
    this.operation = details.operation;
    this.method = details.method;
    this.endpoint = details.endpoint;
    this.httpStatus = details.httpStatus;
    this.chapaStatus = details.chapaStatus;
    this.chapaMessage = details.chapaMessage;
    this.correlationId = details.correlationId;
    this.attempts = details.attempts;
    this.retryable = details.retryable;
    this.raw = redactSensitive(details.raw);
  }

  /** Returns a JSON-safe, redacted diagnostic representation. */
  toJSON(): Record<string, unknown> {
    return redactSensitive({
      name: this.name,
      message: this.message,
      code: this.code,
      operation: this.operation,
      method: this.method,
      endpoint: this.endpoint,
      httpStatus: this.httpStatus,
      chapaStatus: this.chapaStatus,
      chapaMessage: this.chapaMessage,
      correlationId: this.correlationId,
      attempts: this.attempts,
      retryable: this.retryable,
      raw: this.raw
    }) as Record<string, unknown>;
  }
}

/** Invalid or unsafe SDK configuration.
 * @public
 */
export class ChapaConfigurationError extends ChapaError {}
/** Provider authentication failure, normally HTTP 401.
 * @public
 */
export class ChapaAuthenticationError extends ChapaError {}
/** Provider permission failure, normally HTTP 403.
 * @public
 */
export class ChapaPermissionError extends ChapaError {}
/** Provider rate limiting, normally HTTP 429.
 * @public
 */
export class ChapaRateLimitError extends ChapaError {}
/** Provider HTTP failure not represented by a more specific subclass.
 * @public
 */
export class ChapaApiError extends ChapaError {}
/** Failure before an HTTP response was received. Mutation outcomes may be uncertain.
 * @public
 */
export class ChapaNetworkError extends ChapaError {}
/** SDK per-attempt timeout. Mutation outcomes may be uncertain.
 * @public
 */
export class ChapaTimeoutError extends ChapaError {}
/** Caller-requested cancellation.
 * @public
 */
export class ChapaAbortError extends ChapaError {}
/** Provider response that cannot satisfy the documented SDK contract.
 * @public
 */
export class ChapaResponseError extends ChapaError {}
/** Webhook authentication failure; details are intentionally non-specific.
 * @public
 */
export class ChapaWebhookSignatureError extends ChapaError {}

/** Invalid method input with one or more structured issues.
 * @public
 */
export class ChapaValidationError extends ChapaError {
  /** All validation issues detected for the input. */
  readonly issues: readonly ChapaValidationIssue[];

  /**
   * Created by SDK validation boundaries.
   * @internal
   */
  constructor(
    message: string,
    issues: readonly ChapaValidationIssue[],
    details: {
      readonly operation?: ChapaOperation;
      readonly method?: ChapaHttpMethod;
      readonly endpoint?: string;
      readonly httpStatus?: number;
      readonly chapaStatus?: string;
      readonly chapaMessage?: string;
      readonly correlationId?: string;
      readonly attempts?: number;
      readonly retryable: boolean;
      readonly cause?: unknown;
      readonly raw?: unknown;
    } = { retryable: false }
  ) {
    super({ ...details, code: 'validation_error', message });
    this.issues = issues;
  }
}
