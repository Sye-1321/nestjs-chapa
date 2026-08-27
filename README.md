# nestjs-chapa

Community-maintained NestJS integration for Chapa. This project is not an official Chapa SDK and does not imply Chapa endorsement.

## Current status

M0.5 provider-contract verification and M1 repository foundation are complete. Core transport infrastructure and the specification-backed payment/reference contracts are implemented. Metadata, webhooks, Nest integration, and provider refunds are not implemented yet.

## Payment flow

Initialize a hosted payment, redirect the customer to the returned checkout URL, and verify the transaction before fulfilment. Initialization and cancellation are never retried automatically. An initialization timeout is uncertain delivery, not proof of payment failure. Verification HTTP 404 remains an API error rather than `pending`.

Cancellation expires the hosted checkout under the verified contract; it does not prove a universal cancelled transaction state. Refund operations remain excluded.

## Foundation commands

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm api:check
pnpm test:foundation
pnpm pack:check
pnpm test:consumers
pnpm test
```

Tests are provider-offline/Chapa-offline. They require no Chapa credential and must not contact Chapa endpoints.

See [CONTRIBUTING.md](CONTRIBUTING.md), [ROADMAP.md](ROADMAP.md), and the normative [technical specification](docs/specification/TECHNICAL_SPECIFICATION.md).
