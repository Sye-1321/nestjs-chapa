import type { ChapaHttpMethod, ChapaOperation } from '../contracts.js';
import { redactSensitive, safeCause } from '../validation/redaction.js';

export interface ChapaValidationIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export interface ChapaErrorDetails {
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
}

export class ChapaError extends Error {
  readonly code: string;
  readonly operation: ChapaOperation | undefined;
  readonly method: ChapaHttpMethod | undefined;
  readonly endpoint: string | undefined;
  readonly httpStatus: number | undefined;
  readonly chapaStatus: string | undefined;
  readonly chapaMessage: string | undefined;
  readonly correlationId: string | undefined;
  readonly attempts: number | undefined;
  readonly retryable: boolean;
  readonly raw: unknown;

  constructor(details: ChapaErrorDetails) {
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

export class ChapaConfigurationError extends ChapaError {}
export class ChapaAuthenticationError extends ChapaError {}
export class ChapaPermissionError extends ChapaError {}
export class ChapaRateLimitError extends ChapaError {}
export class ChapaApiError extends ChapaError {}
export class ChapaNetworkError extends ChapaError {}
export class ChapaTimeoutError extends ChapaError {}
export class ChapaAbortError extends ChapaError {}
export class ChapaResponseError extends ChapaError {}
export class ChapaWebhookSignatureError extends ChapaError {}

export class ChapaValidationError extends ChapaError {
  readonly issues: readonly ChapaValidationIssue[];

  constructor(message: string, issues: readonly ChapaValidationIssue[], details: Omit<ChapaErrorDetails, 'code' | 'message'> = { retryable: false }) {
    super({ ...details, code: 'validation_error', message });
    this.issues = issues;
  }
}
