import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const repository = resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const read = (path) => readFile(resolve(repository, path), 'utf8');

test('release workflow is manual, OIDC-enabled, and token-free', async () => {
  const workflow = await read('.github/workflows/release.yml');
  assert.match(workflow, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:|\bpush:/);
  assert.match(workflow, /environment: npm-release[\s\S]*?id-token: write/);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|NPM_BOOTSTRAP_TOKEN/);
  assert.match(workflow, /npm publish [^\n]*--tag rc/);
  assert.doesNotMatch(workflow, /--tag latest/);
});

test('bootstrap workflow is manual, protected, and cannot assign latest', async () => {
  const workflow = await read('.github/workflows/bootstrap-npm.yml');
  assert.match(workflow, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:|\bpush:/);
  assert.match(workflow, /environment: npm-bootstrap/);
  assert.match(workflow, /--tag bootstrap --provenance/);
  assert.doesNotMatch(workflow, /--tag latest/);
  assert.match(workflow, /t\.latest/);
});

test('normal CI remains provider-offline and cannot invoke sandbox smoke', async () => {
  const workflow = await read('.github/workflows/ci.yml');
  assert.doesNotMatch(workflow, /smoke:sandbox|sandbox-smoke|CHAPA_SECRET_KEY/);
});
