import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { classifyRelease } from '../../scripts/release-preflight.mjs';

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

test('release classification derives policy from supported package versions', () => {
  assert.deepEqual(classifyRelease('0.1.0-rc.0'), {
    version: '0.1.0-rc.0',
    channel: 'rc',
    npmTag: 'rc',
    githubPrerelease: true
  });
  assert.deepEqual(classifyRelease('0.9.12-rc.34'), {
    version: '0.9.12-rc.34',
    channel: 'rc',
    npmTag: 'rc',
    githubPrerelease: true
  });
  assert.deepEqual(classifyRelease('0.0.0-rc.0'), {
    version: '0.0.0-rc.0',
    channel: 'rc',
    npmTag: 'rc',
    githubPrerelease: true
  });
  assert.deepEqual(classifyRelease('1.0.0'), {
    version: '1.0.0',
    channel: 'stable',
    npmTag: 'latest',
    githubPrerelease: false
  });
  for (const unsupported of [
    '0.1.0',
    '1.0.1',
    '1.1.0',
    '2.0.0',
    '0.01.0-rc.0',
    '0.1.00-rc.0',
    '0.1.0-rc.00',
    '00.1.0-rc.0',
    '1.0.0-rc.0',
    '0.1.0-beta.0',
    '^0.1.0',
    'latest'
  ]) {
    assert.throws(() => classifyRelease(unsupported), /unsupported release version/);
  }
});

test('release workflow is manual, version-derived, OIDC-enabled, and token-free', async () => {
  const workflow = await read('.github/workflows/release.yml');
  const publishJob = workflow.slice(workflow.indexOf('\n  publish:'), workflow.indexOf('\n  consumers:'));
  assert.match(workflow, /on:\s*\n\s*workflow_dispatch:\s*\n/);
  assert.doesNotMatch(workflow, /pull_request:|\bpush:|workflow_call:|inputs:/);
  assert.equal(workflow.match(/id-token: write/g)?.length, 1);
  assert.match(publishJob, /environment: npm-release[\s\S]*?id-token: write/);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|NPM_BOOTSTRAP_TOKEN/);
  assert.match(workflow, /node scripts\/release-preflight\.mjs release/);
  assert.match(workflow, /npm_tag=.*\.npmTag/);
  assert.match(workflow, /npm publish [^\n]*--tag "\$\{npm_tag\}" --provenance/);
  assert.doesNotMatch(workflow, /npm publish [^\n]*--tag (rc|latest)/);
});

test('release workflow preserves channel and GitHub release policy', async () => {
  const workflow = await read('.github/workflows/release.yml');
  assert.match(workflow, /channel === 'rc' \? 'latest' : 'rc'/);
  assert.match(workflow, /dist-tags\.\$\{npm_tag\}/);
  assert.match(workflow, /dist-tags\.\$\{protected_tag\}/);
  assert.match(workflow, /\$\{protected_before\}/);
  assert.match(workflow, /GITHUB_PRERELEASE: \$\{\{ needs\.publish\.outputs\.github-prerelease \}\}/);
  assert.match(
    workflow,
    /elif \[ "\$\{GITHUB_PRERELEASE\}" = true \]; then[\s\S]*?gh release create "\$\{tag\}" --verify-tag --prerelease --title "\$\{tag\}" --generate-notes/
  );
  assert.match(workflow, /else\s+gh release create "\$\{tag\}" --verify-tag --title "\$\{tag\}" --generate-notes/);
  assert.doesNotMatch(workflow, /--title "\$\{tag\}"--generate-notes/);
  assert.match(workflow, /--title "\$\{tag\}" --generate-notes/);
});

