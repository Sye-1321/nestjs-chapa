import type { ChapaHttpMethod, ChapaOperation, ChapaResponseMetadata, ChapaTransport, ChapaTransportResponse } from '../contracts.js';
import type { ResolvedChapaConfiguration } from '../config/configuration.js';
import {
  ChapaAbortError,
  ChapaApiError,
  ChapaAuthenticationError,
  ChapaNetworkError,
  ChapaPermissionError,
  ChapaRateLimitError,
  ChapaResponseError,
  ChapaTimeoutError,
  ChapaValidationError
} from '../errors/errors.js';

interface OperationPolicyBase {
  readonly operation: ChapaOperation;
  readonly method: ChapaHttpMethod;
  readonly path: string;
}

export interface MutationOperationPolicy extends OperationPolicyBase {
  readonly method: 'POST' | 'PUT';
  readonly retry: 'never';
}

export interface SafeReadOperationPolicy extends OperationPolicyBase {
  readonly method: 'GET';
  readonly retry: 'safe-read';
}

export interface BaseExecutionOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly correlationId?: string;
}

export interface SafeReadExecutionOptions extends BaseExecutionOptions {
  readonly maxRetries?: 0 | 1 | 2;
}

export interface MutationExecutionRequest {
  readonly policy: MutationOperationPolicy;
  readonly body?: string | Uint8Array;
  readonly options?: BaseExecutionOptions;
}

export interface SafeReadExecutionRequest {
  readonly policy: SafeReadOperationPolicy;
  readonly options?: SafeReadExecutionOptions;
}

export interface ExecutionResult {
  readonly data: unknown;
  readonly raw: unknown;
  readonly responseBytes: Uint8Array;
  readonly metadata: ChapaResponseMetadata;
}

export interface ExecutorDependencies {
  readonly sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  readonly random?: () => number;
}

const retryableStatuses = new Set([408, 425, 500, 502, 503, 504]);

function defaultSleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    timer.unref?.();
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

