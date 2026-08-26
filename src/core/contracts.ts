export type ChapaHttpMethod = 'GET' | 'POST' | 'PUT';

export type ChapaOperation =
  | 'payments.initialize'
  | 'payments.verify'
  | 'payments.cancel'
  | 'metadata.listBanks'
  | 'metadata.listCurrencies';

export interface ChapaResponseMetadata {
  readonly operation: ChapaOperation;
  readonly method: ChapaHttpMethod;
  readonly endpoint: string;
  readonly httpStatus: number;
  readonly attempts: number;
  readonly durationMs: number;
  readonly correlationId?: string;
}

export interface ChapaTransportRequest {
  readonly method: ChapaHttpMethod;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string | Uint8Array;
  readonly signal: AbortSignal;
}

export interface ChapaTransportResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Uint8Array;
  readonly durationMs: number;
}

export interface ChapaTransport {
  send(request: ChapaTransportRequest): Promise<ChapaTransportResponse>;
}

export interface ChapaLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface ChapaObservation {
  readonly operation: ChapaOperation;
  readonly method: ChapaHttpMethod;
  readonly endpoint: string;
  readonly attempts: number;
  readonly correlationId?: string;
  readonly httpStatus?: number;
  readonly durationMs?: number;
}

export interface ChapaInstrumentationHooks {
  onRequest?(event: ChapaObservation): void | Promise<void>;
  onResponse?(event: ChapaObservation): void | Promise<void>;
  onRetry?(event: ChapaObservation & { readonly reason: string }): void | Promise<void>;
}
