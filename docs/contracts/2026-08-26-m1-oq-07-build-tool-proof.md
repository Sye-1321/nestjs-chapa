# M1 OQ-07 Build-Tool Proof

**State**: Candidate comparison complete; awaiting maintainer review

## Scope and Versions

This record covers only the inert M1 package boundary. It implements no Chapa behavior and makes no provider request.

- Build host: Node.js 24.18.0 on Windows; both tools support this host.
- Package runtime floors: Node.js 22.0.0 and 24.0.0, exercised with official Docker images.
- Package manager: pnpm 11.24.0, pinned through `packageManager`; its build-host requirement is Node.js 22.13 or later.
- TypeScript: 5.9.3.
- Candidate A: TypeScript `tsc` 5.9.3, non-bundling dual emit.
- Candidate B: stable `tsdown` 0.22.14 with Rolldown 1.2.5, MIT licensed, maintained, targeting Node 22. Its build-host range is `^22.18.0 || >=24.11.0`; that constraint does not narrow the package engines.
- API extraction: Microsoft API Extractor 7.59.0.

## Common Matrix

| Requirement | `tsc` | `tsdown` |
| --- | --- | --- |
| Actual packed tarball installed | PASS | PASS |
| Node 22.0.0 runtime floor | PASS | PASS |
| Node 24.0.0 runtime floor | PASS | PASS |
| NestJS 10, ESM and CJS | PASS | PASS |
| NestJS 11, ESM and CJS | PASS | PASS |
| Root and `./testing` runtime entries | PASS | PASS |
| NodeNext declaration resolution | PASS | PASS |
| Bundler declaration resolution | PASS | PASS |
| Deep/private import rejection | PASS | PASS |
| Decorator compile and execution | PASS | PASS |
| JS source-map generation | PASS | PASS |
| Declaration output | PASS | PASS |
| Declaration maps | PASS | Not emitted by candidate |
| Zod and Nest externalization | PASS | PASS |
| Two clean builds, identical files and SHA-256 | PASS (17 files) | PASS (8 public files) |
| Tarball allowlist | PASS | PASS |
| API Extractor, both entries and formats | PASS | PASS |

The clean consumers installed the generated tarballs, never workspace links. Each candidate was exercised in four consumers: NestJS 10 ESM/CJS and NestJS 11 ESM/CJS. The consumers proved NodeNext and bundler type resolution with strict checking and no TS1479 or unresolved-declaration `any`; executed decorator metadata; loaded both public entries; and confirmed a deep `dist` path is blocked by `exports`.

Runtime imports required no credential and the inert modules contain no network, listener, timer, or filesystem operation. Candidate proof material remained outside both public export graphs and tarballs. The actual tarballs contained only the manifest, approved repository documents, and candidate `dist` files; they contained no research, raw evidence, plan, workflow, changeset, test, script, cache, environment, lockfile, consumer, or proof path.

## Output and Declaration Strategies

The `tsc` candidate emits ESM to `dist/esm/**` and CJS to `dist/cjs/**`. A nested `dist/cjs/package.json` marks only the CJS subtree as CommonJS under the package-level `type: module`. Both trees retain `.js`, `.js.map`, `.d.ts`, and `.d.ts.map` files. Conditional exports provide nested `types` and runtime targets for `import` and `require` at `.` and `./testing`.

The `tsdown` candidate emits `.mjs`, `.cjs`, `.d.mts`, and `.d.cts` at `dist/**`, with conditional format-specific type targets. Its empty public modules are optimized to near-empty runtime files and do not receive public JS maps, while the non-empty private decorator fixture proves its source-map behavior. It emits no declaration maps.

Both candidates left `zod`, `@nestjs/common`, `@nestjs/core`, and `reflect-metadata` as external imports in the non-empty private proof fixture. No browser polyfill or provider dependency appeared. No absolute workstation path appeared in emitted maps or declarations.

## Dependency and API Conclusions

`reflect-metadata` is a dev-only proof dependency for M1. The package's empty runtime does not import it, so it is neither a package runtime dependency nor an additional peer. Nest 10 and 11 consumers supplied their normal metadata environment and passed decorator execution.

API Extractor successfully inspected all eight candidate declaration entry points: root/testing, ESM/CJS, tsc/tsdown. The generated reports were empty public surfaces. This establishes Microsoft API Extractor as the REQ-PKG-15 mechanism; later milestones can commit reviewed reports and detect accidental exports, internal or Zod leakage, unexpected dependency types, and API drift without inventing M1 API.

## Selection

**Selected: TypeScript `tsc` 5.9.3.** Both candidates satisfy the proof boundary, but tsdown provides no requirement-level advantage for the inert two-entry package. The selected non-bundling approach has fewer transformation layers, preserves a transparent one-source-to-one-output boundary, emits declaration maps, and avoids bundler tree-shaking differences for empty public modules. Its explicit nested CJS package marker and conditional exports passed all consumer checks without renaming emitted files.

**Rejected for M1: stable `tsdown` 0.22.14.** It is not rejected for a correctness failure. It passed the common proof, but adds a Rolldown transformation/declaration layer, omits declaration maps, and optimizes empty public entries such that their requested JS maps are absent. Those tradeoffs add moving parts without a frozen-contract benefit over the equally correct non-bundling candidate.

Known limitation: this M1-2 proof uses temporary consumers and candidate manifests. M1-3 must finalize only the selected tsc architecture; M1-4 must create the permanent consumer harness. The package remains private throughout M1.
