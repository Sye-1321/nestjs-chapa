# NestJS Chapa SDK

## Full Technical Specification & Implementation Contract

**Version:** 1.0 - M7 Stable Release Freeze
**Status:** APPROVED V1 CONTRACT FREEZE — M0.5 AND M1-M6 COMPLETE; M7 STABLE FREEZE PREPARED, PUBLICATION PENDING
**Project owner & maintainer:** Sye (GitHub: `Sye-1321`)  
**Repository:** `Sye-1321/nestjs-chapa`  
**npm package:** `@sye1321/nestjs-chapa`  
**Date:** 1 September 2026
**Execution gate:** M7 stable `1.0.0` publication after release-freeze review, merge, and green CI

A community-maintained, Ethiopian-led NestJS integration for the Chapa Payment Platform. Designed with framework-independent core architecture, evidence-driven contract boundaries, and zero implicit network retries.

---

## Document Control

| Field | Value |
|---|---|
| Document title | NestJS Chapa - Technical Specification |
| Version | 1.0 |
| Status | APPROVED V1 CONTRACT FREEZE — M0.5 and M1-M6 complete; M7 stable freeze prepared and publication pending |
| Primary owner | Sye (GitHub: `Sye-1321`) |
| Implementation target | Repository `Sye-1321/nestjs-chapa` and npm package `@sye1321/nestjs-chapa` |
| Approval gate | M0.5 contract freeze and M1-M6 are complete; M7 remains incomplete until the protected stable npm and GitHub publication succeeds. |
| Source-of-truth order | Official Chapa documentation; maintainer-adjudicated sanitized Test Mode evidence; official NestJS, Node.js, and npm documentation. |
| Last updated | 1 September 2026 |

### Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 Final | 6 Aug 2026 | Approved pre-implementation specification. Confirms product scope, repository and package identity, M0.5 contract verification, public API, governance, testing, release controls, and acceptance criteria. |
| 1.0 M0.5 Contract Freeze | 25 Aug 2026 | Applied the maintainer-adjudicated M0.5 contract freeze: narrowed version-1 scope, synchronized evidence-backed normalization and webhook security rules, recorded explicit deferrals, and retained F7 as the gate before M1. |
| 1.0 M6 Lifecycle Sync | 29 Aug 2026 | Synchronized lifecycle metadata after completion of M0.5 and M1-M5 for current M6 release-candidate hardening; no frozen behavioral contract changed. |
| 1.0 M7 Stable Freeze | 1 Sep 2026 | Recorded completion of M6 and preparation of the `1.0.0` stable freeze while retaining review, merge, green CI, and publication as remaining M7 gates; no frozen behavioral contract changed. |

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Purpose and Product Goals](#2-purpose-and-product-goals)
- [3. Source Basis and Authority](#3-source-basis-and-authority)
- [4. Product Scope](#4-product-scope)
- [5. Repository and Package Strategy](#5-repository-and-package-strategy)
- [6. Runtime and Compatibility](#6-runtime-and-compatibility)
- [7. Architecture](#7-architecture)
- [8. Public API Contract](#8-public-api-contract)
- [9. Configuration Contract](#9-configuration-contract)
- [10. HTTP Transport and Reliability](#10-http-transport-and-reliability)
- [11. Validation and Data Modelling](#11-validation-and-data-modelling)
- [12. Error Model](#12-error-model)
- [13. Webhook Security and Processing](#13-webhook-security-and-processing)
- [14. Logging and Observability](#14-logging-and-observability)
- [15. Security Requirements](#15-security-requirements)
- [16. Testing Strategy](#16-testing-strategy)
- [17. Build, Packaging and Release](#17-build-packaging-and-release)
- [18. Documentation Requirements](#18-documentation-requirements)
- [19. Repository Structure](#19-repository-structure)
- [20. Delivery Milestones](#20-delivery-milestones)
- [21. Acceptance Criteria](#21-acceptance-criteria)
- [22. Risks and Open Questions](#22-risks-and-open-questions)
- [23. Architecture Decision Record](#23-architecture-decision-record)
- [Appendix A - Endpoint Evidence Matrix](#appendix-a---endpoint-evidence-matrix)
- [Appendix B - Known Statuses](#appendix-b---known-statuses)
- [Appendix C - Recommended Application Flow](#appendix-c---recommended-application-flow)
- [Appendix D - References](#appendix-d---references)
- [Appendix E - Approval Checklist](#appendix-e---approval-checklist)
- [Appendix F - Contract Fixture Manifest](#appendix-f---contract-fixture-manifest)
- [Appendix G - Pre-implementation Decision Summary](#appendix-g---pre-implementation-decision-summary)

---

# 1. Executive Summary

This specification defines the open-source Chapa integration for NestJS published as `@sye1321/nestjs-chapa` from the `Sye-1321/nestjs-chapa` repository. It establishes the product boundary, public API, architecture, reliability policy, security requirements, package structure, provider-evidence gate, testing obligations, release controls, and acceptance criteria.

The package exposes a NestJS-native API over an internal framework-independent core. The core isolates transport, validation, and cryptography for testing; version 1 does not support it as a separate Node.js product. Version 1.0 covers hosted-payment initialization, payment verification, hosted-checkout cancellation, bank and supported-currency metadata, transaction references, and webhook verification. Provider refund creation and verification are deferred pending a separate evidence milestone and specification revision.

Safety takes precedence over convenience. Mutating calls do not retry automatically. Webhook verification uses exact raw bytes. Databases, queues, order state, fulfilment, deduplication, reconciliation, and business workflows remain host-application responsibilities.

> **Primary Engineering Decision**
>
> Implement the package according to this specification. Official provider documentation and verified Chapa behaviour govern the contract. Payment safety takes precedence over convenience.

## 1.1 Product Positioning

The package is a community-maintained NestJS integration. Documentation, naming, badges, and package metadata must not imply official Chapa endorsement without written authorization.

## 1.2 Definition of Success

- **Correctness.** Public contracts are derived from current Chapa documentation and verified provider behaviour.
- **NestJS developer experience.** Synchronous and asynchronous module registration, dependency injection, provider overrides, testability, and clear examples.
- **Payment safety.** No unsafe automatic retries, no false idempotency claims, and clear separation between payment status and transport failure.
- **Security.** Raw-body webhook verification, timing-safe comparison, secret redaction, controlled logging, and secure release provenance.
- **Maintainability.** Small resource clients, minimal runtime dependencies, stable exports, semantic versioning, CI, changelogs, and version-upgrade guidance.

# 2. Purpose and Product Goals

## 2.1 Purpose

This document is the implementation contract for `Sye-1321/nestjs-chapa`. It fixes the product boundary, public API, architecture, reliability policy, security requirements, package structure, M0.5 evidence gate, testing obligations, release controls, and acceptance criteria. M0.5 and M1-M6 are complete; the M7 `1.0.0` stable-freeze candidate is prepared, and acceptance and stable publication remain pending.

## 2.2 Goals

1. Provide a clear, idiomatic NestJS developer experience for Chapa's documented payment APIs.
2. Use a framework-independent core so the HTTP and security logic can be tested without bootstrapping NestJS.
3. Expose current Chapa operations through strict TypeScript contracts plus runtime validation.
4. Make network uncertainty explicit and prevent duplicate side effects caused by generic retries.
5. Provide secure, platform-aware webhook utilities for both Express and Fastify Nest applications.
6. Publish a trustworthy open-source npm package with reproducible CI, provenance, release notes, and a support policy.
7. Classify every Chapa-dependent contract as documented, Test Mode verified, or unresolved before freezing public types.

## 2.3 Non-goals

- Storing payments, orders, customers, refunds, webhook events, or audit records.
- Owning Redis, BullMQ, database entities, migrations, cron jobs, reconciliation jobs, or outbox/inbox infrastructure.
- Providing a complete commerce workflow, fulfilment engine, subscription system, tax engine, or accounting system.
- Guaranteeing exactly-once payment or webhook processing. Exactly-once behaviour requires application persistence and idempotent business logic.
- Wrapping every Chapa endpoint in version 1.0.
- Publishing or supporting a universal framework-agnostic Node.js SDK in version 1. The internal core is not a separate public product.

# 3. Source Basis and Authority

Where sources conflict, the following authority order applies. Lower-ranked sources may inform design but cannot override higher-ranked sources.

| Priority | Source | Use |
|---:|---|---|
| 1 | Current official Chapa developer documentation | Endpoint, authentication, request and response semantics, webhook behaviour, supported statuses. |
| 2 | Maintainer-adjudicated sanitized Chapa Test Mode fixtures and provider observations | Resolve ambiguous or incomplete documentation within their exact recorded boundary. Every deviation must be documented. |
| 3 | Official NestJS, Node.js and npm documentation | Framework integration, runtime support, package publication and security. |

## 3.1 Contract Evidence Classification

Every Chapa-dependent contract carries one of the following evidence states. Architecture decisions are tracked separately because they do not require Chapa confirmation.

| Code | State | Meaning and release rule |
|---|---|---|
| `A` | Accepted architecture decision | Internal design decision. It is normative for implementation but does not claim Chapa behaviour. |
| `D` | Documented | Supported by current official documentation. The method/path may be implemented, but ambiguous shapes remain tolerant and provisional. |
| `V` | Test Mode verified | Confirmed either by a human-reviewed sanitized Test Mode fixture or by a human-reviewed sanitized provider observation with explicit maintainer adjudication. Synthetic/local tests and plans alone cannot create V. V is narrow to its recorded scenario and does not imply live-mode parity. |
| `U` | Unresolved or provisional | Insufficient evidence. The operation or field is deferred, gated, or exposed only as raw data until resolved. |

### Requirement Notation

`REQ-*` identifiers are stable references for code, tests, pull requests, and release evidence. **MUST** marks a release-blocking requirement; **SHOULD** requires a documented exception; **MAY** is optional. Evidence tags use `A` (architecture), `D` (documented), `V` (Test Mode verified), and `U` (unresolved).

> **Public Contract Freeze Rule**
>
> A Chapa-dependent field may be mandatory in a normalized result only when official documentation is clear or maintainer-adjudicated M0.5 evidence supports the exact invariant. U-state behaviour cannot ship as a promised version 1.0 contract.

## 3.2 Known Documentation Ambiguities

- The documentation describes two webhook headers ambiguously. M0.5 reproduced X1 as the required raw-payload HMAC and C1 as secret-on-secret; C1 is secondary only and never a payload verifier. Provider conflict semantics remain U.
- Some endpoint pages omit complete response schemas or use inconsistent field names such as `tx_ref`, `trx_ref`, `reference`, `ref_id`, and `payment_reference`.
- The documented supported-currency response example appears internally inconsistent: the prose refers to currency codes while the example separates numeric codes and names.
- Some status/error documentation may represent business states through non-2xx HTTP responses. The client must not collapse these into a single payment status.
- The public documentation does not define duplicate `tx_ref` collision semantics or a stable machine-readable duplicate-reference error.
- Test-mode and live-mode parity is not assumed. M0.5 observations establish test-mode behaviour; release notes must disclose any live-mode evidence limitations.

> **Evidence Requirement**
>
> When documentation is incomplete, the implementation must preserve unknown fields and fail with a typed response-contract error only when required safety-critical fields are unusable. It must not invent values or silently coerce ambiguous data.

# 4. Product Scope

## 4.1 Version 1.0 Operations

| Resource | Operation | Official endpoint | Automatic retry |
|---|---|---|---|
| Payments | Initialize hosted payment | `POST /v1/transaction/initialize` | No |
| Payments | Verify payment | `GET /v1/transaction/verify/{tx_ref}` | One eligible retry |
| Payments | Cancel active transaction | `PUT /v1/transaction/cancel/{tx_ref}` | No |
| Metadata | List banks | `GET /v1/banks` | One eligible retry |
| Metadata | List supported currencies | `GET /v1/currency_supported` | One eligible retry |
| Webhooks | Verify and parse event | Local cryptographic operation | Not applicable |
| Utilities | Generate transaction reference | Local operation | Not applicable |

## 4.2 Version 1.1 Candidates

- List transactions with documented date, currency, and status filters.
- Retrieve a transaction event timeline by Chapa reference identifier.
- Create subaccounts and initialize split payments.
- Typed pagination once Chapa response pagination is captured and verified.

## 4.3 Deferred Specialized Domains

- Provider refund creation and verification, including target identity, eligibility, request/meta encoding, result shapes, status lifecycle, and verification contract.
- Transfers, bulk transfers, and transfer approval callbacks.
- Direct charges and direct-charge authorization.
- Balance and currency-swap operations.
- Virtual accounts and virtual-account credit history.
- Testing-card and testing-mobile-number catalogues.

These domains are deferred because they have unresolved evidence or distinct security, approval, balance, operational, or payment-method-specific concerns. Refunds require a separately approved provider-evidence milestone and specification revision; no future release number is assigned here. Other domains may be added through their own approved scope and evidence changes.

## 4.4 Explicitly Excluded Operations

Version 1 excludes provider refund create/verify, a separate mobile-initialize method, and every unsupported or undocumented operation. None enters the public API without an approved evidence milestone and specification revision.

## 4.5 Public Product Boundary

Version 1 is a NestJS package. Its root export exposes `ChapaModule`, `ChapaService`, public resource contracts, errors, configuration types, and supported injection tokens. The internal `ChapaClient` and request executor are not public entry points. A future framework-independent package requires a separate ADR, package identity, documentation set, and compatibility matrix.

# 5. Repository and Package Strategy

## 5.1 Repository

The repository is `Sye-1321/nestjs-chapa`. Governance, specification, contract evidence, and packaging foundations must be committed before production payment code.

## 5.2 Package Naming

The npm package name is `@sye1321/nestjs-chapa`. The package must never use `@chapa/*` or wording that implies Chapa ownership without written authorization. The repository and package remain explicitly NestJS-focused in version 1.

## 5.3 Licence and Governance

- **[REQ-GOV-01]** MIT licence.
- **[REQ-GOV-02]** `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `GOVERNANCE.md`, `MAINTAINERS.md`, `ROADMAP.md`, `CHANGELOG.md`, and `SUPPORT.md`.
- **[REQ-GOV-03]** Issue templates for bugs, documentation, feature requests, and security redirection.
- **[REQ-GOV-04]** Pull-request template requiring tests, public API impact, documentation impact, and changeset classification.
- **[REQ-GOV-05]** Branch protection and required CI before merge.

## 5.4 Ethiopian Open-Source Stewardship

- **[REQ-GOV-06]** The project is Ethiopian-led and open to contributors worldwide. Governance, review standards, and release decisions must be public and documented.
- **[REQ-GOV-07]** English is the normative language for source code, API documentation, issues, pull requests, security notices, and releases. Additional local-language guides may be added without creating conflicting technical contracts.
- **[REQ-GOV-08]** Examples should reflect Ethiopian payment use cases while using fictional, sanitized data only.
- **[REQ-GOV-09]** The same code-review, testing, security, licensing, and conduct requirements apply to every contributor.
- **[REQ-GOV-10]** Chapa trademarks and brand assets may be used only with appropriate permission. The project must continue to identify itself as community-maintained.
- **[REQ-GOV-11]** `GOVERNANCE.md` and `MAINTAINERS.md` must define decision authority, release responsibility, succession, and conflict resolution.

# 6. Runtime and Compatibility

## 6.1 Node.js

**[REQ-COMP-01]** Version 1.0 supports Node.js 22 and Node.js 24 only. Node 22 is Maintenance LTS and Node 24 is Active LTS as of 5 August 2026. The package engines range is `^22.0.0 || ^24.0.0` so unsupported odd-numbered or untested future majors are not implied. A later LTS major is added only after consumer-matrix validation.

```json
{
  "engines": {
    "node": "^22.0.0 || ^24.0.0"
  }
}
```

## 6.2 NestJS

**[REQ-COMP-02]** The initial peer compatibility target is NestJS 10 and 11. Compatibility must be verified through package-consumer test applications, not inferred only from TypeScript compilation.

## 6.3 TypeScript and Module Formats

- **[REQ-COMP-03]** TypeScript 5.7 or later for development; emitted declarations must remain consumable by supported Nest applications.
- **[REQ-COMP-04]** ESM and CommonJS exports with a correct package exports map.
- **[REQ-COMP-05]** No browser bundle. This is a server-side payment package.
- **[REQ-COMP-06]** No dependency on Express or Fastify in the core package surface.

## 6.4 Peer and Runtime Dependencies

| Dependency class | Policy |
|---|---|
| Peer dependencies | `@nestjs/common` and `@nestjs/core`. `reflect-metadata` only if required by the final build contract. |
| Runtime dependencies | Zod for request/response validation. All other additions require an ADR and bundle-impact review. |
| Development dependencies | Testing, linting, build, documentation, Changesets, and CI tooling. |
| Forbidden runtime dependencies | Database clients, ORMs, Redis, BullMQ, event emitters, web frameworks, and full application platforms. |

## 6.5 Runtime Validation Dependency Policy

**[REQ-COMP-07]** Zod is a normal runtime dependency, not a peer dependency. It remains external to the generated JavaScript bundle, is not re-exported, and must not appear in public method signatures or public error issue types. Consumer applications may use their own Zod version independently. Package-consumer tests must prove correct ESM and CommonJS resolution.

# 7. Architecture

## 7.1 Architectural Overview

```text
Nest application
      |
      v
ChapaModule (configuration + DI)
      |
      v
ChapaService facade
      |-- payments
      |-- metadata
      |-- webhooks
      `-- references
      |
      v
Internal framework-independent ChapaClient
      |
      v
Operation-aware ChapaRequestExecutor
      |
      v
ChapaTransport interface (one network attempt)
      |
      v
Default FetchTransport (Node.js)
      |
      v
https://api.chapa.co/v1
```

## 7.2 Core Principles

- **[REQ-ARCH-01]** Framework-independent core. The core client imports no NestJS modules or HTTP exceptions.
- **[REQ-ARCH-02]** Resource-oriented API. Payments, metadata, webhooks, and reference utilities are separate clients rather than one growing monolithic service. Provider refunds are not an active version-1 resource.
- **[REQ-ARCH-03]** Injectable transport. Tests and advanced users may replace the default transport without monkey-patching global `fetch`.
- **[REQ-ARCH-04]** Stateless library. All durable business state remains with the host application.
- **[REQ-ARCH-05]** Tolerant response parsing. Known safety-critical fields are validated while unknown Chapa fields are preserved.

## 7.3 Component Responsibilities

| Component | Responsibility | Must not do |
|---|---|---|
| `ChapaModule` | Build providers from sync/async configuration and export the public service. | Own business state or initialize a global event subsystem. |
| `ChapaService` | Expose resource clients and a stable Nest injection point. | Duplicate transport logic. |
| `ChapaClient` (internal) | Compose resource clients over configuration, executor, validation, errors, and logging. | Import NestJS. |
| `PaymentsResource` | Initialize, verify, and cancel transactions. | Fulfil orders or persist payment status. |
| `MetadataResource` | Retrieve banks and supported currencies. | Cache globally without caller control. |
| `WebhooksResource` | Verify signatures and parse verified payloads. | Deduplicate events or acknowledge HTTP responses. |
| `FetchTransport` | Execute exactly one authenticated HTTP attempt and return raw status, headers, bytes, and duration. | Retry requests, interpret payment state, or log bodies. |
| `ChapaRequestExecutor` | Apply operation policy, timeout/caller-signal composition, safe-read retries, backoff, parsing, normalization, and error mapping. | Retry mutating operations or depend on NestJS. |

## 7.4 No Forced Event Architecture

**[REQ-ARCH-06]** The package does not require EventEmitter2. Optional request and response hooks are observational and best-effort. They are not durable domain events and must not be described as reliable delivery.

## 7.5 Public Export Boundary

**[REQ-ARCH-07]** The root package does not export `ChapaClient`, `ChapaRequestExecutor`, internal Zod schemas, default transport internals, or private resource implementations. Public resource interfaces are exposed through `ChapaService`. The `./testing` subpath exports only documented mocks, fixture helpers, and verified test-signature utilities.

# 8. Public API Contract

## 8.1 NestJS Registration

```ts
@Module({
  imports: [
    ChapaModule.register({
      secretKey: process.env.CHAPA_SECRET_KEY!,
      webhookSecret: process.env.CHAPA_WEBHOOK_SECRET,
    }),
  ],
})
export class AppModule {}
```

```ts
@Module({
  imports: [
    ChapaModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secretKey: config.getOrThrow<string>('CHAPA_SECRET_KEY'),
        webhookSecret: config.get<string>('CHAPA_WEBHOOK_SECRET'),
      }),
    }),
  ],
})
export class AppModule {}
```

**[REQ-API-01]** Build the module with NestJS `ConfigurableModuleBuilder`. Expose `register()` and `registerAsync()`; async registration supports `useFactory`, `useClass`, and `useExisting`.

## 8.2 Service Surface

```ts
export class ChapaService {
  readonly payments: ChapaPayments;
  readonly metadata: ChapaMetadata;
  readonly webhooks: ChapaWebhooks;
  readonly references: ChapaReferences;
}
```

## 8.3 Payments Resource

```ts
interface ChapaPayments {
  initialize(
    input: InitializePaymentInput,
    options?: ChapaMutationRequestOptions,
  ): Promise<InitializePaymentResult>;

  verify(
    txRef: string,
    options?: ChapaSafeReadRequestOptions,
  ): Promise<VerifyPaymentResult>;

  cancel(
    txRef: string,
    options?: ChapaMutationRequestOptions,
  ): Promise<CancelPaymentResult>;
}
```

### 8.3.1 `InitializePaymentInput`

| Field | Type | Required | SDK rule |
|---|---|---|---|
| `amount` | `string` | Yes | Positive decimal string. Never converted to JavaScript number. |
| `currency` | `string` | Yes | Non-empty uppercase currency code; optional live validation against metadata is caller-controlled. |
| `txRef` | `string` | Yes | Mapped to `tx_ref`; must match `^[A-Za-z0-9_]{1,50}$`. This is a conservative SDK policy, not Chapa's complete grammar. |
| `firstName` | `string` | No | Optional for the version-1 hosted initialization API; mapped to `first_name` and non-empty when provided. This does not claim optionality for every Chapa flow. |
| `lastName` | `string` | No | Optional for the version-1 hosted initialization API; mapped to `last_name` and non-empty when provided. This does not claim optionality for every Chapa flow. |
| `email` | `string` | No | Optional for the version-1 hosted initialization API; valid when provided. |
| `phoneNumber` | `string` | No | Mapped to `phone_number`. Current hosted-payment documentation requires ten digits when supplied. |
| `callbackUrl` | `string` | No | Absolute HTTPS URL in production. HTTP permitted only when explicitly enabled for local testing. |
| `returnUrl` | `string` | No | Absolute URL. |
| `customization` | `object` | No | Title, description, logo and receipt-related fields only when verified by current documentation. |
| `meta` | `record` | No | JSON-safe values. Size limit documented after sandbox verification. |
| `subaccounts` | `array` | Deferred | Not accepted in version 1.0 public types until split-payment support is released. |

### 8.3.2 `InitializePaymentResult`

```ts
interface InitializePaymentResult {
  status: string;
  message?: string;
  checkoutUrl: string;
  txRef: string;
  response: ChapaResponseMetadata;
  raw: unknown;
}
```

The checkout URL is mandatory for a successful normalized result. `txRef` is the exact merchant reference supplied to initialize and is an SDK-owned echo of that request identity; it is not a newly inferred provider-generated Chapa reference. If the HTTP response is successful but the URL is missing or unusable, the SDK throws `ChapaResponseError` and preserves the raw body.

### 8.3.3 `VerifyPaymentResult`

```ts
type PaymentStatus =
  | 'success'
  | 'pending'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'reversed'
  | 'unknown';

interface VerifyPaymentResult {
  status: PaymentStatus;
  txRef: string;
  amount?: string;
  charge?: string;
  currency?: string;
  mode?: string;
  paymentMethod?: string;
  createdAt?: string;
  updatedAt?: string;
  response: ChapaResponseMetadata;
  raw: unknown;
}
```

Unknown future statuses are normalized to `unknown` while the original value remains available in `raw`. This prevents minor API additions from crashing consumers while preserving exhaustiveness for known states.

Payment business state comes only from a usable provider transaction-status field such as `data.status`. HTTP status, top-level Chapa envelope status, and English messages are not payment status. One untouched Test Mode transaction returned HTTP 200 and top-level success while `data.status` remained `pending`. If the required transaction status is absent or unusable, the SDK throws `ChapaResponseError` and preserves redacted raw material.

Provider monetary values require lexical precision. A JSON numeric `amount` or `charge` must not be normalized with `String(number)` or another ordinary IEEE-754 parse/stringify round trip. An optional normalized monetary string may be populated only when the implementation preserves and validates the exact decimal lexical value from response bytes without precision loss. Otherwise it is omitted; raw is preserved, and digits are never rounded or invented. This requirement selects no parsing dependency.

### 8.3.4 `CancelPaymentResult`

Version 1 sends a bodyless `PUT /v1/transaction/cancel/{tx_ref}`. It sends neither JSON `{}` nor any placeholder body. The verified narrow Test Mode result was hosted checkout-link expiration; it did not establish a universal payment-state transition. Post-cancellation verification of the observed transaction remained `pending`.

```ts
interface CancelPaymentResult {
  txRef: string;
  message?: string;
  response: ChapaResponseMetadata;
  raw: unknown;
}
```

The top-level cancellation-envelope `status` is not mapped to `PaymentStatus`, and the SDK never invents `cancelled`. The observed repeat-cancellation HTTP 400 and unknown-reference HTTP 404 remain generic `ChapaApiError` scenarios without message-derived subclasses. Paid/non-cancellable behavior remains U.

## 8.4 Refunds — Deferred from Version 1

**[REQ-API-02]** Version 1 **MUST NOT** expose enabled provider refund create/verify methods or normalized refund contracts. Refund target identity, eligibility, request fields, `meta` encoding, result shapes, lifecycle/status, and verification contract remain U. Documentation and local form-encoding work do not authorize implementation. Refund support requires a separately approved provider-evidence milestone and specification revision.

## 8.5 Metadata Resource

```ts
interface ChapaMetadata {
  listBanks(options?: ChapaSafeReadRequestOptions): Promise<ListBanksResult>;
  listCurrencies(options?: ChapaSafeReadRequestOptions): Promise<ListCurrenciesResult>;
}

interface ChapaBank {
  id?: string | number;
  name: string;
  slug?: string;
  swift?: string;
  accountLength?: number;
  currency?: string;
  raw: unknown;
}

interface ListBanksResult {
  banks: readonly ChapaBank[];
  response: ChapaResponseMetadata;
  raw: unknown;
}

interface ChapaCurrency {
  providerCode: number;
  name: string;
  raw: unknown;
}

interface ListCurrenciesResult {
  currencies: readonly ChapaCurrency[];
  response: ChapaResponseMetadata;
  raw: unknown;
}
```

Bank `slug`, `swift`, `acct_length`, and `currency` map only to their distinctly named public fields. Integer/null flag-like wire fields remain in `raw`; version 1 does not coerce them to booleans. Currency normalization pairs `currency_code[i]` with `currency_name[i]`. Both arrays must exist, have equal length, and contain usable numbers and strings respectively; otherwise the SDK throws `ChapaResponseError` and preserves raw. `providerCode` is a provider numeric identifier, not an ISO textual currency code. Membership and live parity are not promised.

**[REQ-API-03]** The SDK maintains no hidden process-global cache. Metadata cache ownership, duration, invalidation, and persistence belong to the host application. Any future cache adapter requires a separate ADR.

## 8.6 Webhooks Resource

```ts
interface VerifyWebhookInput {
  rawBody: Buffer | Uint8Array;
  headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  secret?: string;
}

interface ChapaWebhookEventBase {
  event: string;
  txRef?: string;
  status?: string;
  amount?: string;
  currency?: string;
  raw: unknown;
}

interface ChapaChargeSuccessWebhookEvent extends ChapaWebhookEventBase {
  event: 'charge.success';
  status: 'success';
}

interface ChapaUnknownWebhookEvent extends ChapaWebhookEventBase {
  event: string;
}

type ChapaKnownWebhookEvent = ChapaChargeSuccessWebhookEvent;

type ChapaWebhookEvent =
  | ChapaKnownWebhookEvent
  | ChapaUnknownWebhookEvent;

interface VerifiedWebhook<T extends ChapaWebhookEvent = ChapaWebhookEvent> {
  verifiedBy: 'x-chapa-signature';
  event: T;
  rawBody: Buffer;
  signature: string;
}

interface ChapaWebhooks {
  verify(input: VerifyWebhookInput): VerifiedWebhook;
}
```

Only exact `charge.success` with `status = 'success'` enters the frozen known variant. Every unsupported event, status, or shape enters `ChapaUnknownWebhookEvent`, which preserves usable common fields and `raw` without promising an unobserved provider shape. `VerifiedWebhook.signature` is the validated `x-chapa-signature` (X1) value; it never refers to C1, and C1 is not exposed as an independent verifier.

**[REQ-API-04]** Test-signature generation is excluded from `ChapaService`. The `./testing` subpath may export `generateChapaTestSignature()` only for signature algorithms confirmed by reproducible M0.5 vectors.

## 8.7 References Resource

```ts
interface GenerateReferenceOptions {
  prefix?: string;
  size?: number;
  separator?: string;
}

interface ChapaReferences {
  generate(options?: GenerateReferenceOptions): string;
}
```

**[REQ-API-05]** Reference generation uses cryptographically secure randomness and always produces a value matching `^[A-Za-z0-9_]{1,50}$`. Prefix, separator, generated body, and total output must remain within that alphabet and the 50-character total limit; impossible configurations fail validation. The exact tested 50-character provider value was accepted and the exact tested 51-character value was rejected, but this SDK grammar is deliberately conservative and is not claimed to be Chapa's complete grammar. The SDK does not guarantee global uniqueness; the host application must enforce workflow uniqueness.

## 8.8 Per-request Options

```ts
interface ChapaBaseRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  correlationId?: string;
}

type ChapaMutationRequestOptions = ChapaBaseRequestOptions;

interface ChapaSafeReadRequestOptions extends ChapaBaseRequestOptions {
  maxRetries?: 0 | 1 | 2;
}
```

**[REQ-API-06]** Unsafe operations do not accept a retry option at the type level. Safe-read `maxRetries` is bounded by global configuration. Runtime validation also rejects retry controls on mutating operations when values arrive through untyped JavaScript.

## 8.9 Shared Public Types

```ts
type JsonPrimitive = string | number | boolean | null;

type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

type ChapaHttpMethod = 'GET' | 'POST' | 'PUT';

type ChapaOperation =
  | 'payments.initialize'
  | 'payments.verify'
  | 'payments.cancel'
  | 'metadata.listBanks'
  | 'metadata.listCurrencies';

interface ChapaResponseMetadata {
  operation: ChapaOperation;
  method: ChapaHttpMethod;
  endpoint: string;
  httpStatus: number;
  attempts: number;
  durationMs: number;
  correlationId?: string;
}
```

**[REQ-API-07]** Response metadata contains allowlisted operational fields only. `correlationId` is caller/SDK-controlled metadata originating from request options. Version 1 exposes no provider `requestId` mapping: observed `x-amzn-requestid` and `x-amzn-trace-id` header names do not establish stable Chapa semantics. Metadata does not expose authorization, signatures, unrestricted headers, request bodies, or response bodies.

# 9. Configuration Contract

```ts
interface ChapaModuleOptions {
  secretKey: string;
  webhookSecret?: string;
  baseUrl?: string;
  timeoutMs?: number;

  retry?: {
    maxSafeRetries?: 0 | 1 | 2;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitter?: boolean;
  };

  logging?: {
    enabled?: boolean;
    level?: 'error' | 'warn' | 'info' | 'debug';
  };

  transport?: ChapaTransport;
  logger?: ChapaLogger;
  hooks?: ChapaInstrumentationHooks;
  allowInsecureTestUrls?: boolean;
}
```

## 9.1 Defaults

| Option | Default | Reason |
|---|---:|---|
| `baseUrl` | `https://api.chapa.co/v1` | Current documented API root. |
| `timeoutMs` | `30,000` | Bounded wait while allowing payment gateways reasonable response time. |
| `maxSafeRetries` | `1` | Limited recovery for explicitly safe reads only. |
| `baseDelayMs` | `500` | Short exponential backoff starting point. |
| `maxDelayMs` | `5,000` | Prevents long hidden waits. |
| `jitter` | `true` | Reduces coordinated retry spikes. |
| `logging.enabled` | `false` | A payment package must not log sensitive payloads by default. |

## 9.2 Supplying Custom Transport and Logger

**[REQ-CFG-01]** A custom transport or logger is supplied as a configured instance. `registerAsync()` may inject application providers and return those instances from `useFactory`. `ChapaModule` binds the configured values to `CHAPA_TRANSPORT` and `CHAPA_LOGGER`; otherwise it binds `FetchTransport` and the no-op logger.

```ts
ChapaModule.registerAsync({
  imports: [InfrastructureModule],
  inject: [CUSTOM_CHAPA_TRANSPORT, CUSTOM_CHAPA_LOGGER, ConfigService],
  useFactory: (transport, logger, config) => ({
    secretKey: config.getOrThrow('CHAPA_SECRET_KEY'),
    transport,
    logger,
  }),
});
```

**[REQ-CFG-02]** `CHAPA_TRANSPORT` and `CHAPA_LOGGER` are exported unique-symbol tokens for advanced testing and diagnostics, but direct application injection is optional. `ChapaClient` remains internal.

## 9.3 Configuration Validation

- **[REQ-CFG-03]** Missing or blank `secretKey` fails during module initialization with `ChapaConfigurationError`.
- **[REQ-CFG-04]** `webhookSecret` is optional unless webhook verification is used.
- **[REQ-CFG-05]** Non-default `baseUrl` is permitted for testing and proxies, but production documentation must warn about credential exposure.
- **[REQ-CFG-06]** Timeout and delay values must be finite integers within documented safe ranges.
- **[REQ-CFG-07]** Secrets must never appear in validation messages, object inspection, or logs.
- **[REQ-CFG-08]** `transport` must implement `send()` and perform exactly one attempt per call; retry orchestration remains inside the SDK executor.
- **[REQ-CFG-09]** Logger methods must be callable and must not receive unredacted request or response bodies.

# 10. HTTP Transport and Reliability

## 10.1 Default Transport

**[REQ-NET-01]** The default `FetchTransport` uses the Node.js `fetch` implementation available in supported Node versions. A transport performs exactly one network attempt. Operation policy, retries, parsing, normalization, and error mapping belong to `ChapaRequestExecutor`, preventing a custom transport from silently changing payment-safety rules.

### 10.1.1 Transport Interface

```ts
interface ChapaTransportRequest {
  method: ChapaHttpMethod;
  url: string;
  headers: Readonly<Record<string, string>>;
  body?: string | Uint8Array;
  signal: AbortSignal;
}

interface ChapaTransportResponse {
  status: number;
  headers: Readonly<Record<string, string>>;
  body: Uint8Array;
  durationMs: number;
}

interface ChapaTransport {
  send(request: ChapaTransportRequest): Promise<ChapaTransportResponse>;
}
```

The executor reads and parses the body once. The transport must not retry, deserialize JSON, normalize Chapa responses, emit logs containing bodies, or translate failures into NestJS exceptions.

## 10.2 Request Construction

- **[REQ-NET-02]** `Authorization: Bearer <secretKey>` on authenticated API requests.
- **[REQ-NET-03]** `Accept: application/json`.
- **[REQ-NET-04]** `Content-Type: application/json` for normal API bodies.
- **[REQ-NET-05]** Version 1 sends no provider refund request. Any future form-encoded refund transport requires the separately approved evidence milestone and specification revision required by REQ-API-02.
- **[REQ-NET-06]** `User-Agent` identifies the package name and version without exposing application secrets.
- **[REQ-NET-07]** Correlation identifiers are included only in SDK logs and hooks unless Chapa documents a supported request header.

## 10.3 Timeout and Cancellation

**[REQ-NET-08]** Each request combines the caller `AbortSignal` with an internal timeout signal. Caller cancellation produces `ChapaAbortError`; elapsed timeout produces `ChapaTimeoutError`. The SDK must distinguish these cases even when the underlying transport reports both through `AbortError`.

## 10.4 Retry Eligibility Matrix

| Condition | Safe GET operations | Mutating operations |
|---|---|---|
| Network error before response | Eligible | Not retried |
| HTTP 408 | Eligible | Not retried |
| HTTP 425 | Eligible | Not retried |
| HTTP 429 | Eligible when `Retry-After` is usable | Not retried automatically |
| HTTP 500, 502, 503, 504 | Eligible | Not retried |
| HTTP 400, 401, 403, 404, 409, 422 | Not retried | Not retried |
| Response parsing failure | Not retried by default | Not retried |
| Caller abort | Never | Never |

## 10.5 Backoff

**[REQ-NET-09]** Eligible retries use exponential backoff with full jitter and respect `Retry-After` where present. Total attempts, delay, and final retryability are recorded in response metadata and typed errors. The default is one retry, giving a maximum of two attempts for eligible safe operations.

## 10.6 Idempotency

**[REQ-NET-10]** Chapa documents unique merchant references, but the current public documentation does not establish a general idempotency-key contract equivalent to payment platforms that guarantee replay-safe POST requests. The SDK therefore must not generate idempotency headers or retry mutating operations under an assumed guarantee.

### 10.6.1 Duplicate Transaction References

**[REQ-NET-11]** The M0.5 duplicate initialization attempt occurred, but its response contract was not safely retained; the duplicate discriminator remains U. Version 1 has no `ChapaDuplicateTransactionReferenceError`. Duplicate/collision responses remain `ChapaApiError` with preserved redacted metadata unless a future approved evidence and specification change establishes a stable machine-readable signal. Initialization has zero automatic retries, and no replay semantics may be inferred.

> **Uncertain Initialization Result**
>
> A timeout during payment initialization is not a payment failure. The SDK throws `ChapaTimeoutError` with `retryable=false` and preserves `txRef` so the application can verify the transaction before deciding whether to initialize again.

## 10.7 Verification Business States Returned as HTTP Errors

**[REQ-NET-12]** M0.5 did not establish a stable unpaid-404 discriminator. Every version-1 HTTP 404 is therefore a `ChapaApiError`; no 404 is normalized to `pending`. Payment state is derived only from a usable transaction-status body field, never from HTTP status, top-level envelope status, or an English message. A future discriminator requires new approved evidence and a specification change.

## 10.8 Response Handling

- **[REQ-NET-13]** Read the response body at most once.
- **[REQ-NET-14]** Attempt JSON parsing when content type or body indicates JSON; preserve text otherwise.
- **[REQ-NET-15]** Treat non-2xx status as an API error even when the body contains a business status.
- **[REQ-NET-16]** Attach HTTP status, headers, request duration, attempts, method, and endpoint to metadata.
- **[REQ-NET-17]** Redact authorization and sensitive body fields before any error serialization.

# 11. Validation and Data Modelling

## 11.1 Request Validation

**[REQ-DATA-01]** All public inputs receive compile-time TypeScript types and internal Zod runtime validation. Validation occurs before the transport is called. Every caller-supplied version-1 `txRef` must match `^[A-Za-z0-9_]{1,50}$`; this is conservative SDK policy rather than a complete provider-grammar claim. Validation failures throw `ChapaValidationError` with SDK-owned issue details; Zod classes and issue types are not exposed as public API.

## 11.2 Money

**[REQ-DATA-02]** Public payment input amounts are positive decimal strings matching the following version-1 SDK grammar:

```regex
^(?:[1-9]\d*(?:\.\d{1,2})?|0\.\d{1,2})$
```

The represented decimal value must additionally be greater than zero, determined without conversion through JavaScript `Number`. Signs, exponent notation, commas, whitespace, empty strings, integer leading zeros, more than two fractional digits, zero forms (`0`, `0.0`, `0.00`), and negative values are rejected. Public money is never converted to IEEE-754 number and the SDK performs no currency arithmetic. This is a deliberate SDK safety policy, not a claim about Chapa's complete amount grammar; M0.5 established no provider maximum.

## 11.3 Dates

**[REQ-DATA-03]** Dates remain ISO-like strings as returned by Chapa. The SDK does not convert dates to JavaScript `Date` objects because conversion can lose original formatting and introduces timezone assumptions.

## 11.4 Field Naming

**[REQ-DATA-04]** Public TypeScript inputs use camelCase. The transport maps them to Chapa wire names such as `tx_ref`, `first_name`, `callback_url`, and `phone_number`. Raw responses remain available because Chapa uses multiple reference field names across endpoints.

## 11.5 Response Validation Strategy

- **[REQ-DATA-05]** Required-field validation. Validate fields required for the normalized result; preserve additional and unknown fields. This is the only public response-validation policy in version 1.
- **[REQ-DATA-06]** Internal fixture validation. Tests may maintain complete expected fixture schemas, but no public strict-mode option is exposed in version 1.
- **[REQ-DATA-07]** Unknown enums. Map to `unknown` while preserving the original raw value.
- **[REQ-DATA-08]** Missing safety-critical field. Throw `ChapaResponseError` with the redacted raw body and endpoint metadata.

# 12. Error Model

## 12.1 Hierarchy

```text
ChapaError
|-- ChapaConfigurationError
|-- ChapaValidationError
|-- ChapaAuthenticationError
|-- ChapaPermissionError
|-- ChapaRateLimitError
|-- ChapaApiError
|-- ChapaNetworkError
|-- ChapaTimeoutError
|-- ChapaAbortError
|-- ChapaResponseError
`-- ChapaWebhookSignatureError
```

## 12.2 Base Error Contract

```ts
interface ChapaErrorDetails {
  code: string;
  message: string;
  operation?: ChapaOperation;
  method?: ChapaHttpMethod;
  endpoint?: string;
  httpStatus?: number;
  chapaStatus?: string;
  chapaMessage?: string;
  correlationId?: string;
  attempts?: number;
  retryable: boolean;
  cause?: unknown;
  raw?: unknown; // redacted
}
```

## 12.3 Error Mapping

| Condition | Error type |
|---|---|
| Missing or invalid module configuration | `ChapaConfigurationError` |
| Invalid caller input | `ChapaValidationError` |
| HTTP 401 | `ChapaAuthenticationError` |
| HTTP 403 | `ChapaPermissionError` |
| HTTP 429 | `ChapaRateLimitError` |
| Other non-2xx Chapa response | `ChapaApiError` |
| DNS, connection, TLS, socket failure | `ChapaNetworkError` |
| SDK timeout | `ChapaTimeoutError` |
| Caller `AbortSignal` | `ChapaAbortError` |
| Malformed or unsafe successful response | `ChapaResponseError` |
| Missing or invalid webhook signature | `ChapaWebhookSignatureError` |

### 12.3.1 Provider-specific Error Reasons

**[REQ-ERR-01]** Version 1 has no dedicated duplicate-reference or cancellation-state error because M0.5 established no stable machine-readable discriminator. The SDK must not classify critical payment errors using loose English-message matching. Duplicate/collision, repeat-cancellation, unknown-cancellation, and unknown provider failures remain `ChapaApiError` with redacted raw evidence unless a future approved evidence/specification change establishes a stable signal.

## 12.4 Framework Independence

**[REQ-ERR-02]** The SDK never throws NestJS `HttpException`, `BadRequestException`, or framework transport exceptions. Applications may map Chapa errors to HTTP, GraphQL, RPC, message-queue, or background-job semantics according to their own boundary.

# 13. Webhook Security and Processing

## 13.1 Verification Requirements

- **[REQ-WH-01]** Verification **MUST** consume exact original request bytes as `Buffer` or `Uint8Array`; strings and re-serialized JSON are prohibited.
- **[REQ-WH-02]** Header lookup **MUST** be case-insensitive.
- **[REQ-WH-03]** `x-chapa-signature` (X1) is the required payload-integrity header. `chapa-signature` (C1) is recognized only as an optional secondary secret/configuration-consistency signal.
- **[REQ-WH-04]** Each checked HMAC digest **MUST** be compared with `crypto.timingSafeEqual()` after an equal-length 32-byte guard.
- **[REQ-WH-05]** Each supplied signature must match `^[0-9A-Fa-f]{64}$`, decode to 32 bytes, and validate. Missing or invalid X1 rejects. Absent C1 is allowed after valid X1; supplied malformed, wrong-sized, or invalid C1 rejects fail-closed. Base64 is not accepted. Uppercase hex acceptance is SDK decoder robustness, not a provider-emission claim.
- **[REQ-WH-06]** JSON parsing **MUST NOT** occur until required X1 verification and any supplied C1 validation succeed.
- **[REQ-WH-07]** Every successful result identifies `verifiedBy: 'x-chapa-signature'`. C1 never independently verifies an event and cannot rescue missing or failed X1.

## 13.2 Signature Ambiguity Gate

**[REQ-WH-08]** M0.5 verified, for the observed Test Mode configuration, X1 as `HMAC-SHA256(key = UTF8(webhookSecret), message = exact original rawBody bytes)` and C1 as `HMAC-SHA256(key = UTF8(webhookSecret), message = UTF8(webhookSecret))`; provider emission was lowercase 64-character hexadecimal. C1 contains no payload bytes, provides no payload integrity, per-event freshness, or replay resistance, and **MUST NOT** authorize parsing or acceptance or be described as a payload signature. Provider both-header priority/conflict semantics and canonicalization remain U; the fail-closed rules above are deliberate SDK security policy.

| X1 primary | C1 secondary | Version-1 result |
|---|---|---|
| Valid | Absent | Accept, parse, and return `verifiedBy = 'x-chapa-signature'`. |
| Valid | Valid | Accept, parse, and return X1 as verifier; C1 confirms secondary consistency only. |
| Valid | Malformed, wrong-sized, or invalid | Reject fail-closed. |
| Missing, malformed, wrong-sized, or invalid | Any state | Reject; C1 can never rescue X1. |

## 13.3 NestJS Express Example

```ts
const app = await NestFactory.create<NestExpressApplication>(
  AppModule,
  { rawBody: true },
);

@Post('chapa')
handleWebhook(@Req() req: RawBodyRequest<Request>) {
  const verified = this.chapa.webhooks.verify({
    rawBody: req.rawBody!,
    headers: req.headers,
  });

  // Enqueue or process idempotently in the application.
  return { received: true, event: verified.event.event };
}
```

## 13.4 NestJS Fastify

**[REQ-WH-09]** The documentation must provide an equivalent Fastify example using Nest's `rawBody` option and Fastify request typing. The core verification API must remain identical across platforms.

## 13.5 Application Responsibilities

- **[REQ-WH-10]** Persist a unique event identity or stable business key and process duplicates idempotently.
- **[REQ-WH-11]** Return HTTP 200 after the event has been durably accepted according to the application's architecture.
- **[REQ-WH-12]** Re-query the verification endpoint before delivering value on a successful payment notification.
- **[REQ-WH-13]** Compare `txRef`, amount, currency, mode, and expected order identity before fulfilment.
- **[REQ-WH-14]** Handle out-of-order, repeated, delayed, and unknown events without assuming unverified event shapes; host applications retain idempotency responsibility.

## 13.6 Event Types

**[REQ-WH-15]** Version 1 freezes a known typed provider variant only for the observed `charge.success` event with `status = 'success'`. Other documented but unverified names, statuses, and shapes use `ChapaUnknownWebhookEvent`, preserving the event name and common safe fields where usable plus the raw payload. New typed variants require approved evidence and a specification revision.

# 14. Logging and Observability

## 14.1 Logger Interface

```ts
interface ChapaLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}
```

A no-op logger is used by default. Consumers provide a logger instance through `ChapaModuleOptions.logger`, including from `registerAsync()` factories that inject Nest `Logger` or another structured logger. The core depends only on this interface and receives redacted allowlisted context.

## 14.2 Allowed Log Fields

- **[REQ-OBS-01]** Operation name, HTTP method, endpoint path, duration, attempt count, HTTP status, correlation ID, and safe reference identifiers.
- **[REQ-OBS-02]** Error class and stable SDK error code.
- **[REQ-OBS-03]** Whether a retry occurred and the non-sensitive reason.

## 14.3 Prohibited Log Fields

- **[REQ-OBS-04]** Authorization headers, secret keys, webhook secrets, signatures, tokens, passwords, or full configuration objects.
- **[REQ-OBS-05]** Full request or response bodies.
- **[REQ-OBS-06]** Email addresses, phone numbers, account numbers, customer names, or unrestricted metadata.

## 14.4 Instrumentation Hooks

```ts
interface ChapaInstrumentationHooks {
  onRequest?(event: ChapaRequestObservation): void | Promise<void>;
  onResponse?(event: ChapaResponseObservation): void | Promise<void>;
  onRetry?(event: ChapaRetryObservation): void | Promise<void>;
}
```

**[REQ-OBS-07]** Optional request and response hooks may expose redacted structured metadata. Hooks are synchronous or awaited best-effort observations; hook failure must not change payment outcome unless a strict instrumentation mode is explicitly introduced in a future major version.

# 15. Security Requirements

- **[REQ-SEC-01]** Secrets are accepted through configuration and never stored in static globals.
- **[REQ-SEC-02]** All production API communication uses HTTPS. Insecure URLs require an explicit local-test option.
- **[REQ-SEC-03]** Webhook HMAC comparisons are timing-safe.
- **[REQ-SEC-04]** Raw webhook bodies are not logged.
- **[REQ-SEC-05]** Public errors and logs redact secrets and personal data.
- **[REQ-SEC-06]** Dependencies are pinned through a lockfile and reviewed by automated dependency scanning.
- **[REQ-SEC-07]** GitHub Actions use minimal permissions and pinned action versions.
- **[REQ-SEC-08]** npm publication uses trusted publishing with OIDC and automatically generated provenance.
- **[REQ-SEC-09]** The release workflow is isolated from pull-request code and requires protected-environment approval for stable releases.
- **[REQ-SEC-10]** `SECURITY.md` defines private vulnerability reporting and supported versions.

## 15.1 Supply-chain Controls

- **[REQ-SEC-11]** Dependabot or equivalent automated dependency updates.
- **[REQ-SEC-12]** CodeQL or equivalent static analysis where applicable.
- **[REQ-SEC-13]** `npm audit` is advisory and cannot be the sole security gate.
- **[REQ-SEC-14]** Package contents are inspected with `npm pack --dry-run` in CI.
- **[REQ-SEC-15]** Published tarball is tested in consumer applications before stable release.
- **[REQ-SEC-16]** No long-lived npm token in repository secrets when trusted publishing is available.

# 16. Testing Strategy

## 16.1 M0.5 Chapa Contract-Verification Gate

**[REQ-TEST-01]** M0.5 used disposable research tooling rather than production package code to observe Chapa. Its final evidence states and deferrals are recorded in `docs/contracts/2026-08-25-m0.5-contract-freeze-proposal.md`; F7 closeout, merge, and post-merge verification are complete, and M1-M5 were subsequently completed against that freeze.

| Operation or scenario | Frozen M0.5 outcome | Version-1 consequence |
|---|---|---|
| Initialize payment | Selected hosted-flow, txRef-boundary, and exact amount observations adjudicated V | Scoped optional identity; conservative txRef/money policies |
| Duplicate `txRef` | Attempt occurred; response contract unavailable and U | Generic `ChapaApiError`; no replay or dedicated discriminator |
| Verify payment | Exact body-status `pending` lifecycle adjudicated V; unpaid-404/general unknown remains U | State comes from usable body status; arbitrary 404 is API error |
| Cancel transaction | Bodyless link-expiration and exact error scenarios adjudicated V; universal state/paid behavior U | Bodyless PUT and minimal result; no invented cancelled state |
| Refund | Provider contract remained U and was not executed | Excluded from version 1 |
| Metadata | Banks and currency parallel-array shapes adjudicated V | Evidence-honest shapes with raw preservation |
| Webhooks | X1/C1 constructions, encoding, both-presence, and one event shape adjudicated V; conflict/canonicalization U | Required X1, secondary C1, fail-closed policy, unknown events |

### 16.1.1 Fixture Requirements

**[REQ-TEST-02]** A committed sanitized JSON fixture and its Appendix F manifest entry collectively establish provenance. The fixture preserves the reviewed provider shape/body and retained operation metadata; retained safe header-name evidence may also remain in the fixture where available. Its linked manifest entry records canonical fixture identity, operation, case name, Test Mode environment, retained day-level evidence date, HTTP method/path/status, D/V/U state, supported claims, and unresolved claims. File existence is not evidence, and fixture-to-manifest linkage must remain valid. Adjudicated C/D/E non-fixture observations remain in the contract-freeze matrix rather than being fabricated as fixtures. Secrets, signatures tied to live secrets, personal data, and real account identifiers are never committed.

The Appendix F fixture manifest contains the three actual M0.5-B JSON fixtures. Adjudicated C/D/E sanitized observations are indexed in the approved contract-freeze matrix rather than misrepresented as fixtures.

**[REQ-TEST-03]** M0.5 closed through F7 after every shipped safety-critical contract had sufficient D/V authority or was explicitly constrained, deferred, excluded, or fail-closed. Refunds are excluded rather than treated as a missing version-1 fixture. The coherent M0.5-F work was merged and verified before the now-completed M1-M6 work; the M7 stable freeze and publication remain bound by the same freeze.

## 16.2 Test Layers

| Layer | Purpose | Required coverage |
|---|---|---|
| Unit | Schemas, mappers, reference generation, redaction, errors, backoff, HMAC. | Branches and edge cases. |
| Transport contract | Request methods, URLs, headers, body encoding, timeout, abort, retry decisions. | Every version 1.0 endpoint. |
| Response fixtures | Normalize documented and captured Chapa responses. | Success and major failure shapes. |
| Nest integration | `register`, `registerAsync`, provider overrides, configuration failure. | Nest 10 and 11. |
| Platform examples | Express and Fastify webhook raw-body flows. | Boot and verification tests. |
| Package consumer | Install packed tarball into clean CJS and ESM Nest apps. | Node 22 and 24. |
| Sandbox smoke | Optional live test-mode verification with protected secrets. | Manual/release-candidate gate. |

## 16.3 Mandatory Failure Tests

- **[REQ-TEST-04]** Initialization timeout does not trigger a second POST.
- **[REQ-TEST-05]** Version-1 public exports and operation schemas contain no enabled provider refund create/verify contract.
- **[REQ-TEST-06]** Safe GET retries once on eligible 503 and records two attempts.
- **[REQ-TEST-07]** 401 and 400 are never retried.
- **[REQ-TEST-08]** Caller abort is distinguished from timeout.
- **[REQ-TEST-09]** Malformed successful response throws `ChapaResponseError` with redacted raw data.
- **[REQ-TEST-10]** Valid and invalid X1 tests operate on exact raw bytes. C1 tests reproduce the frozen secret-on-secret construction separately; valid C1 never substitutes for X1 payload verification.
- **[REQ-TEST-11]** JSON reformatting changes the X1 payload-signature input, and the mutated or reconstructed payload must fail X1 verification.
- **[REQ-TEST-12]** Secrets and personal data never appear in logger snapshots.
- **[REQ-TEST-13]** Unknown payment statuses and webhook event names/statuses remain accessible without unsafe coercion.
- **[REQ-TEST-14]** Duplicate `txRef` responses remain generic `ChapaApiError` and never trigger an automatic second initialization.
- **[REQ-TEST-15]** Every verification HTTP 404 throws `ChapaApiError`; no HTTP status alone is normalized to `pending`.
- **[REQ-TEST-16]** Mutation request option schemas reject `maxRetries` supplied through untyped JavaScript.
- **[REQ-TEST-17]** The root export does not expose `ChapaClient`, internal schemas, or the request executor.

## 16.4 Coverage Policy

**[REQ-TEST-18]** Coverage thresholds are a floor, not the quality target. Initial CI thresholds are 90% statements, 90% lines, 85% functions, and 85% branches for source files, with security and retry modules expected to approach complete branch coverage.

## 16.5 No Unverified Live Tests in Normal CI

**[REQ-TEST-19]** Normal pull-request CI must not call the real Chapa API. Live test-mode checks run only in a protected workflow with explicit secrets, rate controls, and a documented cleanup strategy.

# 17. Build, Packaging and Release

## 17.1 Package Outputs

- **[REQ-PKG-01]** ESM JavaScript.
- **[REQ-PKG-02]** CommonJS JavaScript.
- **[REQ-PKG-03]** Type declaration files.
- **[REQ-PKG-04]** Source maps.
- **[REQ-PKG-05]** README, LICENSE, CHANGELOG, and SECURITY policy in the package tarball where appropriate.
- **[REQ-PKG-06]** Zod remains an external runtime dependency resolved from `node_modules`; it is not bundled and is not exposed in declarations.

## 17.2 Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./testing": {
      "types": "./dist/testing.d.ts",
      "import": "./dist/testing.js",
      "require": "./dist/testing.cjs"
    }
  }
}
```

**[REQ-PKG-07]** Only documented entry points are exported. The root entry exposes the NestJS product surface and SDK-owned contracts; it does not export `ChapaClient` or internal Zod schemas. The `./testing` entry contains mock transport utilities, sanitized fixtures, and test-signature helpers for algorithms confirmed by M0.5.

## 17.3 Versioning

- **[REQ-PKG-08]** Semantic Versioning.
- **[REQ-PKG-09]** Changesets for release intent and changelog generation.
- **[REQ-PKG-10]** Breaking public type, runtime, error, or retry changes require a major release after 1.0.
- **[REQ-PKG-11]** Additive optional response fields and recognized enum-value additions require documented compatibility review.
- **[REQ-PKG-12]** Alpha, beta, and release-candidate tags precede the stable 1.0 release.

## 17.4 Publication

**[REQ-PKG-13]** Publish prerelease and stable versions through npm trusted publishing from GitHub Actions. The release workflow generates provenance, creates the GitHub release, publishes the package, and verifies the published version and tarball. A one-time, non-release namespace bootstrap may use a short-lived granular token only because npm requires the package to exist before a Trusted Publisher can be configured; it must run in protected GitHub Actions, include provenance, use a non-`latest` bootstrap tag, and be revoked and removed before any release-candidate publication.

## 17.5 Release Gates

- **[REQ-PKG-14]** Lint and formatting pass.
- **[REQ-PKG-15]** Type checking and API extraction pass.
- **[REQ-PKG-16]** Unit, integration, platform, and package-consumer tests pass on the supported matrix.
- **[REQ-PKG-17]** `npm pack` contents are reviewed automatically.
- **[REQ-PKG-18]** No high-confidence secret or credential findings.
- **[REQ-PKG-19]** Documentation examples compile.
- **[REQ-PKG-20]** Changeset and changelog are present.
- **[REQ-PKG-21]** Release candidate has completed sandbox smoke testing.
- **[REQ-PKG-22]** Every shipped version-1 safety-critical contract has sufficient D/V authority or an explicit constraint, deferral, exclusion, or fail-closed rule recorded by the M0.5 freeze.
- **[REQ-PKG-23]** Published package identity and README clearly state community ownership and NestJS focus.

# 18. Documentation Requirements

## 18.1 Required Guides

- **[REQ-DOC-01]** Installation and supported-version matrix.
- **[REQ-DOC-02]** Synchronous and asynchronous configuration.
- **[REQ-DOC-03]** Initialize, redirect, callback, verify, and fulfilment flow.
- **[REQ-DOC-04]** Cancellation documentation explains the bodyless hosted-checkout cancellation flow, observed checkout-link expiration, and the explicit limitation that cancellation does not establish a universal transaction-state transition.
- **[REQ-DOC-05]** Version-1 scope documentation explicitly states that provider refund creation and verification are deferred pending a separate evidence milestone and specification revision.
- **[REQ-DOC-06]** Express and Fastify raw-body webhook setup.
- **[REQ-DOC-07]** Error handling and retry semantics.
- **[REQ-DOC-08]** Testing with a mocked transport and webhook signatures.
- **[REQ-DOC-09]** Security checklist for production deployment.
- **[REQ-DOC-10]** Every breaking release must include explicit version-upgrade guidance.
- **[REQ-DOC-11]** Contract-evidence guide documenting fixture provenance, sanitization, and known test/live limitations.
- **[REQ-DOC-12]** Duplicate `txRef` and uncertain-timeout recovery guidance follows the adjudicated deferral: no dedicated duplicate discriminator, no automatic replay, and no claim beyond retained evidence.

## 18.2 Documentation Rules

- **[REQ-DOC-13]** Every example must compile in CI.
- **[REQ-DOC-14]** No example embeds real secret keys, phone numbers, account numbers, or personal data.
- **[REQ-DOC-15]** Documentation distinguishes callback redirects from authoritative verification and webhook events.
- **[REQ-DOC-16]** Documentation never states that initialization timeout means payment failure.
- **[REQ-DOC-17]** Documentation explains which responsibilities remain with the host application.

# 19. Repository Structure

```text
nestjs-chapa/
|-- .changeset/
|-- .github/
|   |-- ISSUE_TEMPLATE/
|   |-- workflows/
|   |   |-- ci.yml
|   |   |-- codeql.yml
|   |   `-- release.yml
|   `-- pull_request_template.md
|-- docs/
|   |-- architecture/
|   |-- contracts/
|   |-- guides/
|   `-- decisions/
|-- examples/
|   |-- nest-express/
|   `-- nest-fastify/
|-- research/
|   `-- contract-probes/
|-- src/
|   |-- core/ # internal implementation
|   |   |-- client/
|   |   |-- errors/
|   |   |-- executor/
|   |   |-- resources/
|   |   |-- schemas/
|   |   |-- transport/
|   |   |-- webhooks/
|   |   `-- observability/
|   |-- nest/
|   |   |-- module/
|   |   |-- providers/
|   |   `-- tokens.ts
|   |-- testing/
|   `-- index.ts
|-- test/
|   |-- fixtures/chapa/
|   |-- integration/
|   `-- consumer/
|-- CHANGELOG.md
|-- CODE_OF_CONDUCT.md
|-- CONTRIBUTING.md
|-- GOVERNANCE.md
|-- MAINTAINERS.md
|-- ROADMAP.md
|-- SUPPORT.md
|-- LICENSE
|-- README.md
|-- SECURITY.md
|-- package.json
|-- tsconfig.json
`-- lockfile
```

## 19.1 Source-boundary Rules

- **[REQ-REPO-01]** `src/core` may not import from `src/nest`.
- **[REQ-REPO-02]** Resources may depend on transport, schemas, errors, and observability but not on one another's private internals.
- **[REQ-REPO-03]** Testing helpers may import public core contracts but production code may not depend on testing.
- **[REQ-REPO-04]** Only `src/index.ts` and documented subpath entry points define public exports.
- **[REQ-REPO-05]** `research/contract-probes` is disposable evidence tooling and must not be imported by `src` or published in the npm tarball.
- **[REQ-REPO-06]** The public declaration audit must fail if `ChapaClient`, internal Zod types, executor types, or non-allowlisted transport internals leak into the root entry.

# 20. Delivery Milestones

| Milestone | Deliverable | Exit condition |
|---|---|---|
| M0 - Specification | Approved architecture, public boundary, preliminary endpoint matrix, open-question register. | Repository and M0.5 research may proceed. |
| M0.5 - Contract verification | Completed A-F evidence inventory, adjudication, fixture manifest, contract matrix, and normative freeze. | Completed: F7 final alignment, merge, and post-merge verification. |
| M1 - Repository foundation | Governance files, package skeleton, CI, build proof, release preview, and contributor workflow. | Packed empty library installs in ESM/CJS Nest consumers; governance and package identity are confirmed. |
| M2 - Core infrastructure | Configuration, one-attempt transport, request executor, errors, validation, logging, safe-read retry engine. | Failure-mode and public-boundary tests pass. |
| M3 - Payments | Initialize, verify, cancel, references. | Evidence-backed contract tests and documented recovery flows pass against the frozen D/V/U contract. |
| M4 - Metadata | Banks and supported currencies. | Evidence-honest normalization and failure tests pass. |
| M5 - Webhooks | Raw-body verification, event parsing, Express/Fastify examples. | M0.5-reproduced provider-derived X1/C1 vectors and deterministic invalid/mutation vectors pass. |
| M6 - Release candidate (completed) | Docs, consumer tests, security review, protected sandbox smoke. | Completed: `0.1.0-rc.0` published with provenance. |
| M7 - Stable 1.0 (publication pending) | Freeze `1.0.0`, then publish through the protected workflow after review, merge, and green CI. | Public npm and GitHub stable release; all acceptance criteria satisfied. |

# 21. Acceptance Criteria

## 21.1 Functional

- **[AC-FUNC-01]** A NestJS 10 or 11 application can configure the package synchronously or asynchronously and inject `ChapaService`.
- **[AC-FUNC-02]** All version 1.0 operations call the documented method, path, authentication, and body encoding.
- **[AC-FUNC-03]** Payment initialization returns a normalized checkout URL and preserves the raw response.
- **[AC-FUNC-04]** Verification returns known statuses and safely preserves unknown statuses.
- **[AC-FUNC-05]** Cancellation sends a bodyless `PUT /v1/transaction/cancel/{tx_ref}` and returns only txRef, optional message, response metadata, and raw; it does not invent a transaction state.
- **[AC-FUNC-06]** Version 1 excludes enabled provider refund creation, verification, inputs, and normalized results pending a future approved evidence milestone and specification revision.
- **[AC-FUNC-07]** Bank and currency retrieval are typed and retry-safe.
- **[AC-FUNC-08]** Webhook verification requires valid X1 over exact raw bytes; absent C1 is allowed after valid X1, supplied invalid C1 rejects, and C1 never verifies payload independently.
- **[AC-FUNC-09]** Actual JSON fixtures are indexed by Appendix F; adjudicated non-fixture C/D/E evidence is indexed by the approved M0.5 contract-freeze matrix. Every shipped safety-critical contract has sufficient D/V authority or is explicitly constrained/deferred/fail-closed.
- **[AC-FUNC-10]** Duplicate `txRef` discrimination and unpaid-404 normalization remain explicitly deferred: duplicates use generic `ChapaApiError`, arbitrary 404 is an API error, and no payment state is inferred from HTTP status.

## 21.2 Reliability

- **[AC-REL-01]** No mutating operation is automatically retried.
- **[AC-REL-02]** Eligible safe reads perform no more than the configured retry limit.
- **[AC-REL-03]** Timeout, caller abort, network error, API error, validation error, and response error are distinguishable.
- **[AC-REL-04]** Every error preserves safe diagnostic metadata without secrets or personal data.
- **[AC-REL-05]** Mutation methods expose no retry option and reject retry controls arriving through untyped JavaScript.
- **[AC-REL-06]** A custom `ChapaTransport` performs one attempt per `send()` call; retry count remains controlled by the executor.

## 21.3 Package Quality

- **[AC-PKG-01]** Node 22 and 24 package-consumer tests pass.
- **[AC-PKG-02]** NestJS 10 and 11 compatibility tests pass.
- **[AC-PKG-03]** ESM and CommonJS imports work through the package exports map.
- **[AC-PKG-04]** The npm tarball contains only intended files.
- **[AC-PKG-05]** Documentation examples compile and tests meet required thresholds.
- **[AC-PKG-06]** The release is published through trusted publishing with provenance.
- **[AC-PKG-07]** The root export contains no framework-independent client product, internal Zod schema, or internal executor type.
- **[AC-PKG-08]** `GOVERNANCE.md` defines decision rights, maintainer duties, release authority, succession, and conflict resolution.
- **[AC-PKG-09]** `MAINTAINERS.md` identifies active maintainers and review responsibilities.
- **[AC-PKG-10]** Public changes are made through documented issues and pull requests, except for confidential security handling described in `SECURITY.md`.
- **[AC-PKG-11]** Zod resolves as a normal external runtime dependency in packed ESM and CommonJS consumer tests.

## 21.4 Security

- **[AC-SEC-01]** No secret is emitted through logs, thrown messages, snapshots, or package fixtures.
- **[AC-SEC-02]** Webhook comparisons are timing-safe and reject reconstructed payloads.
- **[AC-SEC-03]** The release workflow has minimum permissions and no long-lived npm publishing token.
- **[AC-SEC-04]** `SECURITY.md` provides a private disclosure path and supported-version policy.

# 22. Risks and Open Questions

| ID | Final M0.5 disposition | Closed boundary | Remaining boundary |
|---|---|---|---|
| OQ-01 | PARTIAL | Observed X1/C1 constructions, lower-hex emission, both-header presence, and `charge.success/success` shape | Provider conflict/priority/fallback, universal presence, canonicalization, Base64, other events, live parity remain U |
| OQ-02 | PARTIAL | Bodyless PUT link-expiration success, post-cancel pending, repeat 400, and unknown-reference 404 exact scenarios | Universal cancelled state, paid/non-cancellable behavior, stable error discriminators, live parity remain U |
| OQ-03 | PARTIAL | Identity omission for the version-1 hosted initialization flow | Other flows/configurations and live universal optionality remain U |
| OQ-04 | PARTIAL | Exact tested 50-character acceptance and 51-character rejection | Complete provider grammar, universal boundary, refund target identity, and live parity remain U |
| OQ-05 | RESOLVED | Test Mode parallel numeric `currency_code` and textual `currency_name` arrays | Permanent membership, malformed/mismatched behavior as provider contract, and live parity are not claimed |
| OQ-06 | PARTIAL | Safe AWS-looking header names observed | Meaning, uniqueness, stability, and public Chapa request-ID semantics remain U |
| OQ-07 | DEFERRED TO M1 | None in M0.5 | Final build tool and package-output proof belong to M1 |
| OQ-08 | DEFERRED | Duplicate attempt occurred | Response/discriminator remains U; generic error and no replay apply |
| OQ-09 | PARTIAL | Exact B3 rejection and untouched Test Mode `data.status=pending` | Historical unknown-400 retained as U; unpaid-404 discriminator, general nonexistence, live parity remain U |
| OQ-10 | PARTIAL | Exact core amount outcomes adjudicated V | Lost-raw Part-2 history, complete provider grammar, maximum, arbitrary scale, leading zeros, normalization, live parity remain U; SDK grammar is policy |
| OQ-11 | DEFERRED | No provider refund contract closed | All provider refund behavior is excluded from version 1 |
| OQ-12 | DEFERRED | None | Test/live parity remains U |

OQ-13 remains outside M0.5 and belongs to M1 governance and maintainer documentation.

## 22.1 Risk Controls

- **[REQ-RISK-01]** Before coding an ambiguous provider contract, the repository must contain reviewable sanitized Test Mode evidence appropriate to its provenance: either an actual fixture indexed by Appendix F or an adjudicated sanitized provider observation indexed by the M0.5 contract-freeze matrix. Plans and synthetic/local tests alone do not satisfy provider verification, and non-fixture evidence must not be forced into the fixture manifest.
- **[REQ-RISK-02]** Keep unknown fields in raw responses and unknown enum values in explicit `unknown` states.
- **[REQ-RISK-03]** Ship alpha releases for consumer testing before stable 1.0.
- **[REQ-RISK-04]** Document every contract deviation from official Chapa documentation in an ADR and changelog.
- **[REQ-RISK-05]** Treat test-mode observations as evidence for test mode; disclose unverified live-mode parity rather than claiming it.
- **[REQ-RISK-06]** Do not introduce provider-specific error subclasses until a stable machine-readable discriminator is verified.

# 23. Architecture Decision Record

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Use `Sye-1321/nestjs-chapa` as the repository and `@sye1321/nestjs-chapa` as the package identity. | APPROVED |
| ADR-002 | Use one package with a framework-independent core and NestJS adapter. | APPROVED |
| ADR-003 | Implement provider transport and contracts directly; use no third-party Chapa SDK runtime dependency. | APPROVED |
| ADR-004 | Use `ConfigurableModuleBuilder` for `register`/`registerAsync`. | APPROVED |
| ADR-005 | Remain Express/Fastify independent in core code. | APPROVED |
| ADR-006 | Support Node.js 22 and 24 only at v1.0; support NestJS 10/11 after consumer validation. | APPROVED |
| ADR-007 | Use endpoint-aware retries; never retry mutating operations automatically. | APPROVED |
| ADR-008 | Expose a structured framework-independent error hierarchy. | APPROVED |
| ADR-009 | Verify webhooks from exact raw bytes and require captured test vectors. | APPROVED |
| ADR-010 | No database, queue, ORM, reconciliation, or forced event dependency. | APPROVED |
| ADR-011 | Represent money as decimal strings and dates as strings. | APPROVED |
| ADR-012 | Use normalized results while preserving raw Chapa responses. | APPROVED |
| ADR-013 | Keep version 1 NestJS-first; internal core is not a separately supported public Node.js SDK. | APPROVED |
| ADR-014 | Use Zod as an external runtime dependency; do not expose Zod types or schemas publicly. | APPROVED |
| ADR-015 | Use operation-specific request options so mutating methods cannot accept retry controls. | APPROVED |
| ADR-016 | Require M0.5 provider contract verification before production package implementation. | APPROVED |
| ADR-017 | Expose required-field tolerant response validation only; no public strict mode in version 1. | APPROVED |
| ADR-018 | Use `Sye-1321/nestjs-chapa` and publish as `@sye1321/nestjs-chapa`. | APPROVED |
| ADR-019 | Maintain the project as an Ethiopian-led, globally accessible open-source project with public governance and uniform contribution standards. | APPROVED |

# Appendix A - Endpoint Evidence Matrix

Evidence codes: `A` = accepted architecture decision; `D` = documented; `V` = maintainer-adjudicated sanitized Test Mode evidence; `U` = unresolved/provisional. V is scenario-specific and does not imply live parity.

| Operation | Method and path | Body format | Evidence status |
|---|---|---|---|
| Initialize payment | `POST /v1/transaction/initialize` | JSON | `[D/V]` documented endpoint; selected hosted-flow, txRef-boundary, and exact amount observations are V; broader provider grammar/live parity remain U |
| Verify payment | `GET /v1/transaction/verify/{tx_ref}` | None | `[D/V/U]` documented endpoint and exact body-pending lifecycle V; unpaid-404/general unknown/live behavior U |
| Cancel transaction | `PUT /v1/transaction/cancel/{tx_ref}` | None | `[V/U]` narrow bodyless Test Mode link-expiration/error scenarios V; universal cancelled state and paid/live behavior U |
| Create refund | `POST /v1/refund/{identifier}` | Deferred | `[U]` excluded from version 1; target identity and provider contract unresolved |
| Verify refund | Provider contract unresolved | Deferred | `[U]` excluded from version 1 |
| List banks | `GET /v1/banks` | None | `[V]` observed Test Mode response shape; temporal membership and live parity not promised |
| List currencies | `GET /v1/currency_supported` | None | `[V/U]` parallel numeric-code/text-name Test Mode shape V; provider mismatch behavior and live parity U |
| Transaction list | `GET /v1/transactions` | Query string | `[D]` documented but deferred from version 1.0 |
| Transaction events | `GET /v1/transaction/events/{ref_id}` | None | `[D]` documented but deferred from version 1.0 |
| Direct charge | `POST /v1/charges?type={method}` | Method-specific | `[D]` documented but deferred from version 1.0 |
| Transfers | `POST /v1/transfers` | JSON | `[D]` documented but deferred from version 1.0 |

# Appendix B - Known Statuses

| Domain | Known values | Unknown handling |
|---|---|---|
| Payment verification | `pending` has V support for the exact untouched Test Mode lifecycle; other listed provider statuses remain D where current documentation supports them | Map unrecognized values to `unknown`, preserve raw, and never derive state from HTTP/envelope/message. Cancellation does not prove `cancelled`. |
| Refund verification | Not a shipped version-1 normalized contract | Provider refund statuses remain deferred/U. |
| Webhook event names | `charge.success` with `status = success` is the provider-verified typed variant | Every other documented/unobserved name, status, or shape uses unknown-event handling and preserves raw. |

# Appendix C - Recommended Application Flow

1. Generate or reserve a unique `txRef` in the application.
2. Persist the pending order/payment intent in the application database.
3. Call `payments.initialize()` exactly once for that attempt.
4. Redirect the customer to `checkoutUrl`.
5. On callback or webhook, call `payments.verify(txRef)`.
6. Compare verified amount, currency, `txRef`, mode, and expected order identity.
7. Update the application state idempotently and deliver value only after successful verification.
8. Persist webhook identity or a stable deduplication key to tolerate repeated delivery.

# Appendix D - References

- **[C1]** Chapa Documentation - Accept Payments: <https://developer.chapa.co/integrations/accept-payments>
- **[C2]** Chapa Documentation - Verify Payments: <https://developer.chapa.co/integrations/verify-payments>
- **[C3]** Chapa Documentation - Webhooks: <https://developer.chapa.co/integrations/webhooks>
- **[C4]** Chapa Documentation - Refund: <https://developer.chapa.co/refund>
- **[C5]** Chapa Documentation - List Banks: <https://developer.chapa.co/transfer/list-banks>
- **[C6]** Chapa Documentation - Supported Currencies: <https://developer.chapa.co/integrations/currency-supported>
- **[C7]** Chapa Documentation - API Responses: <https://developer.chapa.co/integrations/responses>
- **[C8]** Chapa Documentation - All Transactions: <https://developer.chapa.co/transactions/all-transactions>
- **[C9]** Chapa Documentation - Transaction Logs: <https://developer.chapa.co/transactions/transaction-log>
- **[C10]** Chapa Documentation - SDK and Plugins: <https://developer.chapa.co/docs/sdk-plugins>
- **[N1]** NestJS Documentation - Dynamic Modules and `ConfigurableModuleBuilder`: <https://docs.nestjs.com/fundamentals/dynamic-modules>
- **[N2]** NestJS Documentation - Raw Body: <https://docs.nestjs.com/faq/raw-body>
- **[R1]** Node.js Release Working Group - Release Schedule: <https://github.com/nodejs/release>
- **[P1]** npm Documentation - Trusted Publishing: <https://docs.npmjs.com/trusted-publishers/>
- **[P2]** Changesets Documentation: <https://github.com/changesets/changesets>
- **[P3]** npm Documentation - `package.json` dependency and peer-dependency semantics: <https://docs.npmjs.com/cli/configuring-npm/package-json/>
- **[R2]** Node.js - Previous Releases and LTS status: <https://nodejs.org/en/about/previous-releases>

# Appendix E - Approval Checklist

- Product scope approved.
- Repository and package identity approved.
- Public API naming approved.
- Node and Nest compatibility approved.
- Retry and timeout policy approved.
- Webhook ambiguity resolution plan approved.
- Package naming process approved.
- M0.5 contract-verification cases and fixture sanitization rules approved.
- NestJS-first public boundary and internal-core decision approved.
- Operation-specific retry option design approved.
- npm package scope and package name confirmed: `@sye1321/nestjs-chapa`.
- Implementation milestones approved.

# Appendix F - Contract Fixture Manifest

The contract fixture manifest indexes actual sanitized JSON fixture entries. Each entry identifies provenance, sanitization, evidence state, and the normalized rule it supports. The current M0.5 `test/fixtures/chapa/manifest.json` contains the three B fixtures only. Adjudicated C/D/E sanitized observations are indexed by `docs/contracts/2026-08-25-m0.5-contract-freeze-proposal.md`; they are not falsified as fixture entries.

```ts
interface ContractFixtureManifestEntry {
  id: string;
  operation: ChapaOperation | 'webhook';
  caseName: string;
  environment: 'chapa-test-mode';
  capturedAt: string;
  method?: ChapaHttpMethod;
  path?: string;
  httpStatus?: number;
  evidence: 'D' | 'V' | 'U';
  sanitized: true;
  fixturePath: string;
  supports: readonly string[];
  unresolved: readonly string[];
}
```

Fixture review requires two checks: no secret or personal data remains, and the fixture actually supports every contract claim listed in `supports`. File existence is not evidence. Fixtures do not prove live-mode parity. A V claim may instead trace through a human-reviewed sanitized provider observation and explicit maintainer adjudication in the approved contract-freeze matrix; plans and synthetic/local tests alone cannot create V. The Appendix F schema remains fixture-specific and contains no candidate-V state.

# Appendix G - Pre-implementation Decision Summary

| Decision | Final position |
|---|---|
| Product | Ethiopian-led, community-maintained NestJS integration for Chapa; not an official Chapa package. |
| Repository | `Sye-1321/nestjs-chapa`. |
| Package | `@sye1321/nestjs-chapa` under the verified `sye1321` npm account. |
| Core boundary | Framework-independent internally; not a separate public Node.js SDK in version 1. |
| Provider evidence | F5 final matrix: 21 V, 9 U, 0 candidate-V; F6 normative changes applied. |
| Version-1 scope | Hosted initialize, verify, bodyless hosted-checkout cancellation, banks, supported currencies, transaction references, and webhook verification; provider refunds excluded. |
| Lifecycle | M0.5 contract freeze and M1-M6 complete; M7 `1.0.0` stable-freeze candidate prepared and protected publication pending. |
| Retries | Safe reads only; no automatic retry for initialization, cancellation, or future side-effect operations. |
| Webhooks | Required X1 over exact raw bytes; optional supplied C1 validates as secondary consistency only; unknown events preserved. |
| Validation | SDK-owned public contracts with internal Zod; tolerant required-field response parsing. |
| State ownership | No database, queue, workflow, reconciliation, or exactly-once claim. |

> **Implementation Gate**
>
> F7 verified specification/evidence alignment and closed M0.5. The coherent M0.5-F work was merged and verified, M1-M6 were completed against the frozen contract, and the M7 `1.0.0` stable-freeze candidate is prepared while acceptance after review, merge, and green CI and protected publication remain pending. The provider contract freeze remains authoritative; this lifecycle synchronization does not alter normative behavior.
