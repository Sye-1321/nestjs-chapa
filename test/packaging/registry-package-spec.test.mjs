import assert from 'node:assert/strict';
import test from 'node:test';
import { registryDependencyVersion } from '../../scripts/registry-package-spec.mjs';

test('normalizes exact registry package specs to dependency versions', () => {
  assert.equal(registryDependencyVersion('@sye1321/nestjs-chapa@0.1.0-rc.0'), '0.1.0-rc.0');
  assert.equal(registryDependencyVersion('@sye1321/nestjs-chapa@1.2.3'), '1.2.3');
});

test('rejects malformed, wrong-package, and non-exact registry package specs', () => {
  for (const packageSpec of [
    '@sye1321/nestjs-chapa',
    '@sye1321/nestjs-chapa@rc',
    '@sye1321/nestjs-chapa@^0.1.0',
    '@sye1321/nestjs-chapa@0.1',
    '@sye1321/nestjs-chapa@0.1.0-01',
    '@sye1321/nestjs-chapa@0.1.0-',
    '@sye1321/other-package@0.1.0',
    'nestjs-chapa@0.1.0'
  ]) {
    assert.throws(
      () => registryDependencyVersion(packageSpec),
      /must identify an exact @sye1321\/nestjs-chapa version/
    );
  }
});
