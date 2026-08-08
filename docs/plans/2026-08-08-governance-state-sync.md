# Implementation Plan: Governance State Synchronization

**Status**: Approved
**Owner**: Sye (Sye-1321)

## Goal
Produce a narrowly scoped implementation plan that synchronizes repository governance documentation and configuration with the actual current GitHub repository state. Specifically, this updates documentation to reflect the recent merging of issue templates and the enablement of GitHub Private Vulnerability Reporting, without altering product architecture, Chapa contracts, M0.5 evidence, public API, package behavior, or the approved technical specification.

## Scope
The following files are authorized for modification:
1. `docs/plans/2026-08-08-governance-state-sync.md`
2. `SECURITY.md`
3. `.github/ISSUE_TEMPLATE/config.yml`
4. `SUPPORT.md`
5. `CHANGELOG.md`

## Non-Goals
Explicitly, this work does **NOT**:
- modify `docs/specification/TECHNICAL_SPECIFICATION.md`;
- modify `AGENTS.md` or `PLANS.md`;
- add production SDK code;
- create `src/`;
- create `package.json`;
- install dependencies;
- add CI/workflows;
- enable or configure branch protection;
- perform M0.5 Chapa provider probes;
- create provider fixtures;
- change Chapa endpoint assumptions;
- change retry/idempotency/webhook contracts;
- change public API;
- create a release or tag;
- configure the Code of Conduct private-reporting channel;
- retrospectively rewrite merged commits.

## Requirements / Evidence / ADR Traceability
- **[REQ-GOV-03]**: Issue templates for bugs, documentation, feature requests, and security redirection. This plan completes the security redirection configuration in `config.yml`.
- **[AC-SEC-04]**: Confidential security reporting. This plan synchronizes `SECURITY.md` and `config.yml` with the actual enablement of GitHub Private Vulnerability Reporting.
- **Repository Planning/Governance Policy**: Ensures all governance documentation correctly reflects the state of the repository.
- **[REQ-GOV-05]**: Branch protection and CI. *Note: This remains a still-deferred M1 item. This plan does NOT satisfy branch protection or CI.*

## Current State / Evidence
- PR #1 established the governance foundation.
- PR #2 implemented the structured GitHub issue forms and was merged.
- GitHub Private Vulnerability Reporting is now enabled, making the future-tense wording in `SECURITY.md` ("once enabled") stale.
- `config.yml` only disables blank issues and lacks a security contact link.
- `SUPPORT.md` does not currently explicitly carve out security vulnerabilities from standard GitHub Issues.
- `CHANGELOG.md` does not yet reflect the new templates or this state synchronization.

## Proposed Design and Files

### 1. `SECURITY.md`
- Synchronize with the fact that GitHub Private Vulnerability Reporting is now enabled.
- Remove the stale future-tense/manual-enable wording ("once enabled", "is a manual M1 gate").
- Preserve the rule that vulnerabilities MUST NOT be reported through public issues, discussions, or PRs.
- Preserve the pre-release supported-version matrix (`main`).
- Retain the current security-response authority (initial maintainer). Do not invent an email or other channel.

### 2. `.github/ISSUE_TEMPLATE/config.yml`
- Preserve `blank_issues_enabled: false`.
- Add a single `contact_links` entry for security reporting using the GitHub-supported structure (`name`, `url`, `about`).
- The `url` must use a validated absolute HTTPS URL for this repository's private vulnerability-reporting entry point (expected target: `https://github.com/Sye-1321/nestjs-chapa/security/advisories/new`).
- The exact URL and GitHub issue-chooser behavior must be validated before merge. The contact must direct to confidential GitHub vulnerability reporting, never to a public issue.
- Do not add unrelated contact links.

### 3. `SUPPORT.md`
- Preserve standard GitHub Issue instructions for ordinary bugs and feature requests.
- Add an explicit rule stating that suspected security vulnerabilities must follow `SECURITY.md` / private reporting and must NOT be opened publicly.
- Do not invent support guarantees or response SLAs.

### 4. `CHANGELOG.md`
- Under `[Unreleased]`, append entries for:
  - Structured GitHub issue forms for bug reports, documentation, and feature requests.
  - Governance and security-reporting synchronization reflecting enabled Private Vulnerability Reporting.
- Preserve Keep a Changelog and Semantic Versioning framing without claiming a package release or version.

## Failure / Security / Reliability Considerations
- an incorrect security contact URL could misdirect vulnerability reporters;
- `SECURITY.md`, `SUPPORT.md`, the issue forms, and `config.yml` must provide consistent public-vs-private reporting guidance;
- the security redirect must never point to a public issue creation flow;
- no alternative email address or unsupported security channel may be invented;
- if the intended GitHub private-reporting target cannot be validated, implementation must stop rather than substituting a guessed route.

## Tests
No code tests are applicable for this governance documentation slice.

## Exact Verification Commands

### Pre-Commit Working-Tree Verification
These commands inspect the actual working-tree implementation before commit:
```bash
git status
git diff --check
git --no-pager diff --name-status
git --no-pager diff
git --no-pager diff -- docs/specification/TECHNICAL_SPECIFICATION.md
```

Also require explicit checks that:
- only the five authorized paths are changed;
- `TECHNICAL_SPECIFICATION.md` is untouched;
- no `src/` exists;
- no `package.json` is introduced;
- no `.github/workflows/` is introduced;
- no secrets or PII are added;
- `config.yml` uses valid GitHub `contact_links` structure;
- the security contact uses an absolute HTTPS URL;
- the target opens GitHub's confidential vulnerability-reporting mechanism, not public issue creation.

### Post-Commit / Branch Verification
```bash
git status
git diff --check main...HEAD
git --no-pager diff --name-status main...HEAD
git --no-pager diff main...HEAD
git --no-pager diff main...HEAD -- docs/specification/TECHNICAL_SPECIFICATION.md
git --no-pager log --oneline main..HEAD
```

## Risks / Open Questions
- Confirm the final absolute GitHub Private Vulnerability Reporting URL and verify that the configured contact link renders correctly in the repository issue chooser before merge. If this cannot be validated, implementation stops instead of broadening scope or inventing another disclosure mechanism.

## Definition of Done
- `SECURITY.md` updated to reflect enabled private vulnerability reporting.
- `config.yml` updated with a valid `contact_links` security redirect pointing to an absolute HTTPS URL for confidential reporting.
- `SUPPORT.md` updated with explicit security report redirection.
- `CHANGELOG.md` reflects recent governance changes.
- All verification commands executed and criteria passed.
- No other files modified.
