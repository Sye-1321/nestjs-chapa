import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';

const repository = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const baseline = resolve(repository, 'etc', 'api-reports');
const temporary = resolve(repository, '.m1-artifacts', 'api-extractor');
const update = process.argv.includes('--update');
await mkdir(baseline, { recursive: true });
await mkdir(resolve(temporary, 'reports'), { recursive: true });
await mkdir(resolve(temporary, 'temp'), { recursive: true });

async function extract(name, declaration, reportFolder, localBuild, reportName = `${name}.api.md`) {
  const config = ExtractorConfig.prepare({
    configObject: {
      projectFolder: repository,
      mainEntryPointFilePath: `<projectFolder>/${declaration}`,
      compiler: { tsconfigFilePath: '<projectFolder>/tsconfig.json' },
      apiReport: {
        enabled: true,
        reportFileName: reportName,
        reportFolder,
        reportTempFolder: '<projectFolder>/.m1-artifacts/api-extractor/temp'
      },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      tsdocMetadata: { enabled: false },
      messages: {
        compilerMessageReporting: { default: { logLevel: 'error' } },
        extractorMessageReporting: { default: { logLevel: 'error' } },
        tsdocMessageReporting: { default: { logLevel: 'error' } }
      }
    },
    configObjectFullPath: resolve(temporary, `${name}.json`),
    packageJsonFullPath: resolve(repository, 'package.json')
  });
  const result = Extractor.invoke(config, { localBuild, showVerboseMessages: false });
  if (!result.succeeded) throw new Error(`API extraction failed for ${name}`);
}

for (const entry of [
  { name: 'nestjs-chapa', path: 'index.d.ts' },
  { name: 'nestjs-chapa-testing', path: 'testing/index.d.ts' }
]) {
  await extract(entry.name, `dist/esm/${entry.path}`, '<projectFolder>/etc/api-reports', update);
  const cjsName = `${entry.name}-cjs`;
  await extract(cjsName, `dist/cjs/${entry.path}`, '<projectFolder>/.m1-artifacts/api-extractor/reports', true, `${cjsName}.api.md`);
  const esmReport = await readFile(resolve(baseline, `${entry.name}.api.md`), 'utf8');
  const cjsReport = await readFile(resolve(temporary, 'reports', `${cjsName}.api.md`), 'utf8');
  if (esmReport !== cjsReport) throw new Error(`ESM/CJS API surface mismatch for ${entry.name}`);
}

console.log('API Extractor baselines and ESM/CJS parity passed for root and ./testing.');
