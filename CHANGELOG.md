# Changelog

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
- Added provider-offline CI, Changesets status tracking, contributor governance, and sanitized Test Mode contract evidence. No publishing workflow is enabled.
