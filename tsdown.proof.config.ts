import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { 'internal-decorator': 'test/foundation/proof/internal-decorator.ts' },
  outDir: '.m1-proof/internal/tsdown',
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
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
