# Code Review Checklist

When reviewing pull requests, contributors and automated tools must verify the following:

- [ ] **Scope**: The changes adhere strictly to the approved scope and do not implement non-goals.
- [ ] **Traceability**: The changes include requirement, evidence, ADR, or plan traceability as applicable.
- [ ] **Technical Specification**: The changes adhere strictly to the normative authority of the technical specification.
- [ ] **U-state Behavior**: U-state provider behavior is not silently implemented.
- [ ] **Dependencies**: Any dependency changes have been explicitly approved.
- [ ] **Safety & Idempotency**: No unsafe retry or idempotency assumptions are made.
- [ ] **Public API**: Public API and export compatibility are maintained (when applicable).
- [ ] **Tests**: Public API impact and edge cases are covered by appropriate tests. Tests have not been weakened simply to make the implementation pass.
- [ ] **Verification**: Exact verification commands and their results are reported.
- [ ] **Documentation**: Public API or behavior changes are reflected in documentation (when applicable).
- [ ] **Sanitized Data / PII**: Secrets and PII are redacted. No real account identifiers, secrets, phone numbers, or personal data are included. Fictional data reflects Ethiopian use cases where applicable.
- [ ] **Security**: No credentials are leaked. Timing-safe comparisons and other specific security requirements are met (when applicable).
- [ ] **Formatting**: Code formatting and linting rules are respected.
- [ ] **Changeset**: A relevant changeset is included (when applicable).
