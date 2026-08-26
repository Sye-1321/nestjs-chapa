import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { relative, resolve } from 'node:path';

const repository = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const dist = resolve(repository, 'dist');

function run(config) {
  const result = spawnSync(process.execPath, ['./node_modules/typescript/bin/tsc', '-p', config], {
    cwd: repository,
    stdio: 'inherit'
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function listFiles(directory) {
  const result = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else result.push(relative(directory, path).replaceAll('\\', '/'));
    }
  }
  await visit(directory);
  return result.sort();
}

await rm(dist, { recursive: true, force: true });
run('tsconfig.esm.json');
run('tsconfig.cjs.json');

const cjsDirectory = resolve(dist, 'cjs');
await mkdir(cjsDirectory, { recursive: true });
const marker = resolve(cjsDirectory, 'package.json');
const temporaryMarker = `${marker}.tmp`;
await writeFile(temporaryMarker, '{"type":"commonjs"}\n');
await rename(temporaryMarker, marker);

const entries = ['index', 'testing/index'];
const expected = ['cjs/package.json'];
for (const format of ['esm', 'cjs']) {
  for (const entry of entries) {
    for (const suffix of ['.d.ts', '.d.ts.map', '.js', '.js.map']) expected.push(`${format}/${entry}${suffix}`);
  }
}
expected.sort();
const actual = await listFiles(dist);
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected dist output.\nExpected: ${expected.join(', ')}\nActual: ${actual.join(', ')}`);
}
console.log(`Built and validated ${actual.length} deterministic dist files.`);
