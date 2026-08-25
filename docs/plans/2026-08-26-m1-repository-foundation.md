# Implementation Plan: M1 Repository Foundation

**Status**: Proposed — awaiting maintainer approval
**Owner**: Sye (Sye-1321)

## 1. Goal

M1 establishes the minimum production repository, package, build, test, continuous-integration, release-preview, and contributor foundation required before M2. The exit condition is a packed inert library that installs and resolves correctly in supported ESM and CommonJS NestJS 10 and 11 consumers on Node.js 22 and 24, with governance and the `@sye1321/nestjs-chapa` package identity confirmed.

M1 owns the final OQ-07 build-tool decision. It proves the package boundary without implementing Chapa/provider behavior.

## 2. Scope

M1 may implement only the repository foundation needed to prove:

- package-manager and immutable-lockfile operation;
- package identity, metadata, engines, dependency classes, scripts, and publish boundary;
- TypeScript project structure and inert entry-point scaffolding;
- ESM, CommonJS, declaration, declaration-map, and source-map output;
- root and `./testing` exports-map boundaries;
- a deterministic OQ-07 build-tool comparison and selection;
- lint, format, typecheck, and foundation-test commands;
- packed-tarball content and module-resolution checks;
- clean packed consumers spanning NestJS 10/11, ESM/CJS, and Node 22/24;
- offline/provider-free GitHub Actions CI;
- Changesets, versioning, changelog, package-preview, and trusted-publishing preparation;
- governance, README, roadmap, contribution, and pull-request workflow synchronization;
- separately reviewed repository-protection settings.

One coherent M1 pull request is preferred, with reviewable commits at the checkpoints in Section 23.

## 3. Non-goals

- No Chapa request, credential, provider fixture acquisition, or live/Test Mode smoke execution.
- No reopening or modification of the M0.5 contract freeze or closed evidence.
- No payment initialization, verification, cancellation, references, metadata, webhook verification, or provider refund implementation.
- No transport, request executor, retry engine, provider schema, response normalization, error mapping, webhook cryptography, or secret-handling implementation.
- No fake or placeholder provider behavior.
- No production npm publication, GitHub release, npm token, trusted-publishing execution, or production secret configuration.
- No GitHub repository-setting mutation without a separate maintainer-authorized administrative checkpoint.
- No browser bundle or Express/Fastify runtime dependency.

M2 owns core infrastructure; M3 owns payments and references; M4 owns metadata; M5 owns webhooks. Provider refunds remain excluded from version 1 by the frozen specification.

## 4. Authority and Frozen M0.5 Contract

Authority follows `AGENTS.md`:

1. `docs/specification/TECHNICAL_SPECIFICATION.md`;
2. the maintainer-adjudicated M0.5 freeze in `docs/contracts/2026-08-25-m0.5-contract-freeze-proposal.md`;
3. accepted ADRs recorded by the specification;
4. repository governance;
5. this plan after approval.

M0.5 closed with 30 atomic claims: 21 V, 9 U, 0 candidate-V, and 12 explicit deferrals. M1 proceeds READY WITH EXCLUSIONS. It must preserve at least these exclusions: provider refunds, dedicated duplicate-`txRef` discrimination, unpaid-404 normalization, universal cancellation state, paid/non-cancellable cancellation semantics, provider request-ID mapping, ambiguous reference-field equivalence, C1-only webhook acceptance, provider both-header conflict semantics, Base64 provider behavior, unverified typed webhook events, and live-mode parity.

Applicable frozen requirements include REQ-GOV-01 through REQ-GOV-11, REQ-COMP-01 through REQ-COMP-07, REQ-ARCH-01 through REQ-ARCH-07, REQ-REPO-01 through REQ-REPO-06, REQ-PKG-01 through REQ-PKG-23, REQ-SEC-07 through REQ-SEC-16, REQ-TEST-17 through REQ-TEST-19, REQ-DOC-13 and REQ-DOC-14, AC-PKG-01 through AC-PKG-11, ADR-001 through ADR-006, ADR-013, ADR-014, ADR-018, ADR-019, and OQ-07.

Any need to contradict the frozen specification or expose a U-state provider assumption is a stop condition, not an implicit specification change.

## 5. Current Repository Audit

