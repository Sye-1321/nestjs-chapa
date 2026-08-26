import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const candidate = process.argv[2];
if (!['tsc', 'tsdown'].includes(candidate)) throw new Error('candidate must be tsc or tsdown');

const repository = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const stage = resolve(repository, '.m1-proof', candidate, 'package');
const rootManifest = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8'));

const paths = candidate === 'tsc'
  ? {
      importRoot: './dist/esm/index.js',
      importRootTypes: './dist/esm/index.d.ts',
      requireRoot: './dist/cjs/index.js',
      requireRootTypes: './dist/cjs/index.d.ts',
      importTesting: './dist/esm/testing/index.js',
      importTestingTypes: './dist/esm/testing/index.d.ts',
      requireTesting: './dist/cjs/testing/index.js',
      requireTestingTypes: './dist/cjs/testing/index.d.ts'
    }
  : {
      importRoot: './dist/index.mjs',
      importRootTypes: './dist/index.d.mts',
      requireRoot: './dist/index.cjs',
      requireRootTypes: './dist/index.d.cts',
      importTesting: './dist/testing/index.mjs',
      importTestingTypes: './dist/testing/index.d.mts',
      requireTesting: './dist/testing/index.cjs',
      requireTestingTypes: './dist/testing/index.d.cts'
    };

const manifest = {
  name: rootManifest.name,
  version: rootManifest.version,
  private: true,
  description: rootManifest.description,
  license: rootManifest.license,
  type: 'module',
  engines: rootManifest.engines,
  dependencies: rootManifest.dependencies,
  peerDependencies: rootManifest.peerDependencies,
  exports: {
    '.': {
      import: { types: paths.importRootTypes, default: paths.importRoot },
      require: { types: paths.requireRootTypes, default: paths.requireRoot }
    },
    './testing': {
      import: { types: paths.importTestingTypes, default: paths.importTesting },
      require: { types: paths.requireTestingTypes, default: paths.requireTesting }
    }
  },
  files: ['dist', 'README.md', 'LICENSE', 'CHANGELOG.md', 'SECURITY.md']
};

await mkdir(stage, { recursive: true });
for (const file of ['README.md', 'LICENSE', 'CHANGELOG.md', 'SECURITY.md']) {
  await cp(resolve(repository, file), resolve(stage, file));
}
await writeFile(resolve(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
