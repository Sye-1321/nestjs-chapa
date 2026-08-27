import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { relative, resolve } from 'node:path';

const repository = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const dist = resolve(repository, 'dist');

function build() {
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: repository, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('build failed during determinism check');
}

async function snapshot() {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else {
        const bytes = await readFile(path);
        files.push([relative(dist, path).replaceAll('\\', '/'), createHash('sha256').update(bytes).digest('hex')]);
      }
    }
  }
  await visit(dist);
  return files.sort(([a], [b]) => a.localeCompare(b));
}

build();
const first = await snapshot();
build();
const second = await snapshot();
if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('dist is not deterministic');
console.log(`Determinism passed for ${first.length} dist files with identical SHA-256 hashes.`);
