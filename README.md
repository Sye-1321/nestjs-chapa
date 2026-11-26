# `@sye1321/nestjs-chapa`

[![npm version](https://img.shields.io/npm/v/@sye1321/nestjs-chapa.svg)](https://www.npmjs.com/package/@sye1321/nestjs-chapa)
[![Provider-offline CI](https://github.com/Sye-1321/nestjs-chapa/actions/workflows/ci.yml/badge.svg)](https://github.com/Sye-1321/nestjs-chapa/actions/workflows/ci.yml)

An unofficial NestJS integration for Chapa payments. Supports hosted checkout
initialization, transaction verification, cancellation, metadata, typed errors
and raw-body webhook signature verification.

Supports Node.js 22 and 24, NestJS 10 and 11, ESM and CommonJS. Not endorsed by
Chapa.

## Install

```bash
npm install @sye1321/nestjs-chapa
```

```bash
pnpm add @sye1321/nestjs-chapa
```

## Configure NestJS

Register the module when configuration is already available:

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

`ChapaModule.registerAsync()` supports Nest-managed factories, `useClass`, `useExisting`, `imports`, and dependency injection.

Inject the framework-managed service rather than constructing it directly:

```ts
import { Injectable } from '@nestjs/common';
import { ChapaService } from '@sye1321/nestjs-chapa';

@Injectable()
export class CheckoutService {
  constructor(private readonly chapa: ChapaService) {}
}
```

The default API base URL is `https://api.chapa.co/v1`.

A custom `baseUrl` receives the configured authorization credential. Use one only for a trusted proxy or controlled testing environment. Never send production credentials to an untrusted host.

## Initialize and verify a payment

```ts
import { Injectable } from '@nestjs/common';
import { ChapaService } from '@sye1321/nestjs-chapa';

@Injectable()
export class CheckoutService {
  constructor(private readonly chapa: ChapaService) {}

  async startPayment() {
    const txRef = this.chapa.references.generate({
      prefix: 'order'
    });

    const payment = await this.chapa.payments.initialize({
      amount: '125.50',
      currency: 'ETB',
      txRef,
      email: 'customer@example.test',
      meta: {
        cartId: 'fictional-cart-42'
      }
    });

    return {
      txRef,
      checkoutUrl: payment.checkoutUrl
    };
  }

  async verifyBeforeFulfilment(txRef: string) {
    const payment = await this.chapa.payments.verify(txRef);

    const matchesExpectedPayment =
      payment.status === 'success' && payment.amount === '125.50' && payment.currency === 'ETB';

    if (matchesExpectedPayment) {
      // Fulfil exactly once using application-owned persistence.
    }

    return payment;
  }
}
```

### Important payment rules

- Initialization uses `POST` and is never retried automatically.
- A timeout during initialization is an uncertain outcome. Do not blindly create another transaction.
- Verification is a safe `GET` and may receive bounded retries.
- An HTTP `404` remains a `ChapaApiError`; it is not converted into a pending payment.
- The host application owns `txRef` uniqueness.
- Do not parse provider messages to infer a stable duplicate-reference code.
- Verify the transaction before making fulfilment decisions.
- Match the expected reference, amount, and currency before fulfilling.
- Make fulfilment idempotent.
- Hosted checkout cancellation does not prove a universal cancelled transaction state. Verify before making business decisions.

Metadata reads are available through:

```ts
const banks = await this.chapa.metadata.listBanks();
const currencies = await this.chapa.metadata.listCurrencies();
```

These are provider reads and are not cached.

Transaction-reference generation is local and makes no provider request:

```ts
const txRef = this.chapa.references.generate({
  prefix: 'order'
});
```

## Verify webhooks

Webhook verification requires the exact incoming bytes. Never parse and reserialize the JSON body before verifying its signature.

Enable raw-body support when creating an Express application:

```ts
return NestFactory.create<NestExpressApplication>(SynchronousExampleModule, {
  rawBody: true
});
```

Pass the raw bytes and incoming headers to the verifier:

```ts
const verified = this.chapa.webhooks.verify({
  rawBody: request.rawBody!,
  headers: request.headers
});
```

After verification, the host application must still:

- record webhook-processing state;
- reject duplicate processing;
- verify the transaction when appropriate;
- match the expected reference, amount, and currency;
- fulfil the related business operation idempotently.

Complete compile-checked examples are available for both adapters:

- [`examples/express-webhook.ts`](examples/express-webhook.ts)
- [`examples/fastify-webhook.ts`](examples/fastify-webhook.ts)

## Errors and testing

All SDK errors extend `ChapaError`. The `toJSON()` method returns redacted
diagnostics, including error code, operation, HTTP status, attempts and
retryability. Treat raw provider responses as untrusted.

Use the [testing examples](examples/testing.ts) to inject a custom transport or
generate fictional webhook signatures without contacting Chapa.

## Scope

V1 does not include refunds, transfers, subaccounts, subscriptions, direct charge,
virtual accounts, balances, foreign exchange or tax functionality. The host
application owns order persistence, authorization, transaction-reference
uniqueness, reconciliation and idempotent fulfilment.

## Development

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
pnpm changeset:status
```

## Documentation

- [Production integration guide](docs/guides/production-integration.md)
- [Provider contract evidence](docs/contracts/README.md)
- [Technical specification](docs/specification/TECHNICAL_SPECIFICATION.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md), [security](SECURITY.md) and [support](SUPPORT.md)

## License

Licensed under the [MIT License](LICENSE).
