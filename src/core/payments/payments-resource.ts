import { z } from 'zod';
import type { ResolvedChapaConfiguration } from '../config/configuration.js';
import { ChapaResponseError, ChapaValidationError } from '../errors/errors.js';
import type { ChapaRequestExecutor, ExecutionResult } from '../executor/request-executor.js';
import type {
  CancelPaymentResult,
  ChapaMutationRequestOptions,
  ChapaPayments,
  ChapaSafeReadRequestOptions,
  InitializePaymentInput,
  InitializePaymentResult,
  JsonValue,
  PaymentStatus,
  VerifyPaymentResult
} from './types.js';

const txRefPattern = /^[A-Za-z0-9_]{1,50}$/;
const amountPattern = /^(?:[1-9]\d*(?:\.\d{1,2})?|0\.\d{1,2})$/;
const decimalStringPattern = /^\d+(?:\.\d+)?$/;
const usableString = z.string().min(1);
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(), z.number().finite(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)
]));
const inputSchema = z.object({
  amount: z.string().regex(amountPattern).refine((value) => !/^0(?:\.0{1,2})$/.test(value), 'amount must be greater than zero'),
  currency: z.string().regex(/^[A-Z]+$/),
  txRef: z.string().regex(txRefPattern),
  firstName: usableString.optional(),
  lastName: usableString.optional(),
  email: z.email().optional(),
  phoneNumber: z.string().regex(/^\d{10}$/).optional(),
  callbackUrl: z.string().url().optional(),
  returnUrl: z.string().url().optional(),
  customization: z.object({ title: usableString.optional(), description: usableString.optional(), logo: usableString.optional() }).strict().optional(),
  meta: z.record(z.string(), jsonValueSchema).optional()
}).strict();

function validationError(message: string, result: z.ZodError): ChapaValidationError {
  return new ChapaValidationError(message, result.issues.map(({ path, message: issueMessage }) => ({
    path: path.filter((part): part is string | number => typeof part === 'string' || typeof part === 'number'), message: issueMessage
  })));
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function responseError(operation: 'payments.initialize' | 'payments.verify', result: ExecutionResult, message: string): ChapaResponseError {
  return new ChapaResponseError({
    code: 'response_error', message, operation, method: operation === 'payments.verify' ? 'GET' : 'POST',
    endpoint: result.metadata.endpoint, httpStatus: result.metadata.httpStatus, attempts: result.metadata.attempts,
    ...(result.metadata.correlationId ? { correlationId: result.metadata.correlationId } : {}), retryable: false, raw: result.raw
  });
}

function optionalString(object: Record<string, unknown>, key: string): string | undefined {
  const value = object[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function jsonSafetyIssue(value: unknown, path: (string | number)[] = [], ancestors = new WeakSet<object>()): { path: (string | number)[]; message: string } | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? undefined : { path, message: 'JSON numbers must be finite' };
  if (typeof value !== 'object') return { path, message: `JSON values cannot contain ${typeof value}` };
  if (ancestors.has(value)) return { path, message: 'JSON values cannot contain cycles' };
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const issue = jsonSafetyIssue(value[index], [...path, index], ancestors);
        if (issue) return issue;
      }
      return undefined;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return { path, message: 'JSON records must be plain objects' };
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === 'symbol') return { path, message: 'JSON records cannot contain symbol keys' };
      const issue = jsonSafetyIssue((value as Record<string, unknown>)[key], [...path, key], ancestors);
      if (issue) return issue;
    }
    return undefined;
  } finally {
    ancestors.delete(value);
  }
}

export class PaymentsResource implements ChapaPayments {
  readonly #executor: ChapaRequestExecutor;
  readonly #configuration: ResolvedChapaConfiguration;

  constructor(executor: ChapaRequestExecutor, configuration: ResolvedChapaConfiguration) {
    this.#executor = executor;
    this.#configuration = configuration;
  }

