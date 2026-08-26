import type { ChapaInstrumentationHooks, ChapaLogger, ChapaTransport } from '../contracts.js';

export interface ChapaRetryOptions {
  readonly maxSafeRetries?: 0 | 1 | 2;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly jitter?: boolean;
}

export interface ChapaModuleOptions {
  readonly secretKey: string;
  readonly webhookSecret?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly retry?: ChapaRetryOptions;
  readonly logging?: {
    readonly enabled?: boolean;
    readonly level?: 'error' | 'warn' | 'info' | 'debug';
  };
  readonly transport?: ChapaTransport;
  readonly logger?: ChapaLogger;
  readonly hooks?: ChapaInstrumentationHooks;
  readonly allowInsecureTestUrls?: boolean;
}