test('release source is immutably anchored across publication and reconciliation', async () => {
  const workflow = await read('.github/workflows/release.yml');
  const publishJob = workflow.slice(workflow.indexOf('\n  publish:'), workflow.indexOf('\n  release-source:'));
  const sourceJob = workflow.slice(workflow.indexOf('\n  release-source:'), workflow.indexOf('\n  consumers:'));
  const githubReleaseJob = workflow.slice(workflow.indexOf('\n  github-release:'));

  assert.match(publishJob, /published-now: \$\{\{ steps\.publication\.outputs\.published-now \}\}/);
  assert.match(publishJob, /echo 'published-now=false'/);
  assert.match(publishJob, /npm publish[^\n]+\n\s+echo 'published-now=true'/);
  assert.doesNotMatch(publishJob, /contents: write/);
  assert.match(publishJob, /contents: read\s+id-token: write/);

  assert.match(sourceJob, /contents: write/);
  assert.match(sourceJob, /if git ls-remote --exit-code --tags origin "refs\/tags\/\$\{tag\}"/);
  assert.match(sourceJob, /if \[ "\$\{PUBLISHED_NOW\}" = true \]; then\s+test "\$\{source_sha\}" = "\$\{GITHUB_SHA\}"/);
  assert.match(sourceJob, /elif \[ "\$\{PUBLISHED_NOW\}" = true \]; then\s+git tag "\$\{tag\}" "\$\{GITHUB_SHA\}"/);
  assert.match(
    sourceJob,
    /else\s+echo 'The immutable npm version has no release source tag; manual provenance\/source audit is required\.'/
  );
  assert.doesNotMatch(sourceJob, /git (?:tag|push)[^\n]*(?:--force|-f\b)/);

  assert.match(githubReleaseJob, /SOURCE_SHA: \$\{\{ needs\.release-source\.outputs\.source-sha \}\}/);
  assert.match(githubReleaseJob, /git rev-list -n 1 "refs\/tags\/\$\{tag\}"\)" = "\$\{SOURCE_SHA\}"/);
  assert.equal(githubReleaseJob.match(/gh release create[^\n]+--verify-tag/g)?.length, 2);
  assert.doesNotMatch(githubReleaseJob, /gh release create[^\n]+--target/);
  assert.match(githubReleaseJob, /contents: write/);
});

test('publication and registry verification remain fail-closed and bounded', async () => {
  const workflow = await read('.github/workflows/release.yml');
  const publish = workflow.indexOf('npm publish "${tarball}"');
  const polling = workflow.indexOf('for attempt in {1..31}; do');
  const pollingEnd = workflow.indexOf('\n            done', polling);
  assert.doesNotMatch(workflow, /npm view[^\n]*\|\| true/);
  assert.match(workflow, /tags_before="\$\(npm view @sye1321\/nestjs-chapa dist-tags --json\)"/);
  assert.match(workflow, /if existing="\$\(npm view[\s\S]*?elif grep -Eq '[^']*code E404[^']*'/);
  assert.match(workflow, /lookup failed without a confirmed E404; refusing to publish/);
  assert.ok(publish >= 0 && polling > publish, 'publication must precede visibility polling');
  assert.ok(pollingEnd > polling, 'visibility polling loop must be bounded');
  assert.doesNotMatch(workflow.slice(polling, pollingEnd), /npm publish/);
  assert.match(workflow, /for attempt in \{1\.\.31\}; do/);
  assert.match(workflow, /retrying in 30 seconds/);
  assert.match(workflow, /sleep 30/);
  assert.match(workflow, /if \[ "\$\{attempt\}" -eq 31 \]/);
  assert.match(workflow, /Post-publish registry lookup failed with an unexpected error/);
  assert.match(workflow, /m\['dist\.integrity'\]!==process\.argv\[3\]/);
  assert.match(workflow, /test "\$\{existing\}" = "\$\{expected\}"/);
  assert.doesNotMatch(workflow, /dist\.attestations\.provenance\.url/);
});

test('normal CI remains provider-offline and release consumers require Node 22 and 24', async () => {
  const ci = await read('.github/workflows/ci.yml');
  const release = await read('.github/workflows/release.yml');
  assert.doesNotMatch(ci, /smoke:sandbox|sandbox-smoke|CHAPA_SECRET_KEY/);
  assert.match(release, /consumers:[\s\S]*?matrix:\s*\n\s*node: \[22, 24\]/);
  assert.match(release, /Verify registry-installed consumers/);
});

test('pnpm and immutable action pins remain hardened across workflows', async () => {
  const workflows = await Promise.all([
    read('.github/workflows/ci.yml'),
    read('.github/workflows/codeql.yml'),
    read('.github/workflows/release.yml')
  ]);
  assertPnpmEnabledBeforeCacheSetup(workflows[0]);
  assertPnpmEnabledBeforeCacheSetup(workflows[2]);
  for (const workflow of workflows) {
    assert.doesNotMatch(workflow, /uses: [^\s@]+@v\d/);
    assert.match(workflow, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7\.0\.1/);
  }
  for (const workflow of [workflows[0], workflows[2]]) {
    assert.match(workflow, /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7\.0\.0/);
  }
  assert.match(workflows[2], /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7\.0\.1/);
  assert.match(workflows[2], /actions\/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8\.0\.1/);
  assert.doesNotMatch(
    workflows[2],
    /actions\/(?:upload|download)-artifact@(?:ea165f8d65b6e75b540449e92b4886f43607fa02|634f93cb2916e3fdff6788551b99b062d0335ce0)/
  );
});
