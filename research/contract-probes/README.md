# M0.5-A Contract Probes

The `research/contract-probes` directory is a local-only testing and research environment created under the M0.5-A plan to safely probe Chapa API endpoints.

## Important Constraints

- **M0.5-A local-only status**: Currently, all scripts and validations here run locally and use loopback HTTP servers to validate behavior safely.
- **Zero external/provider calls**: No requests to `api.chapa.co` or other external endpoints are permitted.
- **Node 22+ built-ins only**: The harness uses only built-in Node modules (e.g. `node:http`, `node:test`, `fetch`). No npm dependencies or `package.json`.
- **.raw/ local boundary**: Captured API response bytes are saved in `.raw/`, which is strictly git-ignored to prevent raw provider evidence or secrets from being accidentally committed.
- **Secrets are environment-only**: Credentials (e.g., `CHAPA_SECRET_KEY`) must only be passed via the environment for later authorized probes.
- **No real secret needed for M0.5-A**: Validation is done strictly with synthetic test data.
- **One-attempt/no-redirect-follow semantics**: The executor makes exactly one network attempt per invocation and never follows `Location` headers automatically.
- **Raw-byte preservation**: API responses are captured byte-for-byte in `.raw/` prior to any JSON decoding or parsing.
- **Sanitization is candidate-only**: Sanitization of sensitive data produces a candidate file that MUST be human-reviewed.
- **Synthetic local validation is NOT Chapa evidence**: Synthetic files generated during local tests are not considered D-state or V-state Chapa evidence.
- **Provider execution remains blocked until a later approved batch**.

## Architecture

- `lib/env.mjs`: Safe credential retrieval.
- `lib/request.mjs`: Strict HTTP executor (`fetch` wrapper).
- `lib/capture.mjs`: Local raw byte and metadata storage.
- `lib/sanitize.mjs`: Conservative evidence sanitization.
- `probe.mjs`: CLI entrypoint (currently stubbed/disabled for M0.5-A).
- `test/harness.test.mjs`: Deterministic, local unit tests.
