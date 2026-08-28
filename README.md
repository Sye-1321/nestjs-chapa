# `@sye1321/nestjs-chapa`

A community-maintained NestJS integration for Chapa. It is not an official Chapa SDK and is not endorsed by Chapa.

The package supports Node.js 22 and 24 with NestJS 10 or 11. Refunds, transfers, subaccounts, subscriptions, FX, and tax features are outside V1.

## Install

```sh
pnpm add @sye1321/nestjs-chapa
```

## Configure NestJS

Register synchronously when configuration is already available:

```ts
import { Module } from '@nestjs/common';
import { ChapaModule } from '@sye1321/nestjs-chapa';

@Module({
  imports: [
    ChapaModule.register({
      secretKey: process.env.CHAPA_SECRET_KEY!,
      webhookSecret: process.env.CHAPA_WEBHOOK_SECRET
    })
  ]
})
export class AppModule {}
```

Use `registerAsync` with Nest configuration providers:

```ts
ChapaModule.registerAsync({
  inject: [AppConfig],
  useFactory: (config: AppConfig) => ({
    secretKey: config.chapaSecretKey,
    webhookSecret: config.chapaWebhookSecret
  })
});
```

`useClass`, `useExisting`, `imports`, and `inject` follow Nest's configurable-module conventions. Inject the framework-managed service; do not construct it directly:

```ts
@Injectable()
export class CheckoutService {
  constructor(private readonly chapa: ChapaService) {}
}
```

## Payments

The safe flow is initialize → redirect → verify → fulfil:

```ts
const initialized = await this.chapa.payments.initialize({
  amount: '125.50',
  currency: 'ETB',
  txRef: this.chapa.references.generate({ prefix: 'order' }),
  email: 'customer@example.test',
  meta: { cartId: 'fictional-cart-42' }
});

// Redirect the payer to initialized.checkoutUrl.
const payment = await this.chapa.payments.verify(initialized.txRef);
if (payment.status === 'success' && payment.amount === '125.50' && payment.currency === 'ETB') {
  // Fulfil idempotently after matching the expected order and amount.
}
```

Initialization (`POST`) and cancellation (`PUT`) are never retried. A timeout or network failure during initialization is an uncertain outcome: do not create a replacement transaction blindly. Verification is a safe `GET` and may receive bounded retries. An HTTP 404 remains a `ChapaApiError`; it is not converted to `pending`.

Cancellation expires the hosted checkout under the supported contract. It does not prove a universal cancelled transaction state. Verify before making business decisions.

Metadata lookups are available through `chapa.metadata.listBanks()` and `listCurrencies()`. They are provider reads and are not cached. `chapa.references.generate()` is local and makes no provider request.

## Webhooks

Verification requires the exact incoming bytes. Never parse and reserialize JSON before checking the signature.

Express applications can enable Nest's raw-body support:

```ts
const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
```

Fastify uses the same Nest option:

```ts
const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { rawBody: true });
```

Pass the `RawBodyRequest` bytes and incoming headers to the verifier:

```ts
const verified = this.chapa.webhooks.verify({
  rawBody: request.rawBody!,
  headers: request.headers
});
```

Signature verification authenticates bytes; it does not fulfil an order for you. Store webhook processing state, enforce idempotency, verify the transaction when appropriate, and compare the expected reference, amount, and currency.

Tests can import `generateChapaTestSignature` from `@sye1321/nestjs-chapa/testing`. Use fictional secrets only.

## Errors and advanced overrides

All SDK errors extend `ChapaError`. Catch the base class for safe fields such as `code`, `operation`, `httpStatus`, `attempts`, and `retryable`, or narrow with subclasses such as `ChapaValidationError`, `ChapaTimeoutError`, and `ChapaWebhookSignatureError`. `toJSON()` returns a redacted diagnostic object. Raw provider data is untrusted and may still contain business data; control where it is stored.

Custom transports and loggers can be supplied in module options or by overriding `CHAPA_TRANSPORT` and `CHAPA_LOGGER` in Nest tests/modules. A transport sends one attempt only and must honor the supplied `AbortSignal`; retry policy belongs to the SDK. Instrumentation hooks are best-effort and receive allowlisted context.

The host application remains responsible for secret management, HTTPS termination, authorization, redirect handling, persistence, idempotent fulfilment, reconciliation, webhook routing, and protecting logs and provider payloads. Never expose Chapa credentials to browsers or commit them to source control.

## Development

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
pnpm changeset:status
```

`pnpm verify` is the complete provider-offline maintainer gate. `pnpm test` runs the complete SDK test and packed-consumer suite from a clean checkout, while commands such as `pnpm test:payments`, `pnpm test:webhooks`, and `pnpm test:nest` provide focused feedback.

Canonical TypeScript usage is compile-checked from [`examples/sdk-usage.ts`](examples/sdk-usage.ts). See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the normative [technical specification](docs/specification/TECHNICAL_SPECIFICATION.md).
