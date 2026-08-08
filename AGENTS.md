# Agent Execution Policy

This file defines the repository execution policy for automated coding agents and repository contributors working through automated tooling. It is completely tool-neutral and contains no model-specific instructions.

## Authority and Source of Truth
1. `docs/specification/TECHNICAL_SPECIFICATION.md` remains the normative authority.
2. Verified provider evidence (M0.5).
3. Accepted ADRs.
4. Repository governance.
5. Approved implementation plans.
6. Source code and tests.
7. External recommendations.

An ADR cannot override or silently amend the specification. A specification change requires explicit maintainer approval through the project's specification change-control process. An ADR may document the rationale for an approved specification revision, but is not sufficient authority by itself. If implementation requires contradicting the specification, stop and escalate before editing code or the specification.

## Mandatory Rules
- **Read-before-edit**: Always read the following before making edits:
  - the relevant specification requirements;
  - applicable verified M0.5 fixtures/evidence;
  - relevant accepted ADRs;
  - the active approved implementation plan;
  - affected source/tests.
- **Scope Discipline**: Broad unrelated refactors are prohibited. Keep public API changes strictly inside approved plans.
- **Traceability**: All decisions must trace back to requirements, evidence, or ADRs.
- **M0.5 Gate**:
  - Repository governance, tooling, package skeleton, CI, build proof, consumer-test scaffolding, and disposable M0.5 research infrastructure may proceed as authorized by M1.
  - Provider-dependent production payment behavior remains blocked until the corresponding M0.5 safety-critical contracts are V-state or explicitly deferred.
  - No implementation may silently promote U-state Chapa behavior into a public contract.
- **Ambiguity & Conflict**: If the specification is ambiguous or internally contradictory, stop and escalate. Do not guess.
- **Test Integrity**: Weakening or deleting tests simply to make implementation pass is prohibited.
- **Verification**: Inventing successful verification is prohibited. Report commands actually executed and explicitly note any checks not run.
- **Secret Handling**: Real secrets and credentials must never be committed or emitted in logs or summaries.

## Required Completion Handoff
Upon completing a task, you must provide a handoff report that includes:
- files changed;
- requirements/evidence/ADRs addressed;
- commands actually executed and results;
- checks not run;
- assumptions;
- unresolved/blocking issues.

Adherence to this policy is mandatory for all automated execution and tool-assisted contributions.