Audit performed on verified `main` at `dc29b2dc643e395e37117181a0e1b1140ae6fed1` on 2026-08-26.

### 5.1 Existing governance and process artifacts

| Artifact | Current classification | M1 action |
|---|---|---|
| `LICENSE` | Already satisfies M1 | Retain MIT identity. |
| `CODE_OF_CONDUCT.md` | Already satisfies M1 | Retain. |
| `SECURITY.md` | Already satisfies M1 foundation | Retain private-reporting boundary; later confirm package/release wording. |
| `GOVERNANCE.md` | Already satisfies M1 authority model | Retain maintainer, merge, security, and npm release authority. |
| `MAINTAINERS.md` | Already satisfies M1 authority model | Retain active maintainer and review responsibilities. |
| `SUPPORT.md` | Already satisfies M1 foundation | Retain community-maintained support boundary. |
| `PLANS.md` and plan template | Already satisfy M1 planning policy | Retain. |
| Issue forms and security redirection | Already satisfy M1 | Retain; no blind replacement. |
| Pull-request template | Already satisfies the required review headings | Synchronize only final commands/Changesets policy if implementation makes them concrete. |
| `CONTRIBUTING.md` | Needs synchronization | Add actual package-manager, install, validation, consumer-test, and Changesets commands after they exist. |
| `README.md` | Needs synchronization | Replace the title-only placeholder with community ownership, package status, supported versions, v1 scope/exclusions, and foundation commands without documenting unimplemented provider behavior. |
| `ROADMAP.md` | Needs synchronization | Mark M0.5 closed, M1 current, and remove refunds from M4/version-1 scope. |
| `CHANGELOG.md` | Needs synchronization | Integrate the Changesets-generated/versioning flow while preserving existing Unreleased history. |
| `AGENTS.md` | Already governs execution | Do not weaken; synchronize only if concrete M1 commands require it and maintainer approves. |

### 5.2 Existing research and evidence

M0.5 research tooling, sanitized evidence, and fixtures exist. They remain repository-only and must not be imported by production source or included in the npm tarball. The ignored `.raw` directory is empty after authorized post-M0.5 cleanup; no tracked raw file exists.

### 5.3 Missing M1 foundation

The audit found none of the following on current main:

- `package.json` or a package-manager lockfile;
- TypeScript configuration or build configuration;
- `src/**`;
- package-consumer fixtures;
- GitHub Actions workflow files;
- Changesets configuration;
- lint or format configuration;
- API/declaration extraction configuration;
- release workflow/configuration.

## 6. Gap Analysis

| Area | Current state | Required M1 outcome |
|---|---|---|
| Package identity | Named only in governance/specification | Private initial manifest for `@sye1321/nestjs-chapa`, later packable but not published. |
| Dependency graph | None | Exact dependency classes and immutable lockfile. |
| Source/package boundary | No production source | Inert root and testing entry points only; no provider behavior. |
| Build | No tool/config | One selected OQ-07 tool producing verified dual-format artifacts and maps. |
| Types | No declarations | Public declarations resolve without internal/Zod leakage. |
| Testing | Research tests only | Separate production-foundation tests and packed consumer matrix. |
| Package security | No publish allowlist | Explicit `files` allowlist plus tarball assertion; never rely on `.gitignore`. |
| CI | None | Offline, immutable, least-privilege PR validation on Node 22/24. |
| Versioning/release | Changelog only | Changesets and non-publishing release preview. |
| Documentation | Governance mostly present; README/roadmap stale | Synchronize only to implemented foundation and frozen v1 exclusions. |
| Repository controls | Required by specification; not audited as settings in Git | Separate read-only audit and separately authorized settings proposal. |

## 7. OQ-07 Build-Tool Proof Strategy

### 7.1 Candidate set

Keep the comparison to two candidates:

1. **TypeScript `tsc` dual-pass/project-reference build** — the minimal non-bundling baseline. Separate deterministic ESM and CJS emission configurations share strict type settings; TypeScript emits declarations/declaration maps from a single controlled declaration pass.
2. **`tsup` with TypeScript declaration verification** — a controlled esbuild-based bundling candidate configured for ESM and CJS, external dependencies, source maps, and declarations. Generated declarations must still pass `tsc --noEmit`, packed-consumer checks, and declaration-boundary audit.

