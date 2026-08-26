import { cp, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

function run(config) {
  const result = spawnSync(process.execPath, ['./node_modules/typescript/bin/tsc', '-p', config], {
    cwd: new URL('..', import.meta.url),
    stdio: 'inherit'
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('tsconfig.esm.json');
run('tsconfig.cjs.json');
run('tsconfig.proof.json');

const root = new URL('../.m1-proof/tsc/package/', import.meta.url);
await mkdir(new URL('dist/cjs/', root), { recursive: true });
await writeFile(new URL('dist/cjs/package.json', root), '{"type":"commonjs"}\n');
for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md', 'SECURITY.md']) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(file, root));
}
