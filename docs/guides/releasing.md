# Releasing

All release workflows are manually dispatched from `main`. They never run for pull requests or ordinary pushes.

## GitHub environments

- `chapa-test-mode`: protected RC smoke environment. Its only secret is `CHAPA_SECRET_KEY`, used only for the minimal Test Mode lifecycle.
- `npm-release`: protected release-approval environment. It contains no npm token; RC publication authenticates through npm OIDC Trusted Publishing.

## Namespace bootstrap status

Namespace bootstrap is complete and its workflow and temporary credentials are retired. Versions `0.0.0-bootstrap.3` and `0.0.0-bootstrap.4` are historical namespace-bootstrap artifacts, not release candidates. npm assigned `latest` to the first package publication, and it currently points to `0.0.0-bootstrap.4`; this historical tag state does not make either artifact a normal release.

Trusted Publishing through `release.yml` is now the only npm publication path. The npm Trusted Publisher is bound to GitHub user/organization `Sye-1321`, repository `nestjs-chapa`, workflow `release.yml`, environment `npm-release`, and action `npm publish`.

The first release candidate, `0.1.0-rc.0`, is published under the npm `rc` dist-tag. It was published through npm Trusted Publishing with GitHub Actions OIDC and signed provenance; no long-lived npm publication token was used. The protected Chapa Test Mode smoke passed, the registry artifact's exact integrity was verified as `sha512-kmZS7U7T5AjWTcTII3t/LmCzHQEeqoca0E1P5Mg/PvJfnIcb05Fa5w4WgxwV7HrQKh2b/i9YaJgBBO3qHV1/yg==`, and registry-installed consumer verification passed on Node 22 and Node 24. The matching GitHub prerelease is `v0.1.0-rc.0`.

The later successful reconciliation run found the immutable exact version already published, verified its version, integrity, and `rc` dist-tag, and completed downstream validation and GitHub prerelease creation without publishing the package a second time. The protected smoke is Test Mode validation and does not establish universal live-production Chapa parity.

During the prerelease line, npm `latest` intentionally remains on the historical `0.0.0-bootstrap.4` artifact. Users who explicitly want the RC should install it through the `rc` tag or exact version:

```sh
npm install @sye1321/nestjs-chapa@rc
```

```sh
npm install @sye1321/nestjs-chapa@0.1.0-rc.0
```

Provenance enforcement is the combination of npm OIDC Trusted Publishing and the explicit supported `npm publish --provenance` mechanism. The workflow does not assert `dist.attestations.provenance.url`, because the current npm registry/CLI does not expose that field reliably. Exact registry integrity verification remains independent and fail-closed.
