# Contributing to NestJS Chapa

Welcome! We are excited that you are interested in contributing to `@sye1321/nestjs-chapa`.
This project is an Ethiopian-led, community-maintained NestJS integration for the Chapa Payment Platform.

## Code of Conduct
Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## English as Normative Language
English is the normative language for source code, API documentation, issues, pull requests, security notices, and releases. Additional local-language guides may be added, but they do not override the technical contracts defined in English.

## Security Vulnerabilities
Security vulnerabilities must follow the private reporting process outlined in [SECURITY.md](SECURITY.md), not public issues.

## Developer Workflow and Pull Requests
Short-lived branches and pull requests are the normal public-change workflow. All public changes must be proposed via pull requests.
- **Traceability**: Public/API/provider behavior changes require specification/evidence/ADR/plan traceability as applicable.
- **Tests Required**: Behavior and code changes require appropriate tests. Documentation or governance-only changes require applicable validation, not meaningless tests. Contributors must not weaken tests simply to make a change pass.
- **Documentation Required**: If your changes impact the public API or behavior, update the documentation.
- **Changesets**: Package-impacting changes require a Changeset. Documentation and governance-only changes may be marked N/A. The package remains private; Changesets currently records and previews version intent but does not publish.

Run the provider-offline foundation checks before opening a pull request:

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
pnpm changeset:status
```

These commands may access required package registries during installation, but tests must not contact Chapa or require a Chapa credential.

## Data Privacy and Examples
- Examples should reflect Ethiopian payment use cases where relevant.
- All examples and fixtures MUST use fictional, sanitized data.
- Real account identifiers, credentials, secrets, phone numbers, PII, or real customer/payment data must never be committed.

## Trademark Usage
Chapa trademarks and brand assets may be used only with appropriate permission. The project must continue to identify itself as community-maintained.

## Uniform Standards
The same code-review, testing, security, licensing, and conduct requirements apply to every contributor, regardless of their role or affiliation.
