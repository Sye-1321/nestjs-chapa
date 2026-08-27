import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { consumerMatrix } from '../test/consumers/matrix.mjs';

const repository = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const artifacts = resolve(repository, '.m1-artifacts');
const packageDirectory = resolve(artifacts, 'consumer-package');
const consumersDirectory = resolve(artifacts, 'consumers');
const environment = {
  ...process.env,
  CHAPA_SECRET_KEY: undefined,
  npm_config_cache: resolve(artifacts, 'npm-cache')
};

function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: environment,
    encoding: 'utf8',
    shell: process.platform === 'win32' && ['npm', 'npx'].includes(command),
    ...options
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd}`);
  }
  return (result.stdout ?? '').trim();
}

await rm(packageDirectory, { recursive: true, force: true });
await rm(consumersDirectory, { recursive: true, force: true });
await mkdir(packageDirectory, { recursive: true });
await mkdir(consumersDirectory, { recursive: true });
const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', packageDirectory], repository))[0];
const tarball = resolve(packageDirectory, packed.filename).replaceAll('\\', '/');

for (const fixture of consumerMatrix) {
  const consumer = resolve(consumersDirectory, fixture.id);
  await mkdir(resolve(consumer, 'src'), { recursive: true });
  await writeFile(resolve(consumer, 'package.json'), `${JSON.stringify({
    private: true,
    type: 'module',
    dependencies: {
      '@nestjs/common': fixture.nestVersion,
      '@nestjs/core': fixture.nestVersion,
      '@sye1321/nestjs-chapa': `file:${tarball}`,
      '@types/node': '24.10.1',
      'reflect-metadata': '0.2.2',
      rxjs: '7.8.2',
      typescript: '5.9.3'
    }
  }, null, 2)}\n`);

  const extension = fixture.format === 'esm' ? 'mts' : 'cts';
  const imports = fixture.format === 'esm'
    ? `import * as root from '@sye1321/nestjs-chapa';\nimport * as testing from '@sye1321/nestjs-chapa/testing';`
    : `import root = require('@sye1321/nestjs-chapa');\nimport testing = require('@sye1321/nestjs-chapa/testing');`;
  const deepImport = fixture.format === 'esm'
    ? `await import(deepPath)`
    : `require(deepPath)`;
  await writeFile(resolve(consumer, 'src', `runtime.${extension}`), `
import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
${imports}
if (process.env.CHAPA_SECRET_KEY !== undefined) throw new Error('credential unexpectedly present');
globalThis.fetch = async () => { throw new Error('network call attempted'); };
@Injectable() class ConsumerProof { constructor(readonly value: string) {} }
if (Reflect.getMetadata('design:paramtypes', ConsumerProof)?.[0] !== String) throw new Error('decorator metadata missing');
if (typeof root.ChapaError !== 'function' || Object.keys(testing).length) throw new Error('unexpected public API');
for (const internal of ['ChapaClient', 'ChapaRequestExecutor', 'FetchTransport']) {
  if (internal in root) throw new Error('internal API leaked');
}
const deepPath = '@sye1321/nestjs-chapa' + '/dist/index.js';
try { ${deepImport}; throw new Error('deep import unexpectedly resolved'); }
catch (error) { if (error instanceof Error && error.message === 'deep import unexpectedly resolved') throw error; }
`);
  await writeFile(resolve(consumer, 'src', 'bundler.ts'), `import * as root from '@sye1321/nestjs-chapa'; import * as testing from '@sye1321/nestjs-chapa/testing'; void root; void testing;\n`);
  await writeFile(resolve(consumer, 'tsconfig.json'), `${JSON.stringify({ compilerOptions: {
    target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', outDir: 'out', strict: true,
    experimentalDecorators: true, emitDecoratorMetadata: true, skipLibCheck: false
  }, include: [`src/runtime.${extension}`] }, null, 2)}\n`);
  await writeFile(resolve(consumer, 'tsconfig.bundler.json'), `${JSON.stringify({ compilerOptions: {
    target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, noEmit: true, skipLibCheck: false
  }, include: ['src/bundler.ts'] }, null, 2)}\n`);
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
  run('npx', ['tsc', '-p', 'tsconfig.json'], consumer);
  run('npx', ['tsc', '-p', 'tsconfig.bundler.json'], consumer);
  const emitted = fixture.format === 'esm' ? 'out/runtime.mjs' : 'out/runtime.cjs';
  run('node', [emitted], consumer);
  console.log(`${fixture.id}: PASS (Nest ${fixture.nestVersion}, ${fixture.format.toUpperCase()}, Node ${fixture.nodeLine} CI line)`);
}

if (process.argv.includes('--floors')) {
  for (const fixture of consumerMatrix) {
    const consumer = resolve(consumersDirectory, fixture.id).replaceAll('\\', '/');
    const emitted = fixture.format === 'esm' ? 'out/runtime.mjs' : 'out/runtime.cjs';
    run('docker', ['run', '--rm', '-v', `${consumer}:/work`, '-w', '/work', `node:${fixture.nodeLine}.0.0-slim`, 'node', emitted], repository, { stdio: 'inherit' });
  }
  console.log('Exact Node 22.0.0/24.0.0 floor mode: PASS');
}

await rm(packageDirectory, { recursive: true, force: true });
console.log('Permanent four-consumer matrix passed; generated tarball removed.');
