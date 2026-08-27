# nestjs-chapa

Community-maintained NestJS integration for Chapa. This project is not an official Chapa SDK and does not imply Chapa endorsement.

## Setup

```ts
@Module({
  imports: [ChapaModule.register({
    secretKey: process.env.CHAPA_SECRET_KEY!,
    webhookSecret: process.env.CHAPA_WEBHOOK_SECRET,
  })],
})
export class AppModule {}

@Injectable()
export class CheckoutService {
  constructor(private readonly chapa: ChapaService) {}
}
```

## Payment flow

Initialize a hosted payment, redirect the customer to the returned checkout URL, and verify the transaction before fulfilment. Initialization and cancellation are never retried automatically. An initialization timeout is uncertain delivery, not proof of payment failure. Verification HTTP 404 remains an API error rather than `pending`.

Cancellation expires the hosted checkout under the verified contract; it does not prove a universal cancelled transaction state. Refund operations remain excluded.

```ts
const initialized = await this.chapa.payments.initialize(input);
// Redirect the customer to initialized.checkoutUrl.
const payment = await this.chapa.payments.verify(initialized.txRef);

const banks = await this.chapa.metadata.listBanks();
const currencies = await this.chapa.metadata.listCurrencies();
const txRef = this.chapa.references.generate({ prefix: 'order' });
```

Mutations are not automatically retried. Always verify a payment before fulfilment. Refunds remain excluded from version 1.

## Webhooks

Webhooks require the exact raw request bytes; never reconstruct them from parsed JSON.

```ts
const verified = this.chapa.webhooks.verify({
  rawBody: request.rawBody!,
  headers: request.headers,
});
if (verified.event.txRef) {
  const payment = await this.chapa.payments.verify(verified.event.txRef);
  // Confirm the expected payment details before fulfilment.
}
```

For Express, enable Nest raw bodies with `NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })` and use `RawBodyRequest<Request>`. For Fastify, use the same `{ rawBody: true }` option with `NestFastifyApplication` and a `RawBodyRequest<FastifyRequest>`. The verifier API is platform-neutral.

## Development commands

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm pack:check
pnpm changeset:status
```

Use targeted commands such as `pnpm test:payments`, `pnpm test:webhooks`, or `pnpm test:nest` for faster development feedback. `pnpm test` is the normal full-suite check. Tests are provider-offline/Chapa-offline, require no Chapa credential, and must not contact Chapa endpoints.

See [CONTRIBUTING.md](CONTRIBUTING.md), [ROADMAP.md](ROADMAP.md), and the normative [technical specification](docs/specification/TECHNICAL_SPECIFICATION.md).
