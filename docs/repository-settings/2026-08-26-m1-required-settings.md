# M1 Repository Settings Action List

**State**: Maintainer action required; no repository setting was changed by M1.

Apply these settings to the `main` branch after the workflow is present and its check name is confirmed:

- require a pull request before merging;
- require the Node 22 and Node 24 provider-offline foundation checks;
- block force pushes and branch deletion;
- require conversation resolution before merging;
- keep GitHub Actions permissions read-only by default and grant elevated permissions only to separately reviewed workflows that need them.

Do not add Chapa credentials to ordinary CI. Do not enable a publishing workflow or npm token as part of these settings.
