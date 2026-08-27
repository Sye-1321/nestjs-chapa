export interface VerifyWebhookInput {
  readonly rawBody: Buffer | Uint8Array;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly secret?: string;
}

export interface ChapaWebhookEventBase {
  readonly event: string;
  readonly txRef?: string;
  readonly status?: string;
  readonly amount?: string;
  readonly currency?: string;
  readonly raw: unknown;
}

export interface ChapaChargeSuccessWebhookEvent extends ChapaWebhookEventBase {
  readonly event: 'charge.success';
  readonly status: 'success';
}

export interface ChapaUnknownWebhookEvent extends ChapaWebhookEventBase {
  readonly event: string;
}

export type ChapaKnownWebhookEvent = ChapaChargeSuccessWebhookEvent;
export type ChapaWebhookEvent = ChapaKnownWebhookEvent | ChapaUnknownWebhookEvent;

export interface VerifiedWebhook<T extends ChapaWebhookEvent = ChapaWebhookEvent> {
  readonly verifiedBy: 'x-chapa-signature';
  readonly event: T;
  readonly rawBody: Buffer;
  readonly signature: string;
}

export interface ChapaWebhooks {
  verify(input: VerifyWebhookInput): VerifiedWebhook;
}
