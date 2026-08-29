import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const repository = resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const read = (path) => readFile(resolve(repository, path), 'utf8');

const assertPnpmEnabledBeforeCacheSetup = (workflow) => {
  const steps = workflow.split(/\n(?=\s{6}- )/);
  for (const [index, step] of steps.entries()) {
    if (step.includes('actions/setup-node@') && step.includes('cache: pnpm')) {
      assert.match(steps[index - 1], /run: corepack enable/);
    }
  }
};

test('release workflow is manual, OIDC-enabled, and token-free', async () => {
  const workflow = await read('.github/workflows/release.yml');
  assert.match(workflow, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:|\bpush:/);
  assert.match(workflow, /environment: npm-release[\s\S]*?id-token: write/);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|NPM_BOOTSTRAP_TOKEN/);
  assert.match(workflow, /npm publish [^\n]*--tag rc/);
  assert.doesNotMatch(workflow, /--tag latest/);
  assert.doesNotMatch(workflow, /npm view[^\n]*\|\| true/);
  assert.match(workflow, /if existing="\$\(npm view[\s\S]*?elif grep -Eq '[^']*code E404[^']*'/);
  assert.match(workflow, /lookup failed without a confirmed E404; refusing to publish/);
});

test('bootstrap workflow is manual, protected, and cannot assign latest', async () => {
  const workflow = await read('.github/workflows/bootstrap-npm.yml');
  assert.match(workflow, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(workflow, /pull_request:|\bpush:/);
  assert.match(workflow, /environment: npm-bootstrap/);
  assert.match(workflow, /--tag bootstrap --provenance/);
  assert.doesNotMatch(workflow, /--tag latest/);
  assert.match(workflow, /t\.latest/);
  assert.match(workflow, /if npm view @sye1321\/nestjs-chapa[\s\S]*?elif grep -Eq '[^']*code E404[^']*'/);
  assert.match(workflow, /lookup failed without a confirmed E404; refusing to bootstrap/);
});

test('normal CI remains provider-offline and cannot invoke sandbox smoke', async () => {
  const workflow = await read('.github/workflows/ci.yml');
  assert.doesNotMatch(workflow, /smoke:sandbox|sandbox-smoke|CHAPA_SECRET_KEY/);
});

test('pnpm is enabled before cached Node setup in release workflows', async () => {
  assertPnpmEnabledBeforeCacheSetup(await read('.github/workflows/bootstrap-npm.yml'));
  assertPnpmEnabledBeforeCacheSetup(await read('.github/workflows/release.yml'));
});
