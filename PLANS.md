# Implementation Planning Policy

This document defines the implementation-planning policy for `@sye1321/nestjs-chapa`.

## When is an Implementation Plan Mandatory?
A plan is mandatory for material work involving:
- public API/contracts;
- Chapa/provider behavior or M0.5 evidence;
- payment safety/retries/timeouts/idempotency;
- security/cryptography/secrets;
- architecture/module boundaries;
- runtime dependencies;
- compatibility/build/packaging/export policy;
- release/publishing policy;
- governance or specification-affecting changes;
- coordinated multi-file work where design/failure behavior matters.

A plan is optional only for genuinely local, low-risk changes that do not affect those categories.

U-state provider behavior cannot simply be implemented under a plan. U-state provider behavior requires contract verification/evidence or explicit deferral first.

## Plan Lifecycle and Status
1. **Proposed**: Plan is drafted and ready for review.
2. **Approved**: Plan is accepted for implementation.
3. **In Progress**: Work is underway.
4. **Completed**: Work is verified and merged.

## Required Content
An implementation plan must conform to the template at `docs/plans/implementation-plan-template.md`. It must record:
- status and owner;
- goal;
- non-goals;
- current evidence/state;
- requirements and ADR traceability;
- proposed design/files;
- failure/security/reliability considerations;
- tests and exact verification;
- risks/unknowns;
- definition of done;
- discoveries/changes during implementation.

## Handling Discoveries
If discoveries during implementation conflict with the approved plan or the technical specification, implementation must stop. The plan must be updated and re-approved. If a discovery requires a new architectural decision, a new ADR must be proposed and accepted first.

## Plan Retention
Completed plans are retained in the repository history or dedicated planning artifacts to provide context for future development.
