import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

const repository = resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const manifest = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8'));
const require = createRequire(import.meta.url);
const expectedExports = ['.', './testing'];
const expectedDist = ['cjs/package.json'];
for (const format of ['esm', 'cjs']) {
  for (const entry of ['index', 'testing/index']) {
    for (const suffix of ['.d.ts', '.d.ts.map', '.js', '.js.map']) expectedDist.push(`${format}/${entry}${suffix}`);
  }
}

function runNode(script, cwd = repository) {
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd,
    env: { ...process.env, CHAPA_SECRET_KEY: undefined },
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
}

test('package identity is frozen', () => assert.equal(manifest.name, '@sye1321/nestjs-chapa'));
test('Node engines are frozen', () => assert.equal(manifest.engines.node, '^22.0.0 || ^24.0.0'));
test('package remains private', () => assert.equal(manifest.private, true));
test('exports have the exact allowlist', () => assert.deepEqual(Object.keys(manifest.exports), expectedExports));
test('exports contain no wildcard', () => assert.ok(Object.keys(manifest.exports).every((key) => !key.includes('*'))));
test('package.json is not exported', () => assert.equal(manifest.exports['./package.json'], undefined));
test('ESM output exists', async () => assert.match(await readFile(resolve(repository, 'dist/esm/index.js'), 'utf8'), /^export \{\};\r?\n\/\/# sourceMappingURL=index\.js\.map/));
test('CJS output exists', async () => assert.match(await readFile(resolve(repository, 'dist/cjs/index.js'), 'utf8'), /Object\.defineProperty\(exports/));
test('declaration output exists', async () => assert.match(await readFile(resolve(repository, 'dist/esm/index.d.ts'), 'utf8'), /^export \{\};\r?\n\/\/# sourceMappingURL=index\.d\.ts\.map/));
test('declaration maps exist', async () => assert.doesNotReject(readFile(resolve(repository, 'dist/cjs/testing/index.d.ts.map'))));
test('JS source maps exist', async () => assert.doesNotReject(readFile(resolve(repository, 'dist/esm/testing/index.js.map'))));
test('CJS package marker is exact', async () => assert.equal(await readFile(resolve(repository, 'dist/cjs/package.json'), 'utf8'), '{"type":"commonjs"}\n'));
test('dist has exactly 17 files', async () => {
  const files = [];
  async function visit(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) await visit(resolve(directory, entry.name), `${prefix}${entry.name}/`);
      else files.push(`${prefix}${entry.name}`);
    }
  }
  await visit(resolve(repository, 'dist'));
  assert.deepEqual(files.sort(), expectedDist.sort());
});
test('root ESM import works', async () => assert.deepEqual(Object.keys(await import('@sye1321/nestjs-chapa')), []));
test('root CJS require works', () => assert.deepEqual(Object.keys(require('@sye1321/nestjs-chapa')), []));
test('./testing ESM import works', async () => assert.deepEqual(Object.keys(await import('@sye1321/nestjs-chapa/testing')), []));
test('./testing CJS require works', () => assert.deepEqual(Object.keys(require('@sye1321/nestjs-chapa/testing')), []));
test('private/deep import fails', async () => assert.rejects(import('@sye1321/nestjs-chapa/dist/esm/index.js'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }));
test('API Extractor baselines pass with ESM/CJS parity', () => {
  const result = spawnSync(process.execPath, ['scripts/api-check.mjs'], { cwd: repository, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
test('root API baseline is empty', async () => assert.match(await readFile(resolve(repository, 'etc/api-reports/nestjs-chapa.api.md'), 'utf8'), /No @packageDocumentation/));
test('testing API baseline is empty', async () => assert.match(await readFile(resolve(repository, 'etc/api-reports/nestjs-chapa-testing.api.md'), 'utf8'), /No @packageDocumentation/));
test('public API has no Zod leakage', async () => assert.doesNotMatch((await readFile(resolve(repository, 'etc/api-reports/nestjs-chapa.api.md'), 'utf8')).toLowerCase(), /zod/));
test('public API has no Nest dependency-type leakage', async () => assert.doesNotMatch((await readFile(resolve(repository, 'etc/api-reports/nestjs-chapa.api.md'), 'utf8')).toLowerCase(), /@nestjs/));
test('clean builds are deterministic', () => {
  const result = spawnSync(process.execPath, ['scripts/determinism-check.mjs'], { cwd: repository, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /17 dist files/);
});
test('stale output cannot survive build', async () => {
  await writeFile(resolve(repository, 'dist/stale-proof.txt'), 'stale');
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: repository, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  await assert.rejects(readFile(resolve(repository, 'dist/stale-proof.txt')));
});
test('actual tarball satisfies the allowlist', () => {
  const result = spawnSync(process.execPath, ['scripts/pack-check.mjs'], { cwd: repository, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /22 allowlisted files/);
});
test('maps contain no absolute workstation path', async () => {
  for (const path of expectedDist.filter((entry) => entry.endsWith('.map'))) {
    const content = await readFile(resolve(repository, 'dist', path), 'utf8');
    assert.ok(!content.includes(repository) && !content.includes(repository.replaceAll('\\', '/')));
  }
});
test('package import requires no credential and attempts no fetch', () => runNode(`
  if (process.env.CHAPA_SECRET_KEY !== undefined) throw new Error('credential present');
  globalThis.fetch = async () => { throw new Error('network attempted'); };
  await import('${new URL('../../dist/esm/index.js', import.meta.url).href}');
`));
test('package import creates no listener or timer handle', () => runNode(`
  const before = process._getActiveHandles().length;
  await import('${new URL('../../dist/esm/index.js', import.meta.url).href}');
  if (process._getActiveHandles().length !== before) throw new Error('active handle created');
`));
test('package import creates no working-directory file', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'm1-import-'));
  try {
    runNode(`await import('${new URL('../../dist/esm/index.js', import.meta.url).href}');`, directory);
    assert.deepEqual(await readdir(directory), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test('research tests remain outside production tests', async () => {
  assert.ok((await readdir(resolve(repository, 'research/contract-probes/test'))).some((name) => name.endsWith('.test.mjs')));
  assert.ok((await readdir(resolve(repository, 'test/foundation'))).every((name) => name === 'proof' || name.endsWith('.test.mjs')));
});
