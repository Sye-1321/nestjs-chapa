# Releasing

All release workflows are manually dispatched from `main`. They never run for pull requests or ordinary pushes.

## GitHub environments

- `npm-bootstrap`: protected one-time bootstrap environment. Add a short-lived granular `NPM_BOOTSTRAP_TOKEN`, use it once, then revoke it and remove the secret.
- `chapa-test-mode`: protected RC smoke environment. Its only secret is `CHAPA_SECRET_KEY`, used only for the minimal Test Mode lifecycle.
- `npm-release`: protected release-approval environment. It contains no npm token; RC publication authenticates through npm OIDC Trusted Publishing.

## Namespace bootstrap and RC handoff

1. Merge M6-E.
2. Create a short-lived granular npm bootstrap token and store it as `NPM_BOOTSTRAP_TOKEN` in `npm-bootstrap`.
3. Manually run `bootstrap-npm.yml` once from `main`.
4. Configure the npm Trusted Publisher with GitHub user/organization `Sye-1321`, repository `nestjs-chapa`, workflow `release.yml`, environment `npm-release`, and allowed action `npm publish`.
5. Revoke the bootstrap token and remove the GitHub environment secret.
6. Proceed to the M6-F RC version freeze.

The bootstrap artifact is not an RC and must never receive `latest`. Actual prerelease and stable publication remains OIDC Trusted-Publishing-only. The bootstrap exception exists solely because npm requires an existing package before trust configuration; it uses protected GitHub Actions, provenance, the `bootstrap` tag, temporary credentials, and immediate revocation.

After M6-F freezes an RC version, manually run `release.yml`. It verifies offline, performs the protected Test Mode smoke, publishes or verifies the exact RC tarball, tests registry consumers on Node 22 and 24, and finally creates the matching GitHub prerelease.
