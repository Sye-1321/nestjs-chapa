# M0.5-A, M0.5-B, and M0.5-C Contract Probes

The `research/contract-probes` directory is a local-only testing and research environment. M0.5-A harness remains the foundation. M0.5-B local preparation supports operation-oriented B1/B2/B3 validation. M0.5-C local mutation preparation exists for initialization.

## Important Constraints

- **Local-only status**: Currently, all scripts and validations here run locally and use loopback HTTP servers or fake fetch injections to validate behavior safely.
- **Zero external/provider calls**: No requests to `api.chapa.co` or other external endpoints are permitted. Actual Chapa/provider execution remains blocked pending Human Authorization. Provider execution from the `probe.mjs` CLI remains blocked. No CLI invocation authorizes provider execution.
- **Node 22+ built-ins only**: The harness uses only built-in Node modules (e.g. `node:http`, `node:test`, `fetch`). No npm dependencies or `package.json`.
- **.raw/ local boundary**: Captured API response bytes are saved in `.raw/`, which is strictly git-ignored to prevent raw provider evidence or secrets from being accidentally committed. Raw captures stay local.
- **Secrets are environment-only**: No credentials are needed for Checkpoint 2.
- **One-attempt/no-redirect-follow semantics**: The executor makes exactly one network attempt per invocation and never follows `Location` headers automatically. POST initialize is zero-retry.
- **Uncertain initialization**: Timeout/transport uncertainty must preserve `tx_ref`, never replay initialize automatically, no automatic verification occurs, and the next provider verification is a separate individually Human-Authorized request.
- **Raw-byte preservation**: API responses are captured byte-for-byte in `.raw/` prior to any JSON decoding or parsing.
- **Sanitization is candidate-only**: Sanitization of sensitive data produces a candidate file that MUST be human-reviewed.
- **Local fake-fetch/provider-boundary tests are NOT provider evidence**: Synthetic files generated during local tests are not considered D-state or V-state Chapa evidence.
- **Harness Safety Grammar**: The conservative B3 reference grammar (`^[A-Za-z0-9_-]+$`) is only a Checkpoint-2 harness-safety grammar and is NOT claimed to be Chapa's provider grammar.
- **Legacy support**: M0.5-B read-only behavior remains available.

## Architecture

- `lib/env.mjs`: Safe credential retrieval.
- `lib/request.mjs`: Strict HTTP executor (`fetch` wrapper).
- `lib/capture.mjs`: Local raw byte and metadata storage.
- `lib/sanitize.mjs`: Conservative evidence sanitization.
- `probe.mjs`: CLI entrypoint and operation builder.
- `test/harness.test.mjs`: Deterministic, local unit tests.
