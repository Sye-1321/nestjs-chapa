import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'testing/index': 'src/testing/index.ts'
  },
  outDir: '.m1-proof/tsdown/package/dist',
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  treeshake: false,
  clean: true,
  target: 'node22',
  deps: {
    neverBundle: ['zod', '@nestjs/common', '@nestjs/core', 'reflect-metadata']
  },
  platform: 'node',
  exports: false,
  publint: false,
  attw: false
});
