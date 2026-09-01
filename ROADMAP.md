# Roadmap

This roadmap records the milestones that delivered the stable `@sye1321/nestjs-chapa` 1.0 release, as defined in the technical specification.

- **M0 - Specification**: Approved architecture, public boundary, preliminary endpoint matrix.
- **M0.5 - Contract verification (closed)**: Evidence inventory, adjudication, fixtures, and contract freeze completed.
- **M1 - Repository foundation (completed)**: Governance, package skeleton, provider-offline CI, deterministic dual build, API extraction, packing, and consumers completed.
- **M2 - Core infrastructure (completed)**: Configuration, one-attempt transport, request executor, errors, validation, logging, and safe-read retries.
- **M3 - Payments (completed)**: Initialize, verify, cancel, and references.
- **M4 - Metadata (completed)**: Banks and supported currencies. Provider refunds remain outside version 1.
- **M5 - Webhooks and NestJS integration (completed)**: Raw-body verification, event parsing, module registration, and service integration.
- **M6 - Release candidate (completed)**: Repository hardening, documentation, consumer tests, security review, protected sandbox smoke, and the `0.1.0-rc.0` release completed.
- **M7 - Stable 1.0 (completed)**: `1.0.0` was published to npm (`latest`) with Trusted Publishing provenance after protected Test Mode smoke, then released normally on GitHub from the immutable `v1.0.0` source tag; Node 22 and 24 registry consumers passed.

Future work enters normal maintenance and evidence-driven evolution. New provider domains require separate evidence and specification milestones.
