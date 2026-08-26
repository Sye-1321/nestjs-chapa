import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repository = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const proofRoot = resolve(repository, '.m1-proof');
const proofEnvironment = { ...process.env, npm_config_cache: resolve(proofRoot, 'npm-cache') };

function run(command, args, cwd, env = proofEnvironment) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd}`);
  }
  return (result.stdout ?? '').trim();
}

for (const candidate of ['tsc', 'tsdown']) {
  const packageDir = resolve(proofRoot, candidate, 'package');
  const packJson = JSON.parse(run('npm', ['pack', '--dry-run', '--json'], packageDir));
  if (packJson.length !== 1) throw new Error(`${candidate}: unexpected dry-run pack result`);
  const forbidden = packJson[0].files.map(({ path }) => path).filter((path) =>
    /(^|\/)(research|\.raw|docs\/plans|\.github|\.changeset|test|scripts|node_modules|pnpm-lock\.yaml|\.env)(\/|$)/.test(path)
  );
  if (forbidden.length) throw new Error(`${candidate}: forbidden tarball paths: ${forbidden.join(', ')}`);
  const tarballName = run('npm', ['pack', '--silent'], packageDir).split(/\r?\n/).at(-1);
  const tarball = resolve(packageDir, tarballName);

  for (const nestMajor of [10, 11]) {
    const consumer = resolve(proofRoot, 'consumers', `${candidate}-nest${nestMajor}`);
    await rm(consumer, { recursive: true, force: true });
    await mkdir(resolve(consumer, 'src'), { recursive: true });
    await writeFile(resolve(consumer, 'package.json'), `${JSON.stringify({
      private: true,
      type: 'module',
      dependencies: {
        '@types/node': '24.10.1',
        '@nestjs/common': `^${nestMajor}.0.0`,
        '@nestjs/core': `^${nestMajor}.0.0`,
        '@sye1321/nestjs-chapa': `file:${tarball.replaceAll('\\', '/')}`,
        'reflect-metadata': '0.2.2',
        rxjs: '7.8.2',
        typescript: '5.9.3'
      }
    }, null, 2)}\n`);
    await writeFile(resolve(consumer, 'src', 'esm.mts'), `
import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import * as root from '@sye1321/nestjs-chapa';
import * as testing from '@sye1321/nestjs-chapa/testing';
@Injectable() class ConsumerProof { constructor(readonly value: string) {} }
if (Reflect.getMetadata('design:paramtypes', ConsumerProof)?.[0] !== String) throw new Error('decorator metadata missing');
if (Object.keys(root).length || Object.keys(testing).length) throw new Error('unexpected public API');
const deepPath = '@sye1321/nestjs-chapa' + '/dist/index.js';
try { await import(deepPath); throw new Error('deep import unexpectedly resolved'); }
catch (error) { if (error instanceof Error && error.message === 'deep import unexpectedly resolved') throw error; }
`);
    await writeFile(resolve(consumer, 'src', 'cjs.cts'), `
import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import root = require('@sye1321/nestjs-chapa');
import testing = require('@sye1321/nestjs-chapa/testing');
@Injectable() class ConsumerProof { constructor(readonly value: string) {} }
if (Reflect.getMetadata('design:paramtypes', ConsumerProof)?.[0] !== String) throw new Error('decorator metadata missing');
if (Object.keys(root).length || Object.keys(testing).length) throw new Error('unexpected public API');
try { require('@sye1321/nestjs-chapa/dist/index.js'); throw new Error('deep import unexpectedly resolved'); }
catch (error) { if (error instanceof Error && error.message === 'deep import unexpectedly resolved') throw error; }
`);
    await writeFile(resolve(consumer, 'src', 'bundler.ts'), `import * as root from '@sye1321/nestjs-chapa'; import * as testing from '@sye1321/nestjs-chapa/testing'; void root; void testing;\n`);
    await writeFile(resolve(consumer, 'tsconfig.json'), `${JSON.stringify({ compilerOptions: {
      target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', outDir: 'out',
      strict: true, experimentalDecorators: true, emitDecoratorMetadata: true, skipLibCheck: false
    }, include: ['src/esm.mts', 'src/cjs.cts'] }, null, 2)}\n`);
    await writeFile(resolve(consumer, 'tsconfig.bundler.json'), `${JSON.stringify({ compilerOptions: {
      target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, noEmit: true, skipLibCheck: false
    }, include: ['src/bundler.ts'] }, null, 2)}\n`);
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
    run('npx', ['tsc', '-p', 'tsconfig.json'], consumer);
    run('npx', ['tsc', '-p', 'tsconfig.bundler.json'], consumer);
    run('node', ['out/esm.mjs'], consumer);
    run('node', ['out/cjs.cjs'], consumer);
  }
  console.log(`${candidate}: dry-run pack, actual pack, Nest 10/11 ESM+CJS NodeNext/Bundler consumers passed`);
}