No Rollup plugin stack, Babel/SWC chain, or third candidate is introduced unless both candidates fail a named criterion and the maintainer approves a plan update.

### 7.2 Common proof fixture

Each candidate builds the same inert proof surface containing:

- a root entry with explicitly foundation-only symbols;
- a distinct `./testing` inert entry;
- a minimal decorator/metadata compilation fixture sufficient to validate NestJS-compatible TypeScript emission without implementing `ChapaModule` or provider behavior;
- an internal-only symbol and internal-only schema-shaped fixture that must not be exported;
- an external import fixture proving Zod and NestJS peers are not bundled or duplicated.

Proof fixtures must not become fake public SDK behavior. Candidate-only material is removed when the selected configuration is finalized unless it is a legitimate inert foundation export.

### 7.3 Deterministic pass/fail matrix

Every row is mandatory; popularity, speed, or convenience cannot compensate for failure.

| Criterion | Proof |
|---|---|
| Node 22 and 24 | Build and packed consumers execute across both CI Node majors. |
| TypeScript 5.7+ | Frozen compiler version satisfies strict typecheck and declaration consumption. |
| Decorators/metadata | Compile and execute the inert Nest-compatible decorator fixture with the selected compiler settings. |
| ESM and CJS | Native ESM import and CommonJS require/import succeed from packed tarball consumers. |
| Declarations/maps | `.d.ts` and required `.d.ts.map` resolve for both public entry points. |
| Source maps | Runtime stack maps to a controlled source location; maps contain no absolute developer path. |
| Exports | Only `.` and `./testing` plus `./package.json` if deliberately approved are resolvable. |
| External dependencies | Zod and Nest peers are absent from bundled code and resolve from intended dependency classes. |
| Server-only output | No IIFE/browser build, browser polyfill, `window`, or injected DOM shim. |
| Determinism | Clean build twice from the same checkout produces the same file list and byte hashes after excluding no fields; unexplained nondeterminism fails. |
| Tarball correctness | Automated allowlist passes and forbidden paths are absent. |
| Consumer installation | Four clean Nest consumer fixtures install the generated tarball, never a workspace link. |
| Public boundary | Declaration/export audit rejects `ChapaClient`, executor internals, private transports/resources, and Zod schemas/types. |
| Import safety | Root and testing imports perform zero network activity and require no Chapa credential. |
| Diagnostics | Stack traces/source maps are usable and no missing runtime dependency appears. |

### 7.4 Selection record

M1-2 records exact tool versions, configurations, commands, outputs, pass/fail results, dependency/bundle inspection, limitations, and the selected candidate. Exactly one candidate proceeds. If neither passes, stop and request approval before expanding the candidate set or changing the specification.

## 8. Package Manager and Lockfile Policy

Propose **pnpm** with a pinned `packageManager` field and committed `pnpm-lock.yaml`.

Rationale and rules:

- strict dependency isolation helps detect undeclared and devDependency-only imports;
- workspace support can orchestrate clean consumer fixtures without linking the package under test;
- CI uses Corepack with the exact pinned pnpm version and `pnpm install --frozen-lockfile`;
- dependency updates change both manifest and lockfile in one reviewed commit;
- install scripts are reviewed and minimized; unexpected lifecycle scripts block installation;
- no alternate lockfile is committed;
- the packed-consumer procedure installs a generated `.tgz` by file path into separately generated clean directories, never `workspace:*`, symlinks, or repository self-resolution.

The exact pnpm version is selected during M1-2 after current Node 22/24 compatibility is verified from authoritative pnpm documentation. Changing package manager later requires an ADR or maintainer-approved plan update.

## 9. Package Skeleton Design

The initial `package.json` must define:

- `name: "@sye1321/nestjs-chapa"`;
- an unreleased initial version and `private: true` until the release-preview gate explicitly reviews removing it;
- community-maintained description, repository, bugs, homepage, author/maintainer, MIT license, funding if applicable, and keywords without implying Chapa endorsement;
- `engines.node: "^22.0.0 || ^24.0.0"` and pinned `packageManager`;
- explicit `type`, `main`, `module` only if justified, `types`, conditional `exports`, and `files` allowlist;
- side-effect policy only after proof; do not assert `sideEffects: false` without import/metadata review;
- scripts for clean, format check/write, lint, typecheck, test, build, pack validation, consumers, and aggregate CI;
- no `prepublishOnly`, `postinstall`, provider, or network script.

