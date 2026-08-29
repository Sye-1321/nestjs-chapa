# Releasing

All release workflows are manually dispatched from `main`. They never run for pull requests or ordinary pushes.

## GitHub environments

- `chapa-test-mode`: protected RC smoke environment. Its only secret is `CHAPA_SECRET_KEY`, used only for the minimal Test Mode lifecycle.
- `npm-release`: protected release-approval environment. It contains no npm token; RC publication authenticates through npm OIDC Trusted Publishing.

## Namespace bootstrap status

Namespace bootstrap is complete and its workflow and temporary credentials are retired. Versions `0.0.0-bootstrap.3` and `0.0.0-bootstrap.4` are historical namespace-bootstrap artifacts, not release candidates. npm assigned `latest` to the first package publication, and it currently points to `0.0.0-bootstrap.4`; this historical tag state does not make either artifact a normal release.

Trusted Publishing through `release.yml` is now the only npm publication path. The npm Trusted Publisher is bound to GitHub user/organization `Sye-1321`, repository `nestjs-chapa`, workflow `release.yml`, environment `npm-release`, and action `npm publish`.

The first RC is frozen in the repository but has not yet been published. A maintainer may manually run `release.yml` from the selected current `main` commit. It verifies offline, builds the exact candidate before the protected Test Mode smoke, publishes that tarball with `--tag rc --provenance`, waits for bounded registry visibility, verifies its exact version and integrity plus the `rc` dist-tag, tests registry-installed consumers on Node 22 and 24, and finally creates the matching GitHub prerelease.

Provenance enforcement is the combination of npm OIDC Trusted Publishing and the explicit supported `npm publish --provenance` mechanism. The workflow does not assert `dist.attestations.provenance.url`, because the current npm registry/CLI does not expose that field reliably. Exact registry integrity verification remains independent and fail-closed.
