/** Exact request data needed for webhook authentication.
 * @public
 */
export interface VerifyWebhookInput {
  /** Original request bytes; reconstructed JSON is not cryptographically equivalent. */
  readonly rawBody: Buffer | Uint8Array;
  /** Incoming headers. Header names are matched case-insensitively. */
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  /** Per-call webhook secret override. */
  readonly secret?: string;
}

/** Common normalized fields for authenticated webhook events.
 * @public
 */
export interface ChapaWebhookEventBase {
  /** Provider event name. */
  readonly event: string;
  /** Transaction reference, when present as a usable string. */
  readonly txRef?: string;
  /** Provider status, when present as a usable string. */
  readonly status?: string;
  /** Exact amount string, when present. */
  readonly amount?: string;
  /** Currency value, when present. */
  readonly currency?: string;
  /** Authenticated, unnormalized payload object. */
  readonly raw: unknown;
}

/** Known successful-charge event. Applications must still enforce idempotency and business checks.
 * @public
 */
export interface ChapaChargeSuccessWebhookEvent extends ChapaWebhookEventBase {
  /** Discriminator for a successful charge notification. */
  readonly event: 'charge.success';
  /** Evidence-backed status for this event variant. */
  readonly status: 'success';
}

/** Authenticated event whose shape is not normalized by this SDK version.
 * @public
 */
export interface ChapaUnknownWebhookEvent extends ChapaWebhookEventBase {
  /** Provider event name retained for forward-compatible handling. */
  readonly event: string;
}

/** Webhook event variants specifically recognized by this SDK version.
 * @public
 */
export type ChapaKnownWebhookEvent = ChapaChargeSuccessWebhookEvent;
/** An authenticated known or forward-compatible unknown event.
 * @public
 */
export type ChapaWebhookEvent = ChapaKnownWebhookEvent | ChapaUnknownWebhookEvent;

/** Result of successful byte-level HMAC verification and JSON parsing.
 * @public
 */
export interface VerifiedWebhook<T extends ChapaWebhookEvent = ChapaWebhookEvent> {
  /** Primary header that authenticated the payload. */
  readonly verifiedBy: 'x-chapa-signature';
  /** Normalized authenticated event. */
  readonly event: T;
  /** Defensive copy of the authenticated request bytes. */
  readonly rawBody: Buffer;
  /** Validated primary signature. Treat it as sensitive diagnostic data. */
  readonly signature: string;
}

/** Offline webhook authentication exposed by {@link ChapaService}.
 * @public
 */
export interface ChapaWebhooks {
  /** Verifies the exact raw body before parsing; the host must preserve request bytes. */
  verify(input: VerifyWebhookInput): VerifiedWebhook;
}
