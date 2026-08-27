# nestjs-chapa

Community-maintained NestJS integration for Chapa. This project is not an official Chapa SDK and does not imply Chapa endorsement.

## Current status

M0.5 provider-contract verification and M1 repository foundation are complete. The package currently ships an intentionally empty public foundation while M2 core infrastructure is implemented. Payment, metadata, and webhook APIs are not implemented yet, and provider refunds remain outside version 1.

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
