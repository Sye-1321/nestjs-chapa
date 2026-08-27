import type { ChapaResponseMetadata } from '../contracts.js';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface ChapaBaseRequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly correlationId?: string;
}

export type ChapaMutationRequestOptions = ChapaBaseRequestOptions;

export interface ChapaSafeReadRequestOptions extends ChapaBaseRequestOptions {
  readonly maxRetries?: 0 | 1 | 2;
}

export interface InitializePaymentInput {
  readonly amount: string;
  readonly currency: string;
  readonly txRef: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly email?: string;
  readonly phoneNumber?: string;
  readonly callbackUrl?: string;
  readonly returnUrl?: string;
  readonly customization?: {
    readonly title?: string;
    readonly description?: string;
    readonly logo?: string;
  };
  readonly meta?: Readonly<Record<string, JsonValue>>;
}

export interface InitializePaymentResult {
  readonly status: string;
  readonly message?: string;
  readonly checkoutUrl: string;
  readonly txRef: string;
  readonly response: ChapaResponseMetadata;
  readonly raw: unknown;
}

export type PaymentStatus = 'success' | 'pending' | 'failed' | 'cancelled' | 'refunded' | 'reversed' | 'unknown';

export interface VerifyPaymentResult {
  readonly status: PaymentStatus;
  readonly txRef: string;
  readonly amount?: string;
  readonly charge?: string;
  readonly currency?: string;
  readonly mode?: string;
  readonly paymentMethod?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly response: ChapaResponseMetadata;
  readonly raw: unknown;
}

export interface CancelPaymentResult {
  readonly txRef: string;
  readonly message?: string;
  readonly response: ChapaResponseMetadata;
  readonly raw: unknown;
}

export interface ChapaPayments {
  initialize(input: InitializePaymentInput, options?: ChapaMutationRequestOptions): Promise<InitializePaymentResult>;
  verify(txRef: string, options?: ChapaSafeReadRequestOptions): Promise<VerifyPaymentResult>;
  cancel(txRef: string, options?: ChapaMutationRequestOptions): Promise<CancelPaymentResult>;
}
