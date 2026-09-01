# `@sye1321/nestjs-chapa`

[![npm version](https://img.shields.io/npm/v/%40sye1321%2Fnestjs-chapa)](https://www.npmjs.com/package/@sye1321/nestjs-chapa)
[![Provider-offline CI](https://github.com/Sye-1321/nestjs-chapa/actions/workflows/ci.yml/badge.svg)](https://github.com/Sye-1321/nestjs-chapa/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Sye-1321/nestjs-chapa/actions/workflows/codeql.yml/badge.svg)](https://github.com/Sye-1321/nestjs-chapa/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A community-maintained NestJS integration for Chapa. It is not an official Chapa SDK and is not endorsed by Chapa.

**Stable: v1.0.0** — tested with Node.js 22 and 24, NestJS 10 and 11, and both ESM and CommonJS consumers.

V1 provides hosted payment initialization, transaction verification, hosted checkout cancellation, banks and currencies metadata, transaction reference generation, raw-body webhook verification, typed errors, bounded retries for eligible safe reads, and synchronous or asynchronous NestJS configuration. Refunds, transfers, subaccounts, subscriptions, direct charge, virtual accounts, balances, FX, and tax features are outside V1.

For deployment safety, lifecycle recovery, retry boundaries, webhook security, and operational ownership, read the [production integration guide](docs/guides/production-integration.md).

## Install

```sh
npm install @sye1321/nestjs-chapa
```

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

Use `registerAsync` with a Nest-managed factory:

```ts
ChapaModule.registerAsync({
  useFactory: (): ChapaModuleOptions => ({
    secretKey: 'CHASECK_TEST-FICTIONAL'
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

The default API base URL is `https://api.chapa.co/v1`. A custom `baseUrl` receives your configured authorization credential: use one only for a trusted, controlled proxy or testing, and never send production credentials to an untrusted host. Insecure URLs remain explicitly limited to enabled local testing.

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

Callback and return redirects are application navigation signals, not authoritative proof of payment. They are distinct from webhooks, and the host must verify the transaction before fulfilment.

The host application owns `txRef` uniqueness. V1 has no stable duplicate-reference discriminator: a provider collision remains a generic `ChapaApiError`. Do not parse provider message text as a duplicate code or automatically replay initialization.

Cancellation expires the hosted checkout under the supported contract. It does not prove a universal cancelled transaction state. Verify before making business decisions.

Provider refund creation and verification require a separate approved evidence milestone and a corresponding technical-specification revision before they can become supported SDK behavior.

Metadata lookups are available through `chapa.metadata.listBanks()` and `listCurrencies()`. They are provider reads and are not cached. `chapa.references.generate()` is local and makes no provider request.

## Webhooks

Verification requires the exact incoming bytes. Never parse and reserialize JSON before checking the signature.

Express applications can enable Nest's raw-body support:

```ts
return NestFactory.create<NestExpressApplication>(SynchronousExampleModule, { rawBody: true });
```

Fastify uses the same Nest option:

```ts
return NestFactory.create<NestFastifyApplication>(SynchronousExampleModule, new FastifyAdapter(), {
  rawBody: true
});
```

Pass the `RawBodyRequest` bytes and incoming headers to the verifier:

```ts
const verified = this.chapa.webhooks.verify({
  rawBody: request.rawBody!,
  headers: request.headers
});
```

Signature verification authenticates bytes; it does not fulfil an order for you. Store webhook processing state, enforce idempotency, verify the transaction when appropriate, and compare the expected reference, amount, and currency.

The complete Express and Fastify raw-body examples are compile-checked in [`examples/express-webhook.ts`](examples/express-webhook.ts) and [`examples/fastify-webhook.ts`](examples/fastify-webhook.ts).

## Testing

Override the transport to keep unit tests deterministic and provider-offline:

```ts
const mockTransport: ChapaTransport = {
  send(request) {
    if (request.method !== 'GET') throw new Error(`unexpected ${request.method} request`);
    return Promise.resolve(response);
  }
};

const testingModule = ChapaModule.register({
  secretKey: 'CHASECK_TEST-FICTIONAL',
  transport: mockTransport
});
```

Generate a signature for exact fictional webhook bytes with the testing entry point:

```ts
const signature = generateChapaTestSignature({
  rawBody,
  secret: 'fictional-webhook-secret'
});
```

Both fragments are compile-backed by [`examples/testing.ts`](examples/testing.ts). Never use production credentials in fixtures.

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

Every canonical TypeScript example is compiled from [`examples/`](examples). See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the normative [technical specification](docs/specification/TECHNICAL_SPECIFICATION.md).
