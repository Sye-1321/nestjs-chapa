import { mkdir, readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repository = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const artifacts = resolve(repository, '.artifacts', 'pack');
const environment = { ...process.env, npm_config_cache: resolve(repository, '.artifacts', 'npm-cache') };
await rm(artifacts, { recursive: true, force: true });
await mkdir(artifacts, { recursive: true });

function pack(args) {
  const result = spawnSync('npm', args, { cwd: repository, env: environment, encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'npm pack failed');
  return JSON.parse(result.stdout)[0];
}

async function sourceEntries(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) result.push(...await sourceEntries(resolve(directory, entry.name), `${prefix}${entry.name}/`));
    else if (entry.name.endsWith('.ts')) result.push(`${prefix}${entry.name.slice(0, -3)}`);
  }
  return result;
}

const entries = await sourceEntries(resolve(repository, 'src'));
const expected = ['CHANGELOG.md', 'LICENSE', 'README.md', 'SECURITY.md', 'package.json', 'dist/cjs/package.json'];
for (const format of ['esm', 'cjs']) {
  for (const entry of entries) {
    for (const suffix of ['.d.ts', '.d.ts.map', '.js', '.js.map']) expected.push(`dist/${format}/${entry}${suffix}`);
  }
}
expected.sort();

const dryRun = pack(['pack', '--dry-run', '--json']);
const actual = pack(['pack', '--json', '--pack-destination', artifacts]);
for (const result of [dryRun, actual]) {
  if (result.name !== '@sye1321/nestjs-chapa' || result.version !== '0.0.0') throw new Error('incorrect packed identity');
  const paths = result.files.map(({ path }) => path.replaceAll('\\', '/')).sort();
  if (JSON.stringify(paths) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected tarball contents.\nExpected: ${expected.join(', ')}\nActual: ${paths.join(', ')}`);
  }
}

await rm(resolve(artifacts, actual.filename), { force: true });
console.log(`Pack validation passed for ${expected.length} allowlisted files; generated tarball removed.`);