The inert source skeleton is limited to:

```text
src/
|-- index.ts              # approved inert root boundary only
`-- testing/
    `-- index.ts          # approved inert testing boundary only
```

Additional folders may be represented by documentation, not empty fake implementations. `src/core`, `ChapaClient`, executor, resources, schemas, Nest module/service, and webhook helpers wait for their owning milestones.

## 10. TypeScript and Build Design

Create a strict shared configuration plus purpose-specific configs selected by the OQ-07 result. Required compiler behavior includes:

- TypeScript 5.7 or later, pinned in the lockfile;
- target appropriate to the Node 22 baseline;
- modern Node module resolution appropriate to each emitted format;
- strict mode, no unchecked accidental public types, consistent casing, and no emit on typecheck;
- decorator and metadata settings proven against NestJS compatibility rather than assumed;
- source maps, declaration maps, and sources-content policy reviewed for path/source leakage;
- clean output directories with no stale cross-format artifacts;
- declarations generated from the same source contract and validated independently;
- no test/research/consumer files emitted into release output.

The selected build must produce an explicit layout such as:

```text
dist/
|-- esm/
|   |-- index.js
|   `-- testing/index.js
|-- cjs/
|   |-- index.cjs
|   `-- testing/index.cjs
`-- types/
    |-- index.d.ts
    `-- testing/index.d.ts
```

Exact extensions/layout are selected by proof, then frozen in package metadata and tests.

## 11. ESM/CJS/Declaration/Source-Map Proof

M1 tests the built and packed artifacts, not repository-relative source imports:

- ESM uses native `import` from an ESM consumer package.
- CJS uses `require` and TypeScript CJS consumption from a CommonJS consumer.
- declarations resolve under Node-oriented and bundler-oriented TypeScript resolution where relevant.
- declaration maps point only to intended source paths and contain no absolute workspace path.
- JavaScript source maps produce a controlled mapped stack trace on Node 22 and 24.
- both formats expose equivalent named public symbols.
- importing either entry point has no credential read, listener, timer, filesystem mutation, or network attempt.

## 12. Exports and Public-Boundary Design

Initial exports are closed by default:

- `.` maps ESM import, CommonJS require, and types to their exact built files.
- `./testing` maps only its separate inert foundation entry.
- `./package.json` is included only if a concrete consumer need is approved; otherwise it remains private.
- no wildcard export and no `dist/*`, `src/*`, `core/*`, or other deep import.

Automated checks must prove private paths fail resolution. A declaration/export allowlist prevents future leakage of `ChapaClient`, `ChapaRequestExecutor`, internal schemas, Zod types, transport internals, and private resource implementations. M1 does not add future root exports merely because the specification names them; those exports appear only when their owning milestone implements them.

## 13. Dependency and Peer-Dependency Policy

| Class | M1 policy |
|---|---|
| Runtime dependency | Zod only, pinned to an approved compatible range, external to all build outputs, not re-exported, and absent from public declarations. |
| Peer dependencies | `@nestjs/common` and `@nestjs/core` ranges covering majors 10 and 11, marked required and external. |
| `reflect-metadata` | Do not add by assumption. Add as peer/runtime only if the packed decorator/consumer proof demonstrates a requirement and the maintainer approves the exact classification. |
| Development dependencies | Exact tools required for TypeScript, selected build, lint/format, Changesets, package/declaration audit, and supported consumer fixtures. Avoid overlapping tools. |
| Forbidden runtime dependencies | Express, Fastify, database/ORM, Redis, queues, event buses, browser polyfills, full platforms, and third-party Chapa SDKs. |

The build emits a dependency/externalization report or equivalent inspection. Consumer installation proves there is no hidden devDependency reliance or duplicated bundled runtime dependency.

## 14. Test Foundation

Use Node's built-in test runner for M1 foundation checks unless OQ-07 proof demonstrates a concrete unsupported need. Avoid adding a second test framework merely for inert scaffolding.

Foundation tests cover:

- package metadata and engines;
- exact export allowlist and private-path rejection;
- ESM/CJS parity;
- declaration resolution and declaration-leak scanning;
- import-time zero-network/zero-credential behavior;
- build determinism and stale-output prevention;
- external dependency and browser-polyfill absence;
- tarball allowlist/denylist;
- documentation command validation where implemented.

