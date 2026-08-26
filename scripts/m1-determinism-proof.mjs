import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { relative, resolve } from 'node:path';

const repository = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));

function run(script) {
  const result = spawnSync('pnpm', ['run', 'clean'], { cwd: repository, shell: true, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
  const build = spawnSync('pnpm', ['run', script], { cwd: repository, shell: true, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

async function files(root) {
  const result = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else {
        const bytes = await readFile(path);
        result.push(`${relative(root, path).replaceAll('\\', '/')} ${createHash('sha256').update(bytes).digest('hex')}`);
      }
    }
  }
  await visit(root);
  return result.sort();
}

for (const candidate of ['tsc', 'tsdown']) {
  const script = `build:${candidate}`;
  run(script);
  const first = await files(resolve(repository, '.m1-proof', candidate, 'package', 'dist'));
  run(script);
  const second = await files(resolve(repository, '.m1-proof', candidate, 'package', 'dist'));
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error(`${candidate}: nondeterministic clean builds`);
  console.log(`${candidate}: ${first.length} deterministic output files with identical SHA-256 hashes`);
}
