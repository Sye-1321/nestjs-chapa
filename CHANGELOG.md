# Changelog

## 0.1.0-rc.0

### Minor Changes

- 1063adc: Add exact-raw-body webhook verification, the testing signature helper, and the production NestJS module and service integration.
- 5631073: Add the first specification-backed public core contracts and typed error hierarchy while keeping the client, executor, default transport, validation schemas, and retry machinery internal.
- 85c8855: Add fixture-backed bank and supported-currency metadata contracts with safe-read retry behavior.
- 84dd1bc: Add specification-backed payment initialization, verification, hosted-checkout cancellation, and cryptographic transaction reference contracts.
- 43242c1: Harden the pre-release public API, executor cleanup, documentation, verification workflow, coverage, linting, formatting, examples, and CI gates.

### Patch Changes

- 0bd51cd: Establish the private repository foundation, deterministic dual-format package build, API extraction, provider-offline validation, and packed NestJS consumer matrix.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Added validated configuration, one-attempt fetch transport, typed errors, redaction, operation-aware retries for eligible reads, and tolerant response handling.
- Added hosted-payment initialization, verification, cancellation, and transaction-reference generation.
- Added bank and supported-currency metadata resources.
- Added raw-body webhook signature verification, timing-safe comparison, typed parsing, and testing helpers.
- Added synchronous and asynchronous NestJS module registration, provider overrides, and the injectable `ChapaService` facade.
- Added deterministic ESM and CommonJS builds, API contract checks, strict package-content validation, and packed-consumer compatibility coverage for Node.js 22/24 and NestJS 10/11.
- Added provider-offline CI, Changesets status tracking, contributor governance, and sanitized Test Mode contract evidence.