Research tests remain separate and are not imported into production tests or published.

## 15. Packed Consumer Matrix

The test harness first runs the selected clean build, produces one actual npm-compatible `.tgz`, validates its contents, and installs that exact tarball into fresh isolated consumer directories with their own manifests and dependency installations.

| Consumer | NestJS | Module form | Primary CI Node |
|---|---:|---|---:|
| A | 10 | ESM | 22 |
| B | 10 | CJS | 24 |
| C | 11 | ESM | 24 |
| D | 11 | CJS | 22 |

The distribution covers every Nest major, module form, and Node major twice without an eight-job Cartesian product. A small additional build/test matrix runs the foundation suite on both Node majors. Consumers must:

- install the tarball rather than link the repository;
- compile under their declared TypeScript/module configuration;
- import/require `@sye1321/nestjs-chapa` and `@sye1321/nestjs-chapa/testing`;
- reject private/deep paths;
- resolve declarations and runtime dependencies;
- prove no reliance on repository devDependencies;
- prove package import performs no network action and requires no Chapa credential.

Temporary consumer installations and tarballs are ignored and removed by deterministic cleanup; they never enter package contents.

## 16. npm-Pack Content and Security Policy

Use `package.json.files` as the primary allowlist and an independent tarball inspection as enforcement. `.gitignore` is not a publish boundary.

Expected allowlisted release content is limited to reviewed files such as:

- compiled ESM and CJS output;
- declarations, declaration maps, and JavaScript source maps;
- published `package.json`;
- `README.md`, `LICENSE`, `CHANGELOG.md`, and `SECURITY.md` where approved.

The tarball validator rejects any unallowlisted path and specifically rejects:

- `research/**` and `.raw/**`;
- `docs/plans/**`, contract-research internals, and non-release documentation;
- M0.5 fixtures unless a later `./testing` design deliberately copies a separately approved sanitized subset;
- source/test/consumer fixtures not intentionally published;
- `.git/**`, `.github/**`, `.changeset/**`, local configs, caches, coverage, and temporary tarballs;
- environment files, credentials, authorization material, secret-like values, and absolute local paths;
- lockfiles unless a reviewed publication reason exists.

Run `npm pack --dry-run --json` and an actual tarball listing/inspection. Verify package name/version, file modes, sizes, checksums only for build determinism (not raw evidence), and absence of lifecycle scripts or unexpected bundled dependencies.

## 17. CI Design

Normal pull-request CI remains offline and provider-free. Proposed jobs:

1. **install-policy** — checkout, pinned Corepack/pnpm, Node 22, frozen-lockfile install, lockfile/package-script audit.
2. **quality** — format check, lint, typecheck, documentation command/link/example checks that exist in M1.
3. **foundation-test** — Node 22 and 24 matrix for deterministic unit/foundation tests and import-safety checks.
4. **build-package** — selected clean build, declaration/export audit, source-map check, dependency externalization, `npm pack --dry-run`, actual tarball allowlist, and package type-resolution analysis.
5. **consumer-matrix** — four packed NestJS/module consumers distributed across Node 22/24.
6. **security-leak** — secret scanning, forbidden-path/package scan, dependency audit policy, and verification that no provider network workflow/script exists.

Jobs use least-privilege read-only permissions, explicit timeouts, concurrency cancellation for superseded PR runs, and current action SHAs pinned according to repository policy. Cache only the pnpm content-addressable store keyed by OS, Node major, pnpm version, and lockfile hash; never cache `node_modules`, build output, tarballs, consumer installations, or credentials.

No Chapa secret, provider request, protected Test Mode smoke, npm publication, or write token belongs in ordinary M1 CI.

## 18. Changesets and Versioning

Add a minimal `.changeset/config.json` for the single package with the default base branch `main`, public access intent, and changelog behavior reviewed against the solo-maintainer model.

- package-impacting PRs require an appropriate changeset after configuration;
- documentation/governance-only changes may remain N/A as already documented;
- version commands update package version and changelog only in an authorized release preparation;
- the existing `CHANGELOG.md` history is preserved and synchronized rather than discarded;
- M1 validates Changesets status and preview output but creates no actual release.