  async initialize(input: InitializePaymentInput, options?: ChapaMutationRequestOptions): Promise<InitializePaymentResult> {
    if (input && typeof input === 'object' && 'meta' in input) {
      const issue = jsonSafetyIssue((input as { meta?: unknown }).meta, ['meta']);
      if (issue) throw new ChapaValidationError('Invalid payment initialization input', [issue]);
    }
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) throw validationError('Invalid payment initialization input', parsed.error);
    if (parsed.data.callbackUrl) {
      const url = new URL(parsed.data.callbackUrl);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local && this.#configuration.allowInsecureTestUrls)) {
        throw new ChapaValidationError('Invalid payment initialization input', [{ path: ['callbackUrl'], message: 'callbackUrl must use HTTPS outside explicitly enabled local tests' }]);
      }
    }
    const wire = {
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      tx_ref: parsed.data.txRef,
      ...(parsed.data.firstName !== undefined ? { first_name: parsed.data.firstName } : {}),
      ...(parsed.data.lastName !== undefined ? { last_name: parsed.data.lastName } : {}),
      ...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
      ...(parsed.data.phoneNumber !== undefined ? { phone_number: parsed.data.phoneNumber } : {}),
      ...(parsed.data.callbackUrl !== undefined ? { callback_url: parsed.data.callbackUrl } : {}),
      ...(parsed.data.returnUrl !== undefined ? { return_url: parsed.data.returnUrl } : {}),
      ...(parsed.data.customization !== undefined ? { customization: parsed.data.customization } : {}),
      ...(parsed.data.meta !== undefined ? { meta: parsed.data.meta } : {})
    };
    const result = await this.#executor.execute({
      policy: { operation: 'payments.initialize', method: 'POST', path: '/transaction/initialize', retry: 'never' },
      body: JSON.stringify(wire), ...(options ? { options } : {})
    });
    const raw = objectValue(result.data);
    const status = raw ? optionalString(raw, 'status') : undefined;
    const data = raw ? objectValue(raw.data) : undefined;
    const checkoutUrl = (data && optionalString(data, 'checkout_url')) ?? (raw && optionalString(raw, 'checkout_url'));
    if (!status || !checkoutUrl) throw responseError('payments.initialize', result, 'Chapa initialization response is missing required fields');
    try { new URL(checkoutUrl); } catch { throw responseError('payments.initialize', result, 'Chapa initialization response contains an unusable checkout URL'); }
    const message = raw ? optionalString(raw, 'message') : undefined;
    return { status, ...(message ? { message } : {}), checkoutUrl, txRef: parsed.data.txRef, response: result.metadata, raw: result.raw };
  }

  async verify(txRef: string, options?: ChapaSafeReadRequestOptions): Promise<VerifyPaymentResult> {
    if (!txRefPattern.test(txRef)) throw new ChapaValidationError('Invalid transaction reference', [{ path: ['txRef'], message: 'txRef must match the SDK grammar' }]);
    const result = await this.#executor.execute({
      policy: { operation: 'payments.verify', method: 'GET', path: `/transaction/verify/${txRef}`, retry: 'safe-read' }, ...(options ? { options } : {})
    });
    const raw = objectValue(result.data);
    const data = raw ? objectValue(raw.data) : undefined;
    const providerStatus = data ? optionalString(data, 'status') : undefined;
    if (!providerStatus) throw responseError('payments.verify', result, 'Chapa verification response is missing transaction status');
    const known = new Set<PaymentStatus>(['success', 'pending', 'failed', 'cancelled', 'refunded', 'reversed']);
    const status: PaymentStatus = known.has(providerStatus as PaymentStatus) ? providerStatus as PaymentStatus : 'unknown';
    const amount = data && typeof data.amount === 'string' && decimalStringPattern.test(data.amount) ? data.amount : undefined;
    const charge = data && typeof data.charge === 'string' && decimalStringPattern.test(data.charge) ? data.charge : undefined;
    const currency = data ? optionalString(data, 'currency') : undefined;
    const mode = data ? optionalString(data, 'mode') : undefined;
    const paymentMethod = data ? optionalString(data, 'method') : undefined;
    const createdAt = data ? optionalString(data, 'created_at') : undefined;
    const updatedAt = data ? optionalString(data, 'updated_at') : undefined;
    return {
      status, txRef,
      ...(amount ? { amount } : {}), ...(charge ? { charge } : {}),
      ...(currency ? { currency } : {}), ...(mode ? { mode } : {}), ...(paymentMethod ? { paymentMethod } : {}),
      ...(createdAt ? { createdAt } : {}), ...(updatedAt ? { updatedAt } : {}),
      response: result.metadata, raw: result.raw
    };
  }

  async cancel(txRef: string, options?: ChapaMutationRequestOptions): Promise<CancelPaymentResult> {
    if (!txRefPattern.test(txRef)) throw new ChapaValidationError('Invalid transaction reference', [{ path: ['txRef'], message: 'txRef must match the SDK grammar' }]);
    const result = await this.#executor.execute({
      policy: { operation: 'payments.cancel', method: 'PUT', path: `/transaction/cancel/${txRef}`, retry: 'never' }, ...(options ? { options } : {})
    });
    const raw = objectValue(result.data);
    const message = raw ? optionalString(raw, 'message') : undefined;
    return { txRef, ...(message ? { message } : {}), response: result.metadata, raw: result.raw };
  }
}
