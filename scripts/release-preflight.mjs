import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repository = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
export const classifyRelease = (version) => {
  if (/^0\.(0|[1-9]\d*)\.(0|[1-9]\d*)-rc\.(0|[1-9]\d*)$/.test(version)) {
    return { version, channel: 'rc', npmTag: 'rc', githubPrerelease: true };
  }
  if (version === '1.0.0') {
    return { version, channel: 'stable', npmTag: 'latest', githubPrerelease: false };
  }
  throw new Error(`unsupported release version: ${version}`);
};

export const runReleasePreflight = async (command, argument) => {
  const manifest = JSON.parse(await readFile(resolve(repository, 'package.json'), 'utf8'));
  if (manifest.name !== '@sye1321/nestjs-chapa') throw new Error('unexpected package name');
  if (manifest.private === true || manifest.publishConfig?.access !== 'public')
    throw new Error('package must be explicitly public');

  if (command === 'release') return JSON.stringify(classifyRelease(manifest.version));
  if (command === 'integrity') {
    if (!argument) throw new Error('tarball path is required');
    const bytes = await readFile(resolve(repository, argument));
    return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  }
  if (command === 'filename') {
    const version = argument ?? manifest.version;
    return `${manifest.name.slice(1).replace('/', '-')}-${version}.tgz`;
  }
  throw new Error(`unknown release preflight command: ${command ?? '<missing>'}`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(await runReleasePreflight(process.argv[2], process.argv[3]));
}