## 19. Release Preview and Trusted-Publishing Boundary

M1 creates a non-publishing release-preview command/workflow design that:

- validates a clean build and full suite;
- previews Changesets/version/changelog effects without committing them;
- creates and inspects the tarball;
- installs it in consumers;
- reports package contents and provenance readiness;
- uses `npm publish --dry-run` only if it is demonstrably non-publishing and separately reviewed.

Trusted-publishing preparation may document the intended GitHub environment, npm package identity, OIDC permissions, provenance flag, and release authority. It must not configure npm production access, create tokens/secrets, publish, create a GitHub release, or enable a release workflow capable of publication without a later explicit release gate.

## 20. Governance and Contributor Synchronization

Do not replace established governance. M1 synchronizes only concrete drift:

- `README.md`: community-maintained/non-endorsed identity, supported Node/Nest matrix, current pre-release status, frozen v1 scope, provider-refund exclusion, and commands that actually exist.
- `ROADMAP.md`: M0.5 closed; M1 current; M4 metadata-only; refunds deferred outside v1 until a new evidence/specification milestone.
- `CONTRIBUTING.md`: pinned pnpm/Corepack setup, frozen install, quality/build/test/consumer/pack commands, Changesets rules, and provider-free normal CI.
- `CHANGELOG.md`: Changesets-compatible flow while retaining prior entries.
- pull-request template: only command/Changesets wording needed after the tooling exists.
- `SECURITY.md`, `GOVERNANCE.md`, `MAINTAINERS.md`, `SUPPORT.md`, issue forms, and code of conduct: retain unless the implementation audit finds a specific frozen-contract inconsistency.

Release authority must continue to match `GOVERNANCE.md` and `MAINTAINERS.md`. Public wording must not imply Chapa ownership or endorsement.

## 21. GitHub Repository Settings and Protection

Committed files cannot prove repository settings. M1 performs a read-only settings audit and prepares a separate maintainer action list for:

- default branch and branch protection/ruleset on `main`;
- required status checks using final stable job names;
- pull-request requirement and conversation resolution;
- force-push/deletion prohibition;
- review requirements compatible with the documented solo-maintainer model;
- least-privilege Actions defaults and fork-PR secret isolation;
- private vulnerability reporting, Dependabot/security alerts, and CodeQL feasibility;
- release environment and trusted-publishing protections for a later milestone.

No setting is mutated during plan approval. Any settings change is separately authorized after workflows and required check names exist, to avoid locking the repository behind nonexistent checks.

## 22. Security and Leak Checks

M1 validation must prove:

- no committed credential, authorization value, `.env`, private key, provider payload/signature/digest, raw evidence, or real identifier;
- no secret is required to install, build, test, pack, or import;
- normal CI and package scripts contain no provider URL invocation or network probe;
- tarball excludes research/evidence, GitHub internals, consumer installations, and developer configuration;
- source maps/declarations contain no absolute local paths, credentials, or internal implementation types;
- package imports have no side effects that open listeners, schedule work, mutate files, or access credentials;
- dependency and lifecycle-script review is recorded before lockfile approval;
- generated artifacts are reproducible and reviewed rather than blindly committed.

## 23. Phase and Checkpoint Strategy

### M1-1 — Plan approval and repository audit

- Approve this plan and its actual-state audit.
- Confirm pnpm proposal, two-candidate OQ-07 matrix, inert skeleton boundary, and no M2-M5 behavior.
- No package/source/tool installation occurs before approval.

### M1-2 — Package manager, package skeleton, and OQ-07 proof

- Pin pnpm and create the initial manifest/lockfile.
- Create only the approved inert proof surface.
- Install the minimal candidate/proof dependencies.
- Execute the common pass/fail matrix for `tsc` dual-pass and `tsup`.
- Record and obtain maintainer approval for exactly one selected build tool before finalizing the package architecture.

### M1-3 — Selected build, exports, and package boundary

- Remove rejected candidate tooling/configuration.
- Finalize TypeScript/build configs, dual outputs, declarations/maps, exports, dependency externalization, declaration audit, and tarball allowlist.
- Preserve inert source scope.

### M1-4 — Foundation tests and packed consumer matrix

