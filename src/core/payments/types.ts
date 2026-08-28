import type { ChapaResponseMetadata } from '../contracts.js';

/** A scalar value accepted in payment metadata.
 * @public
 */
export type JsonPrimitive = string | number | boolean | null;
/** A recursively JSON-serializable payment metadata value.
 * @public
 */
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** Options shared by payment and metadata requests.
 * @public
 */
export interface ChapaBaseRequestOptions {
  /** Cancels this SDK operation. */
  readonly signal?: AbortSignal;
  /** Per-attempt timeout in milliseconds, from 1 through 300,000. */
  readonly timeoutMs?: number;
  /** Application identifier copied into safe metadata and observations, not request headers. */
  readonly correlationId?: string;
}

/** Request controls for a mutation; retry controls are intentionally unavailable.
 * @public
 */
export type ChapaMutationRequestOptions = ChapaBaseRequestOptions;

/** Request controls for an idempotent read.
 * @public
 */
export interface ChapaSafeReadRequestOptions extends ChapaBaseRequestOptions {
  /** Requested retries, capped by global configuration. */
  readonly maxRetries?: 0 | 1 | 2;
}

/** Chapa checkout initialization fields. Money is a positive decimal string with at most two fractional digits.
 * @public
 */
export interface InitializePaymentInput {
  /** Exact decimal amount string; it is never converted through JavaScript Number. */
  readonly amount: string;
  /** Uppercase currency code accepted by Chapa. */
  readonly currency: string;
  /** Unique transaction reference using 1–50 letters, digits, or underscores. */
  readonly txRef: string;
  /** Customer first name. */
  readonly firstName?: string;
  /** Customer last name. */
  readonly lastName?: string;
  /** Customer email address. */
  readonly email?: string;
  /** Ten-digit customer phone number. */
  readonly phoneNumber?: string;
  /** Server callback URL; production URLs must use HTTPS. */
  readonly callbackUrl?: string;
  /** Browser return URL after checkout. */
  readonly returnUrl?: string;
  /** Checkout presentation fields. */
  readonly customization?: {
    /** Checkout title. */
    readonly title?: string;
    /** Checkout description. */
    readonly description?: string;
    /** Checkout logo URL or provider-supported logo value. */
    readonly logo?: string;
  };
  /** Application metadata composed only of JSON-safe values. */
  readonly meta?: Readonly<Record<string, JsonValue>>;
}

/** Successful checkout initialization. Redirect users only to the returned checkout URL.
 * @public
 */
export interface InitializePaymentResult {
  /** Provider envelope status. */
  readonly status: string;
  /** Provider message, when present. */
  readonly message?: string;
  /** Chapa-hosted URL to which the application redirects the payer. */
  readonly checkoutUrl: string;
  /** Transaction reference supplied by the caller. */
  readonly txRef: string;
  /** Safe request/response metadata. */
  readonly response: ChapaResponseMetadata;
  /** Unnormalized provider payload; treat it as untrusted and potentially sensitive. */
  readonly raw: unknown;
}

/** Normalized verification status; `unknown` preserves unsupported provider values.
 * @public
 */
export type PaymentStatus = 'success' | 'pending' | 'failed' | 'cancelled' | 'refunded' | 'reversed' | 'unknown';

/** Normalized transaction verification result. Fulfil only after verifying expected business fields.
 * @public
 */
export interface VerifyPaymentResult {
  /** Normalized provider transaction status. */
  readonly status: PaymentStatus;
  /** Transaction reference supplied to verification. */
  readonly txRef: string;
  /** Exact provider amount string, when usable. */
  readonly amount?: string;
  /** Exact provider charge string, when usable. */
  readonly charge?: string;
  /** Provider currency value. */
  readonly currency?: string;
  /** Provider payment mode. */
  readonly mode?: string;
  /** Provider payment method. */
  readonly paymentMethod?: string;
  /** Provider creation timestamp. */
  readonly createdAt?: string;
  /** Provider update timestamp. */
  readonly updatedAt?: string;
  /** Safe request/response metadata. */
  readonly response: ChapaResponseMetadata;
  /** Unnormalized provider payload; treat it as untrusted and potentially sensitive. */
  readonly raw: unknown;
}

/** Checkout cancellation response. It does not establish a universal transaction state.
 * @public
 */
export interface CancelPaymentResult {
  /** Transaction reference supplied to cancellation. */
  readonly txRef: string;
  /** Provider message, when present. */
  readonly message?: string;
  /** Safe request/response metadata. */
  readonly response: ChapaResponseMetadata;
  /** Unnormalized provider payload; treat it as untrusted. */
  readonly raw: unknown;
}

/** Payment operations exposed by {@link ChapaService}.
 * @public
 */
export interface ChapaPayments {
  /** Creates a hosted checkout. A timeout is uncertain and must not be blindly retried. */
  initialize(input: InitializePaymentInput, options?: ChapaMutationRequestOptions): Promise<InitializePaymentResult>;
  /** Reads transaction state and may perform bounded safe retries. HTTP 404 is an API error. */
  verify(txRef: string, options?: ChapaSafeReadRequestOptions): Promise<VerifyPaymentResult>;
  /** Requests checkout cancellation once; the SDK never retries this PUT. */
  cancel(txRef: string, options?: ChapaMutationRequestOptions): Promise<CancelPaymentResult>;
}
