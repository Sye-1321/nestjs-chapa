import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repository = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const manifest = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8'));
const command = process.argv[2];

if (manifest.name !== '@sye1321/nestjs-chapa') throw new Error('unexpected package name');
if (manifest.private === true || manifest.publishConfig?.access !== 'public')
  throw new Error('package must be explicitly public');

if (command === 'rc') {
  if (!/^0\.\d+\.\d+-rc\.\d+$/.test(manifest.version)) throw new Error('package version must be an M6 RC');
  console.log(manifest.version);
} else if (command === 'integrity') {
  const tarball = process.argv[3];
  if (!tarball) throw new Error('tarball path is required');
  const bytes = await readFile(resolve(repository, tarball));
  console.log(`sha512-${createHash('sha512').update(bytes).digest('base64')}`);
} else if (command === 'filename') {
  const version = process.argv[3] ?? manifest.version;
  console.log(`${manifest.name.slice(1).replace('/', '-')}-${version}.tgz`);
} else {
  throw new Error(`unknown release preflight command: ${command ?? '<missing>'}`);
}
