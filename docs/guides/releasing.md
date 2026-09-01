# Releasing

The single `.github/workflows/release.yml` workflow is the authoritative mechanism for release-candidate and stable publication. It is manually dispatched from current `main` and never runs for pull requests or ordinary pushes. The operator cannot supply an npm dist-tag: the checked-out package version is classified by a fail-closed preflight. Supported `0.x.y-rc.n` versions use `rc` and create GitHub prereleases; the currently supported stable version, `1.0.0`, uses `latest` and creates a normal GitHub release. Other version forms are rejected.

## Current stable state

`@sye1321/nestjs-chapa@1.0.0` is the current stable package, and npm `latest` points to `1.0.0`. It was published through the protected workflow with OIDC Trusted Publishing, signed provenance, protected Chapa Test Mode smoke, immutable `v1.0.0` source tagging, and registry-installed Node 22 and Node 24 consumer verification. The historical `rc` channel remains on `0.1.0-rc.0`.

## GitHub environments

- `chapa-test-mode`: protected release smoke environment. Its only secret is `CHAPA_SECRET_KEY`, used only for the minimal Test Mode lifecycle.
- `npm-release`: protected release-approval environment. It contains no npm token; publication authenticates through npm OIDC Trusted Publishing.

## Historical bootstrap and release candidate

Namespace bootstrap is complete and its workflow and temporary credentials are retired. Versions `0.0.0-bootstrap.3` and `0.0.0-bootstrap.4` are historical namespace-bootstrap artifacts, not release candidates. npm initially assigned `latest` to the first package publication; the completed stable release moved `latest` to `1.0.0`.

Trusted Publishing through `release.yml` is now the only npm publication path. The npm Trusted Publisher is bound to GitHub user/organization `Sye-1321`, repository `nestjs-chapa`, workflow `release.yml`, environment `npm-release`, and action `npm publish`.

The first release candidate, `0.1.0-rc.0`, was published under the npm `rc` dist-tag through npm Trusted Publishing with GitHub Actions OIDC and signed provenance; no long-lived npm publication token was used. The protected Chapa Test Mode smoke passed, registry integrity was verified, and registry-installed consumer verification passed on Node 22 and Node 24. Its matching GitHub prerelease is `v0.1.0-rc.0`.

## Future releases

The protected workflow remains the only npm publication path for future releases; local or manual npm publication is prohibited. Before a future stable version can be released, its version form must be deliberately admitted by the fail-closed preflight. A human dispatches the workflow from current `main`. Both channels publish the exact verified tarball once with `--provenance`: an RC updates only `rc` and preserves `latest`, while a stable release updates only `latest` and preserves the historical `rc` tag. The `npm-release` environment contains no npm token.

Immediately after a first publication, the workflow establishes or verifies the immutable `v<version>` source tag at the publishing commit. A reconciliation run for an already-published version requires that tag to exist and uses its resolved commit for the GitHub release; it cannot create the missing tag from a later commit or move a conflicting tag. Registry lookups and consumers fail closed if the published artifact cannot be verified.

The protected smoke is Test Mode validation and does not establish universal live-production Chapa parity. The historical RC remains installable through the `rc` tag or exact version:

```sh
npm install @sye1321/nestjs-chapa@rc
```

```sh
npm install @sye1321/nestjs-chapa@0.1.0-rc.0
```

Provenance enforcement is the combination of npm OIDC Trusted Publishing and the explicit supported `npm publish --provenance` mechanism. The workflow does not assert `dist.attestations.provenance.url`, because the current npm registry/CLI does not expose that field reliably. Exact registry integrity verification remains independent and fail-closed.
