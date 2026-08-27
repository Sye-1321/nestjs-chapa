# Agent Execution Policy

- Implement the requested change directly. Do not create plans, ledgers, receipts, status documents, or ADRs unless the maintainer explicitly asks for them.
- Read the relevant frozen V1 contract before changing provider behavior. Never guess unresolved Chapa behavior.
- Never make Chapa requests or use real credentials unless the maintainer explicitly authorizes them.
- Prefer simple production code over unnecessary abstractions.
- Tests must protect meaningful behavior, regressions, compatibility, or security boundaries. Do not add tests merely to increase test count, and do not weaken tests to make code pass.
- Keep `src/core` independent from NestJS. Keep the internal client, executor, and schemas private.
- Do not add V1-excluded features, including refunds.
- Run verification relevant to the change and report only commands actually executed.
- Do not push directly to protected `main`.