function parseRetryAfter(value: string | undefined, now = Date.now()): number | undefined {
  if (value === undefined) return undefined;
  if (/^\d+$/.test(value.trim())) return Number(value.trim()) * 1_000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

function parseBody(response: ChapaTransportResponse): unknown {
  const text = new TextDecoder().decode(response.body);
  if (text.length === 0) return undefined;
  const contentType = response.headers['content-type']?.toLowerCase();
  const looksJson = /^[\s]*[\[{]/.test(text);
  if (contentType?.includes('json') || looksJson) {
    try {
      return JSON.parse(text) as unknown;
    } catch (cause) {
      throw cause;
    }
  }
  return text;
}

function providerFields(raw: unknown): { chapaStatus?: string; chapaMessage?: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const object = raw as Record<string, unknown>;
  return {
    ...(typeof object.status === 'string' ? { chapaStatus: object.status } : {}),
    ...(typeof object.message === 'string' ? { chapaMessage: object.message } : {})
  };
}

export class ChapaRequestExecutor {
  readonly #configuration: ResolvedChapaConfiguration;
  readonly #transport: ChapaTransport;
  readonly #sleep: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  readonly #random: () => number;

  constructor(configuration: ResolvedChapaConfiguration, transport: ChapaTransport, dependencies: ExecutorDependencies = {}) {
    this.#configuration = configuration;
    this.#transport = transport;
    this.#sleep = dependencies.sleep ?? defaultSleep;
    this.#random = dependencies.random ?? Math.random;
  }

  async execute(request: MutationExecutionRequest | SafeReadExecutionRequest): Promise<ExecutionResult> {
    if (request.policy.retry === 'never' && request.options && 'maxRetries' in request.options) {
      throw new ChapaValidationError('Retry controls are not allowed for mutating operations', [
        { path: ['options', 'maxRetries'], message: 'Retry controls are not allowed for mutating operations' }
      ]);
    }
    const timeoutMs = request.options?.timeoutMs ?? this.#configuration.timeoutMs;
    if (!Number.isFinite(timeoutMs) || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300_000) {
      throw new ChapaValidationError('Invalid request options', [{ path: ['options', 'timeoutMs'], message: 'timeoutMs is outside the safe range' }]);
    }
    const configuredRetries = this.#configuration.retry.maxSafeRetries;
    const requestedRetries = request.policy.retry === 'safe-read'
      ? (request.options as SafeReadExecutionOptions | undefined)?.maxRetries ?? configuredRetries
      : 0;
    const maxRetries = Math.min(requestedRetries, configuredRetries);
    const maximumAttempts = 1 + maxRetries;
    let attempts = 0;
    let totalDurationMs = 0;

    while (attempts < maximumAttempts) {
      if (request.options?.signal?.aborted) throw this.#abortError(request, attempts);
      attempts += 1;
      const controller = new AbortController();
      let timedOut = false;
      const onCallerAbort = () => controller.abort(request.options?.signal?.reason);
      request.options?.signal?.addEventListener('abort', onCallerAbort, { once: true });
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort(new DOMException('Timed out', 'TimeoutError'));
      }, timeoutMs);
      timer.unref?.();

      let response: ChapaTransportResponse;
      try {
        await this.#observe('request', request, attempts);
        response = await this.#transport.send({
          method: request.policy.method,
          url: new URL(request.policy.path.replace(/^\//, ''), `${this.#configuration.baseUrl}/`).toString(),
          headers: Object.freeze({
            authorization: this.#configuration.authorizationHeader(),
            accept: 'application/json',
            'user-agent': '@sye1321/nestjs-chapa/0.0.0',
            ...('body' in request && request.body !== undefined ? { 'content-type': 'application/json' } : {})
          }),
          ...('body' in request && request.body !== undefined ? { body: request.body } : {}),
          signal: controller.signal
        });
      } catch (cause) {
        clearTimeout(timer);
        request.options?.signal?.removeEventListener('abort', onCallerAbort);
        if (request.options?.signal?.aborted) throw this.#abortError(request, attempts, cause);
        if (timedOut) throw this.#timeoutError(request, attempts, cause);
        const retryable = request.policy.retry === 'safe-read';
        if (retryable && attempts < maximumAttempts) {
          await this.#observe('retry', request, attempts, { reason: 'network_error' });
          totalDurationMs += await this.#delay(request, attempts);
          continue;
        }
        throw new ChapaNetworkError({
          code: 'network_error',
          message: 'Chapa network request failed',
          operation: request.policy.operation,
          method: request.policy.method,
          endpoint: request.policy.path,
          ...(request.options?.correlationId ? { correlationId: request.options.correlationId } : {}),
          attempts,
          retryable,
          cause
        });
      } finally {
        clearTimeout(timer);
        request.options?.signal?.removeEventListener('abort', onCallerAbort);
      }

      totalDurationMs += response.durationMs;
      let raw: unknown;
      try {
        raw = parseBody(response);
      } catch (cause) {
        throw new ChapaResponseError({
          code: 'response_error',
          message: 'Chapa response could not be decoded',
          operation: request.policy.operation,
          method: request.policy.method,
          endpoint: request.policy.path,
          httpStatus: response.status,
          ...(request.options?.correlationId ? { correlationId: request.options.correlationId } : {}),
          attempts,
          retryable: false,
          cause,
          raw: this.#configuration.redact(new TextDecoder().decode(response.body))
        });
      }
      if (response.status >= 200 && response.status < 300) {
        await this.#observe('response', request, attempts, { httpStatus: response.status, durationMs: totalDurationMs });
        return {
          data: raw,
          raw,
          responseBytes: response.body.slice(),
          metadata: {
            operation: request.policy.operation,
            method: request.policy.method,
            endpoint: request.policy.path,
            httpStatus: response.status,
            attempts,
            durationMs: totalDurationMs,
            ...(request.options?.correlationId ? { correlationId: request.options.correlationId } : {})
          }
        };
      }

      const retryAfterMs = response.status === 429 ? parseRetryAfter(response.headers['retry-after']) : undefined;
      const retryable = request.policy.retry === 'safe-read' && (retryableStatuses.has(response.status) || (response.status === 429 && retryAfterMs !== undefined));
      if (retryable && attempts < maximumAttempts) {
        await this.#observe('retry', request, attempts, { reason: `http_${response.status}`, httpStatus: response.status });
        totalDurationMs += await this.#delay(request, attempts, retryAfterMs);
        continue;
      }
      throw this.#apiError(request, response.status, raw, attempts, totalDurationMs, retryable);
    }
    throw new Error('unreachable executor state');
  }

  async #delay(request: MutationExecutionRequest | SafeReadExecutionRequest, retryNumber: number, retryAfterMs?: number): Promise<number> {
    const exponential = Math.min(this.#configuration.retry.maxDelayMs, this.#configuration.retry.baseDelayMs * (2 ** (retryNumber - 1)));
    const computed = this.#configuration.retry.jitter ? Math.floor(this.#random() * (exponential + 1)) : exponential;
    const delay = Math.min(this.#configuration.retry.maxDelayMs, retryAfterMs ?? computed);
    const controller = new AbortController();
    const onAbort = () => controller.abort(request.options?.signal?.reason);
    request.options?.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      await this.#sleep(delay, controller.signal);
    } catch (cause) {
      if (request.options?.signal?.aborted) throw this.#abortError(request, retryNumber, cause);
      throw cause;
    } finally {
      request.options?.signal?.removeEventListener('abort', onAbort);
    }
    return delay;
  }

  #apiError(request: MutationExecutionRequest | SafeReadExecutionRequest, status: number, raw: unknown, attempts: number, durationMs: number, retryable: boolean) {
    const details = {
      operation: request.policy.operation,
      method: request.policy.method,
      endpoint: request.policy.path,
      httpStatus: status,
      ...(request.options?.correlationId ? { correlationId: request.options.correlationId } : {}),
      attempts,
      retryable,
      raw: this.#configuration.redact(raw),
      ...providerFields(this.#configuration.redact(raw))
    };
    void durationMs;
    if (status === 401) return new ChapaAuthenticationError({ ...details, code: 'authentication_error', message: 'Chapa authentication failed' });
    if (status === 403) return new ChapaPermissionError({ ...details, code: 'permission_error', message: 'Chapa permission denied' });
    if (status === 429) return new ChapaRateLimitError({ ...details, code: 'rate_limit_error', message: 'Chapa rate limit exceeded' });
    return new ChapaApiError({ ...details, code: 'api_error', message: 'Chapa API request failed' });
  }

  #timeoutError(request: MutationExecutionRequest | SafeReadExecutionRequest, attempts: number, cause?: unknown) {
    return new ChapaTimeoutError({
      code: 'timeout_error', message: 'Chapa request timed out', operation: request.policy.operation, method: request.policy.method, endpoint: request.policy.path,
      ...(request.options?.correlationId ? { correlationId: request.options.correlationId } : {}), attempts, retryable: false, cause
    });
  }

  #abortError(request: MutationExecutionRequest | SafeReadExecutionRequest, attempts: number, cause?: unknown) {
    return new ChapaAbortError({
      code: 'abort_error', message: 'Chapa request was aborted', operation: request.policy.operation, method: request.policy.method, endpoint: request.policy.path,
      ...(request.options?.correlationId ? { correlationId: request.options.correlationId } : {}), attempts, retryable: false, cause
    });
  }

  async #observe(
    kind: 'request' | 'response' | 'retry',
    request: MutationExecutionRequest | SafeReadExecutionRequest,
    attempts: number,
    extra: { reason?: string; httpStatus?: number; durationMs?: number } = {}
  ): Promise<void> {
    const event = {
      operation: request.policy.operation,
      method: request.policy.method,
      endpoint: request.policy.path,
      attempts,
      ...(request.options?.correlationId ? { correlationId: request.options.correlationId } : {}),
      ...(extra.httpStatus !== undefined ? { httpStatus: extra.httpStatus } : {}),
      ...(extra.durationMs !== undefined ? { durationMs: extra.durationMs } : {})
    };
    try {
      const level = kind === 'retry' ? 'info' : 'debug';
      const order = { debug: 0, info: 1, warn: 2, error: 3 } as const;
      if (this.#configuration.loggingEnabled && order[level] >= order[this.#configuration.loggingLevel]) {
        this.#configuration.logger[level](`Chapa ${kind}`, event);
      }
      if (kind === 'request') await this.#configuration.hooks?.onRequest?.(event);
      else if (kind === 'response') await this.#configuration.hooks?.onResponse?.(event);
      else await this.#configuration.hooks?.onRetry?.({ ...event, reason: extra.reason ?? 'retryable_failure' });
    } catch {
      // Observability is best-effort and must never change request outcomes.
    }
  }
}
