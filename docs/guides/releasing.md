# Releasing

The single `.github/workflows/release.yml` workflow publishes both release candidates and stable releases. It is manually dispatched from `main` and never runs for pull requests or ordinary pushes. The operator cannot supply an npm dist-tag: the checked-out package version is classified by a fail-closed preflight. Supported `0.x.y-rc.n` versions use `rc` and create GitHub prereleases; the M7 `1.0.0` version uses `latest` and creates a normal GitHub release. Other version forms are rejected.

## GitHub environments

- `chapa-test-mode`: protected release smoke environment. Its only secret is `CHAPA_SECRET_KEY`, used only for the minimal Test Mode lifecycle.
- `npm-release`: protected release-approval environment. It contains no npm token; publication authenticates through npm OIDC Trusted Publishing.

## Namespace bootstrap status

Namespace bootstrap is complete and its workflow and temporary credentials are retired. Versions `0.0.0-bootstrap.3` and `0.0.0-bootstrap.4` are historical namespace-bootstrap artifacts, not release candidates. npm assigned `latest` to the first package publication, and it currently points to `0.0.0-bootstrap.4`; this historical tag state does not make either artifact a normal release.

Trusted Publishing through `release.yml` is now the only npm publication path. The npm Trusted Publisher is bound to GitHub user/organization `Sye-1321`, repository `nestjs-chapa`, workflow `release.yml`, environment `npm-release`, and action `npm publish`.

Both channels publish the exact verified tarball once with `--provenance`. An RC must update only `rc` and preserve `latest`; stable `1.0.0` must update only `latest` and preserve the historical `rc` tag unchanged. This M7-B change freezes `1.0.0` as the stable package version once merged, but the pull request itself does not publish. After review, merge, and green CI, a human separately dispatches the protected `release.yml` workflow from `main`. Local npm publication is not an approved release path.

Immediately after a first publication, the workflow establishes or verifies the immutable `v<version>` source tag at the publishing commit; for this stable release that tag is `v1.0.0`. A reconciliation run for an already-published version requires that tag to exist and uses its resolved commit for the GitHub release; it cannot create the missing tag from a later commit or move a conflicting tag.

The first release candidate, `0.1.0-rc.0`, is published under the npm `rc` dist-tag. It was published through npm Trusted Publishing with GitHub Actions OIDC and signed provenance; no long-lived npm publication token was used. The protected Chapa Test Mode smoke passed, the registry artifact's exact integrity was verified as `sha512-kmZS7U7T5AjWTcTII3t/LmCzHQEeqoca0E1P5Mg/PvJfnIcb05Fa5w4WgxwV7HrQKh2b/i9YaJgBBO3qHV1/yg==`, and registry-installed consumer verification passed on Node 22 and Node 24. The matching GitHub prerelease is `v0.1.0-rc.0`.

The later successful reconciliation run found the immutable exact version already published, verified its version, integrity, and `rc` dist-tag, and completed downstream validation and GitHub prerelease creation without publishing the package a second time. The protected smoke is Test Mode validation and does not establish universal live-production Chapa parity.

Until the protected stable publication succeeds, npm `latest` intentionally remains on the historical `0.0.0-bootstrap.4` artifact. The historical `rc` dist-tag remains on `0.1.0-rc.0`; users who explicitly want that RC can install it through the `rc` tag or exact version:

```sh
npm install @sye1321/nestjs-chapa@rc
```

```sh
npm install @sye1321/nestjs-chapa@0.1.0-rc.0
```

Provenance enforcement is the combination of npm OIDC Trusted Publishing and the explicit supported `npm publish --provenance` mechanism. The workflow does not assert `dist.attestations.provenance.url`, because the current npm registry/CLI does not expose that field reliably. Exact registry integrity verification remains independent and fail-closed.
