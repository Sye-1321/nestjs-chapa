import { randomInt } from 'node:crypto';
import { ChapaValidationError } from '../errors/errors.js';
import type { ChapaReferences, GenerateReferenceOptions } from './types.js';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
const componentPattern = /^[A-Za-z0-9_]+$/;

export class ReferencesResource implements ChapaReferences {
  readonly #randomInt: (maximum: number) => number;

  constructor(randomInteger: (maximum: number) => number = randomInt) {
    this.#randomInt = randomInteger;
  }

  generate(options: GenerateReferenceOptions = {}): string {
    const prefix = options.prefix;
    const separator = options.separator ?? (prefix === undefined ? '' : '_');
    const size = options.size ?? 32;
    const issues: { path: string[]; message: string }[] = [];
    if (prefix !== undefined && (!componentPattern.test(prefix))) issues.push({ path: ['prefix'], message: 'prefix must use the reference alphabet' });
    if (options.separator !== undefined && prefix === undefined) issues.push({ path: ['separator'], message: 'separator requires a prefix' });
    if (options.separator !== undefined && !componentPattern.test(separator)) issues.push({ path: ['separator'], message: 'separator must use the reference alphabet' });
    if (!Number.isInteger(size) || size <= 0) issues.push({ path: ['size'], message: 'size must be a positive integer' });
    const total = (prefix?.length ?? 0) + separator.length + (Number.isInteger(size) ? size : 0);
    if (total > 50) issues.push({ path: ['size'], message: 'generated reference must not exceed 50 characters' });
    if (issues.length > 0) throw new ChapaValidationError('Invalid reference generation options', issues);
    let body = '';
    for (let index = 0; index < size; index += 1) body += alphabet[this.#randomInt(alphabet.length)];
    return `${prefix ?? ''}${separator}${body}`;
  }
}
