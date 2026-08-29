# Production integration guide

This guide covers the production responsibilities and safety boundaries around the V1 SDK. Start with the [README](../../README.md) for installation and compile-backed examples. The [technical specification](../specification/TECHNICAL_SPECIFICATION.md) remains the normative behavioral contract.

## Configuration

The package supports Node.js 22 and 24 with NestJS 10 and 11. Register configuration synchronously with `ChapaModule.register(options)`, or asynchronously with `ChapaModule.registerAsync(...)`. Async registration supports Nest's `useFactory`, `useClass`, `useExisting`, `imports`, and `inject` conventions. Inject the Nest-managed `ChapaService`; do not construct it directly.

The default Chapa API base URL is `https://api.chapa.co/v1`. A custom `baseUrl` changes where the SDK sends the configured authorization credential. Production applications must never point Chapa credentials at an untrusted host. Custom URLs are intended only for a controlled proxy or testing. Plain HTTP is rejected unless `allowInsecureTestUrls` is explicitly enabled, and even then it is limited to local loopback test hosts.

Keep `secretKey` and `webhookSecret` in server-side secret storage. Never expose either value to browser code, source control, fixtures, logs, or error messages.

## Payment lifecycle

The safe lifecycle is:

`initialize -> redirect -> callback/return -> verify -> fulfil`

Initialization creates the hosted-checkout navigation URL. A callback or return redirect is a navigation signal, not authoritative payment proof. Before fulfilment, verify the transaction and match the returned `txRef`, amount, currency, and your persisted order identity against the values expected by the application. Fulfilment must be idempotent so redirects, webhook delivery, retries, and reconciliation cannot fulfil the same order twice.

### Initialization uncertainty

The initialization `POST` is never automatically retried. A timeout or network error is an uncertain outcome; it does not mean payment failure. Retain the original `txRef`, do not blindly initialize a replacement transaction, and verify or reconcile the original reference before deciding the next application action.

### Duplicate references

The host application owns `txRef` uniqueness. V1 has no stable machine-readable duplicate-reference discriminator, so a collision remains a generic `ChapaApiError`. Do not parse English provider messages into a synthetic duplicate code, and do not automatically replay initialization.

### Cancellation

V1 supports a bodyless cancellation `PUT`. Retained Test Mode evidence established hosted-checkout link expiration for the observed scenario. It did not establish a universal provider transaction-state transition, so the SDK does not invent a `cancelled` state. Unknown references, repeat attempts, and other state distinctions remain conservative generic `ChapaApiError` failures where no stable discriminator exists. Verify before making consequential business decisions.

### Refunds

Provider refund creation and verification are outside V1. They require both a separate approved provider-evidence milestone and a corresponding technical-specification revision before they can become supported SDK behavior.

## Errors and retry semantics

All SDK errors extend `ChapaError` and expose redacted diagnostic fields. Narrow errors by responsibility:

| Error                        | Meaning                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `ChapaConfigurationError`    | Missing or unsafe SDK configuration.                                               |
| `ChapaValidationError`       | Invalid caller input rejected before transport.                                    |
| `ChapaAuthenticationError`   | Provider authentication failure.                                                   |
| `ChapaPermissionError`       | Provider permission failure.                                                       |
| `ChapaRateLimitError`        | Provider rate limit; a usable `Retry-After` controls safe-read eligibility.        |
| `ChapaApiError`              | Other provider HTTP/API failure without a safer stable discriminator.              |
| `ChapaNetworkError`          | Network failure. For initialization this is an uncertain outcome.                  |
| `ChapaTimeoutError`          | SDK timeout. For initialization this is an uncertain outcome.                      |
| `ChapaAbortError`            | Caller-requested abort; never retried.                                             |
| `ChapaResponseError`         | Successful response that cannot be parsed or lacks a required safe contract field. |
| `ChapaWebhookSignatureError` | Missing, malformed, or invalid webhook signature material.                         |

The transport performs exactly one attempt. The SDK executor alone owns bounded retry orchestration. Only safe `GET` reads are eligible, and only for a network failure, HTTP 408, 425, 500, 502, 503, 504, or HTTP 429 with a usable `Retry-After` value.

Mutating operations are never automatically retried. HTTP 400, 401, 403, 404, 409, and 422 are not retried. Parsing failures are not retried by default, and caller abort is never retried. The `retryable` field describes SDK policy; it is not permission to replay a payment mutation.

## Webhook security

Webhook verification requires the exact original request bytes. Enable Nest raw-body capture for the platform in use:

```ts
// Express
NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

// Fastify
NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
  rawBody: true
});
```

Pass `request.rawBody` and the incoming headers directly to `chapa.webhooks.verify(...)`. Do not parse, stringify, normalize, or otherwise reconstruct the payload first. See the compile-backed [Express](../../examples/express-webhook.ts) and [Fastify](../../examples/fastify-webhook.ts) examples.

`x-chapa-signature` (X1) is the required payload-integrity HMAC over the exact raw bytes. `chapa-signature` (C1) is secondary consistency only: it contains no payload bytes, cannot authorize parsing, and cannot rescue missing or invalid X1. A supplied malformed or invalid C1 fails closed. V1 does not claim unknown provider conflict or fallback semantics.

Successful signature verification authenticates the checked bytes; it does not authorize fulfilment. The host must still verify the transaction, match expected fields, authorize the business action, and process it idempotently.

## Observability

Logging and instrumentation may include only allowlisted operational context:

- operation, method, endpoint, duration, attempt count, and HTTP status;
- correlation identifier and safe reference identifiers;
- error type and stable SDK error code; and
- whether a retry occurred and its non-sensitive reason.

Never log:

- `Authorization`, secret keys, webhook secrets or signatures, tokens, or passwords;
- full configuration objects or request/response bodies;
- email, phone, account, or customer data; or
- unrestricted metadata.

Instrumentation hooks are best-effort. A hook failure does not change the payment outcome.

## Production security checklist

- [ ] Store all secrets server-side in managed secret storage.
- [ ] Use HTTPS for application and provider communication.
- [ ] Keep the default API host or audit every controlled custom `baseUrl`.
- [ ] Never expose Chapa credentials to browsers.
- [ ] Preserve exact raw webhook bytes and verify X1 before parsing.
- [ ] Verify transactions before fulfilment.
- [ ] Match expected reference, amount, currency, and order identity.
- [ ] Make fulfilment and webhook processing idempotent.
- [ ] Apply allowlisted logging and redaction.
- [ ] Persist transaction intent and own reconciliation/recovery workflows.
- [ ] Authorize every consequential application action.
- [ ] Review dependency and security automation updates promptly.
- [ ] Keep real credentials, signatures, account data, and PII out of fixtures.

## Evidence limitations and host ownership

Retained provider observations are Test Mode evidence for recorded scenarios only. They are not a universal guarantee of live-mode parity. Unknown provider behavior remains constrained, deferred, or fail-closed as defined by the frozen specification.

The host application owns authorization, secret management, redirects, persistence, `txRef` uniqueness, expected-order mapping, idempotency, fulfilment, webhook routing, reconciliation, and operational incident handling. The SDK does not provide a database, queue, workflow engine, or exactly-once guarantee.
