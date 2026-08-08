# Implementation Plan: Governance State Synchronization

**Status**: Completed
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
- The plan must require validation that:
  - the URL is absolute HTTPS;
  - it refers to this repository;
  - it is intended for confidential vulnerability reporting;
  - it does not create a public GitHub issue.
- Do not add unrelated contact links.
- Do not invent an email or alternative disclosure mechanism.

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
- validate `config.yml` YAML syntax/structure;
- confirm `blank_issues_enabled` remains false;
- confirm exactly one intended security contact link is added;
- confirm `contact_links` uses name, url, and about;
- confirm the URL is absolute HTTPS;
- confirm the URL targets this repository's private GitHub vulnerability-reporting flow;
- confirm GitHub Private Vulnerability Reporting remains enabled;
- confirm `SECURITY.md`, `SUPPORT.md`, `config.yml`, and all issue forms consistently prohibit public vulnerability disclosure;
- confirm no public issue-creation URL is used.

### Post-Commit / Branch Verification
```bash
git status
git diff --check main...HEAD
git --no-pager diff --name-status main...HEAD
git --no-pager diff main...HEAD
git --no-pager diff main...HEAD -- docs/specification/TECHNICAL_SPECIFICATION.md
git --no-pager log --oneline main..HEAD
```

### Post-Merge Activation Verification
After the governance synchronization PR is merged into `main`, the maintainer must verify on GitHub that:
1. Open the repository's New Issue / issue-template chooser.
2. Confirm the security contact option is rendered.
3. Activate that option.
4. Confirm it opens GitHub's confidential vulnerability-reporting flow rather than public issue creation.
5. Confirm ordinary bug, documentation, and feature-request forms still render.
6. Confirm blank public issues remain disabled for normal contributors.

If this post-merge activation check fails:
- do not enter M0.5;
- open a narrowly scoped corrective governance PR;
- do not substitute a guessed disclosure mechanism.

## Risks / Open Questions
- Pre-merge: validate configuration structure and private-reporting target.
- Post-merge: validate actual default-branch issue-chooser rendering and navigation.
- An invalid or unverified security target must not be replaced with a guessed route.

## Discoveries / Plan Updates
- **2026-08-08**:
  - GitHub issue-chooser configuration is activated/rendered from the default branch;
  - therefore final rendered chooser behavior cannot be verified from this unmerged feature branch;
  - pre-merge verification will validate configuration correctness and the confidential target;
  - final rendered chooser validation becomes an explicit post-merge activation check;
  - this discovery does not change implementation scope, architecture, requirements, provider behavior, or public API.
  - Implementation Note: Validated that target URL `https://github.com/Sye-1321/nestjs-chapa/security/advisories/new` is an absolute HTTPS URL belonging to repository `Sye-1321/nestjs-chapa` targeting GitHub Private Vulnerability Reporting, and confirmed GitHub Private Vulnerability Reporting remains enabled.
- **2026-08-08 (Post-Merge Verification & Closeout)**:
  - PR #3 was merged into main;
  - the three structured issue forms render correctly;
  - the GitHub-native security-policy entry opens `/security/policy`;
  - the custom security contact link opens `/security/advisories/new`, correctly reaching GitHub's confidential vulnerability-reporting flow without creating a public issue;
  - blank public issues remain disabled for ordinary contributors (`blank_issues_enabled: false`); the visible maintainer-only blank issue option is expected behavior for repository maintainers;
  - duplicate visible title wording ("Report a security vulnerability") was discovered between GitHub's native security entry and the custom contact link;
  - the custom link was renamed to "Submit a private vulnerability report" to resolve title ambiguity in the chooser without changing its target URL or confidential security behavior.

## Definition of Done

For the implementation PR to be merge-ready:
- `SECURITY.md` reflects enabled Private Vulnerability Reporting;
- `config.yml` contains valid security contact configuration;
- `SUPPORT.md` contains the security exception;
- `CHANGELOG.md` reflects the governance changes;
- all pre-merge verification passes;
- only authorized files change;
- specification/package/code/M0.5 boundaries remain untouched.

For the overall governance synchronization to be operationally closed:
- the PR has been merged into `main`;
- the post-merge issue-chooser activation check has passed.