- Add Node foundation tests, deterministic build checks, package-content tests, and four clean packed consumers.
- Prove Node 22/24, NestJS 10/11, ESM/CJS, declarations, private-path rejection, and import safety.

### M1-5 — CI, Changesets, release preview, and governance synchronization

- Add offline CI jobs, Changesets, non-publishing release preview, leak controls, and exact governance/docs synchronization.
- Perform read-only repository-settings audit and prepare the separate settings action list.

### M1-6 — Final validation and coherent PR

- Run the complete clean-clone/frozen-install/build/test/pack/consumer/security validation.
- Confirm no M0.5, provider, or M2-M5 drift.
- Prepare one coherent M1 pull request with reviewable commits and the final OQ-07 decision record.
- Do not publish or mutate repository settings as part of PR creation.

## 24. Stop and Escalation Conditions

Stop and request maintainer direction if:

- M1 requires changing the M0.5 freeze or normative specification;
- a provider refund or other Chapa operation appears necessary;
- a Chapa request, real credential, or protected smoke workflow appears necessary;
- build/package proof requires exporting `ChapaClient`, executor internals, provider schemas, Zod schemas/types, or fake provider behavior;
- the frozen Node/Nest/TypeScript/output contracts cannot be represented coherently;
- both OQ-07 candidates fail a mandatory criterion;
- package identity conflicts with npm ownership or GitHub governance;
- existing governance materially conflicts with the specification;
- `reflect-metadata` classification remains ambiguous after the controlled proof;
- a tool requires browser polyfills, bundles external runtime/peer dependencies, produces unsafe declarations/maps, or cannot pass clean packed consumers;
- CI requires secrets or provider access;
- package contents cannot be constrained without deleting or rewriting M0.5 evidence;
- a dependency introduces an unreviewed license, lifecycle-script, security, or maintenance risk.

No stop condition authorizes silent scope expansion, specification change, or provider research.

## 25. Definition of Done

M1 is complete only when:

- governance and package identity are confirmed and synchronized;
- one package manager/version and one lockfile are enforced;
- OQ-07 selects exactly one build tool through the approved proof matrix;
- a deterministic clean build emits working ESM, CJS, declarations, declaration maps, and source maps;
- the root and `./testing` exports work and all private paths remain inaccessible;
- Zod and NestJS peers are external, correctly classified, and not leaked through declarations;
- Node 22/24 and NestJS 10/11 packed consumer coverage passes for ESM and CJS;
- the actual tarball installs into clean consumers and contains only the approved allowlist;
- install, format, lint, typecheck, foundation tests, build, package audit, consumers, and leak checks pass offline with a frozen lockfile;
- normal PR CI is provider-free and least privilege;
- Changesets and a non-publishing release preview work without tokens or publication;
- documentation and contributor workflow describe only commands and behavior that exist;
- repository-settings actions are documented separately and any mutation receives separate authorization;
- no M0.5 freeze/evidence, provider behavior, M2-M5 implementation, real secret, or provider request is introduced;
- one coherent M1 PR is ready for maintainer review;
- actual verification commands and results are recorded without invention.

## 26. Discoveries and Plan Updates

- Post-M0.5 cleanup completed before this plan: the merged local and remote `research/m0.5-f-contract-freeze` branches were deleted normally, remote references were pruned, and the explicitly authorized ignored raw-capture directory was deleted without content access and recreated empty. No tracked raw file exists.
- The repository already has the required core governance documents, issue forms, security redirection, pull-request template, planning policy, and review checklist. M1 should synchronize rather than recreate them.
- `README.md` is currently title-only. `ROADMAP.md` still describes M0.5 as future work and incorrectly assigns refunds to M4; both require M1 synchronization to the frozen contract.
- `CONTRIBUTING.md` already anticipates Changesets in M1 but cannot yet provide real install/test/build commands.
- No package manifest, lockfile, TypeScript/build config, production source, consumer test fixture, workflow, Changesets config, lint/format config, API extraction config, or release config exists.
- OQ-07 remains deliberately unresolved until M1-2 compares `tsc` dual-pass and `tsup` against one mandatory proof matrix. This plan selects neither tool.
- pnpm is proposed, not installed or frozen by this planning checkpoint.
- This planning checkpoint creates no package/source/workflow file, installs no dependency, makes no provider request, uses no secret, and does not modify the M0.5 freeze or specification.
