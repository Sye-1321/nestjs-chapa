import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';

const repository = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const output = resolve(repository, '.m1-proof', 'api-extractor');
await mkdir(resolve(output, 'reports'), { recursive: true });
await mkdir(resolve(output, 'temp'), { recursive: true });

const declarations = {
  'tsc-esm-root': '.m1-proof/tsc/package/dist/esm/index.d.ts',
  'tsc-esm-testing': '.m1-proof/tsc/package/dist/esm/testing/index.d.ts',
  'tsc-cjs-root': '.m1-proof/tsc/package/dist/cjs/index.d.ts',
  'tsc-cjs-testing': '.m1-proof/tsc/package/dist/cjs/testing/index.d.ts',
  'tsdown-esm-root': '.m1-proof/tsdown/package/dist/index.d.mts',
  'tsdown-esm-testing': '.m1-proof/tsdown/package/dist/testing/index.d.mts',
  'tsdown-cjs-root': '.m1-proof/tsdown/package/dist/index.d.cts',
  'tsdown-cjs-testing': '.m1-proof/tsdown/package/dist/testing/index.d.cts'
};

for (const [name, declaration] of Object.entries(declarations)) {
  const config = ExtractorConfig.prepare({
    configObject: {
      projectFolder: repository,
      mainEntryPointFilePath: `<projectFolder>/${declaration}`,
      compiler: { tsconfigFilePath: '<projectFolder>/tsconfig.json' },
      apiReport: {
        enabled: true,
        reportFileName: `${name}.api.md`,
        reportFolder: '<projectFolder>/.m1-proof/api-extractor/reports',
        reportTempFolder: '<projectFolder>/.m1-proof/api-extractor/temp'
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
    configObjectFullPath: resolve(repository, `.m1-proof/api-extractor/${name}.json`),
    packageJsonFullPath: resolve(repository, 'package.json')
  });
  const result = Extractor.invoke(config, { localBuild: true, showVerboseMessages: false });
  if (!result.succeeded) throw new Error(`API extraction failed for ${name}`);
}

console.log(`API extraction passed for ${Object.keys(declarations).length} candidate entry/format declarations.`);
