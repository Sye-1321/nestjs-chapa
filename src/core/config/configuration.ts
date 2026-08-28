import { inspect } from 'node:util';
import { z } from 'zod';
import type { ChapaInstrumentationHooks, ChapaLogger, ChapaTransport } from '../contracts.js';
import { ChapaConfigurationError } from '../errors/errors.js';
import { redactSensitive } from '../validation/redaction.js';
import type { ChapaModuleOptions } from './types.js';

const DEFAULT_BASE_URL = 'https://api.chapa.co/v1';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 5_000;

const optionsSchema = z
  .object({
    secretKey: z.string().trim().min(1, 'secretKey is required'),
    webhookSecret: z
      .string()
      .refine((value) => value.trim().length > 0, 'webhookSecret must not be blank')
      .optional(),
    baseUrl: z.string().url('baseUrl must be a valid URL').optional(),
    timeoutMs: z.number().int().min(1).max(300_000).optional(),
    retry: z
      .object({
        maxSafeRetries: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
        baseDelayMs: z.number().int().min(0).max(60_000).optional(),
        maxDelayMs: z.number().int().min(0).max(300_000).optional(),
        jitter: z.boolean().optional()
      })
      .strict()
      .optional(),
    logging: z
      .object({
        enabled: z.boolean().optional(),
        level: z.enum(['error', 'warn', 'info', 'debug']).optional()
      })
      .strict()
      .optional(),
    transport: z
      .custom<ChapaTransport>(
        (value) => Boolean(value && typeof value === 'object' && typeof (value as ChapaTransport).send === 'function'),
        'transport must implement send()'
      )
      .optional(),
    logger: z
      .custom<ChapaLogger>(
        (value) =>
          Boolean(
            value &&
            typeof value === 'object' &&
            ['debug', 'info', 'warn', 'error'].every(
              (key) => typeof (value as unknown as Record<string, unknown>)[key] === 'function'
            )
          ),
        'logger methods must be callable'
      )
      .optional(),
    hooks: z
      .custom<ChapaInstrumentationHooks>(
        (value) => Boolean(value && typeof value === 'object'),
        'hooks must be an object'
      )
      .optional(),
    allowInsecureTestUrls: z.boolean().optional()
  })
  .strict();

export interface ResolvedRetryConfiguration {
  readonly maxSafeRetries: 0 | 1 | 2;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly jitter: boolean;
}

export class ResolvedChapaConfiguration {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly retry: ResolvedRetryConfiguration;
  readonly transport: ChapaModuleOptions['transport'] | undefined;
  readonly logger: ChapaLogger;
  readonly hooks: ChapaInstrumentationHooks | undefined;
  readonly loggingEnabled: boolean;
  readonly loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly allowInsecureTestUrls: boolean;
  readonly webhookConfigured: boolean;
  #secretKey: string;
  #webhookSecret: string | undefined;

  constructor(options: ChapaModuleOptions) {
    const parsed = optionsSchema.safeParse(options);
    if (!parsed.success) {
      throw new ChapaConfigurationError({
        code: 'configuration_error',
        message: 'Invalid Chapa configuration',
        retryable: false,
        raw: parsed.error.issues.map(({ path, message }) => ({ path, message }))
      });
    }
    const baseUrl = new URL(parsed.data.baseUrl ?? DEFAULT_BASE_URL);
    if (
      baseUrl.protocol !== 'https:' &&
      !(parsed.data.allowInsecureTestUrls && ['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname))
    ) {
      throw new ChapaConfigurationError({
        code: 'configuration_error',
        message: 'Invalid Chapa configuration',
        retryable: false
      });
    }
    const baseDelayMs = parsed.data.retry?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    const maxDelayMs = parsed.data.retry?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    if (maxDelayMs < baseDelayMs) {
      throw new ChapaConfigurationError({
        code: 'configuration_error',
        message: 'Invalid Chapa configuration',
        retryable: false
      });
    }
    this.#secretKey = parsed.data.secretKey;
    this.#webhookSecret = parsed.data.webhookSecret;
    this.baseUrl = baseUrl.toString().replace(/\/$/, '');
    this.timeoutMs = parsed.data.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retry = Object.freeze({
      maxSafeRetries: parsed.data.retry?.maxSafeRetries ?? 1,
      baseDelayMs,
      maxDelayMs,
      jitter: parsed.data.retry?.jitter ?? true
    });
    this.transport = parsed.data.transport;
    this.logger = parsed.data.logger ?? Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });
    this.hooks = parsed.data.hooks;
    this.loggingEnabled = parsed.data.logging?.enabled ?? false;
    this.loggingLevel = parsed.data.logging?.level ?? 'info';
    this.allowInsecureTestUrls = parsed.data.allowInsecureTestUrls ?? false;
    this.webhookConfigured = parsed.data.webhookSecret !== undefined;
    Object.freeze(this);
  }

  authorizationHeader(): string {
    return `Bearer ${this.#secretKey}`;
  }

  webhookSecret(): string | undefined {
    return this.#webhookSecret;
  }

  redact(value: unknown): unknown {
    return redactSensitive(
      value,
      [this.#secretKey, this.#webhookSecret].filter((value): value is string => value !== undefined)
    );
  }

  [inspect.custom](): string {
    return `ResolvedChapaConfiguration ${inspect({ baseUrl: this.baseUrl, timeoutMs: this.timeoutMs, retry: this.retry, webhookConfigured: this.webhookConfigured })}`;
  }
}

export function resolveChapaConfiguration(options: ChapaModuleOptions): ResolvedChapaConfiguration {
  return new ResolvedChapaConfiguration(options);
}
