/**
 * NestJS integration for Chapa payments, verification, metadata, references, and webhooks.
 * Configure {@link ChapaModule} and inject {@link ChapaService}; network-capable internals are not public.
 *
 * @packageDocumentation
 */
export type {
  ChapaHttpMethod,
  ChapaInstrumentationHooks,
  ChapaLogger,
  ChapaObservation,
  ChapaOperation,
  ChapaResponseMetadata,
  ChapaTransport,
  ChapaTransportRequest,
  ChapaTransportResponse
} from './core/contracts.js';
export type { ChapaModuleOptions, ChapaRetryOptions } from './core/config/types.js';
export type {
  ChapaBank,
  ChapaCurrency,
  ChapaMetadata,
  ListBanksResult,
  ListCurrenciesResult
} from './core/metadata/types.js';
export type {
  CancelPaymentResult,
  ChapaBaseRequestOptions,
  ChapaMutationRequestOptions,
  ChapaPayments,
  ChapaSafeReadRequestOptions,
  InitializePaymentInput,
  InitializePaymentResult,
  JsonPrimitive,
  JsonValue,
  PaymentStatus,
  VerifyPaymentResult
} from './core/payments/types.js';
export type { ChapaReferences, GenerateReferenceOptions } from './core/references/types.js';
export type {
  ChapaChargeSuccessWebhookEvent,
  ChapaKnownWebhookEvent,
  ChapaUnknownWebhookEvent,
  ChapaWebhookEvent,
  ChapaWebhookEventBase,
  ChapaWebhooks,
  VerifiedWebhook,
  VerifyWebhookInput
} from './core/webhooks/types.js';
export { ChapaModule } from './nest/chapa-module.js';
export type { ChapaModuleAsyncOptions } from './nest/chapa-module.js';
export { ChapaService } from './nest/chapa-service.js';
export { CHAPA_LOGGER, CHAPA_TRANSPORT } from './nest/tokens.js';
export {
  ChapaAbortError,
  ChapaApiError,
  ChapaAuthenticationError,
  ChapaConfigurationError,
  ChapaError,
  ChapaNetworkError,
  ChapaPermissionError,
  ChapaRateLimitError,
  ChapaResponseError,
  ChapaTimeoutError,
  ChapaValidationError,
  ChapaWebhookSignatureError
} from './core/errors/errors.js';
export type { ChapaValidationIssue } from './core/errors/errors.js';
