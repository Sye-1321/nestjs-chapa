import { ChapaResponseError } from '../errors/errors.js';
import type { ChapaRequestExecutor, ExecutionResult } from '../executor/request-executor.js';
import type { ChapaSafeReadRequestOptions } from '../payments/types.js';
import type { ChapaBank, ChapaCurrency, ChapaMetadata, ListBanksResult, ListCurrenciesResult } from './types.js';

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function responseError(result: ExecutionResult, operation: 'metadata.listBanks' | 'metadata.listCurrencies', message: string): ChapaResponseError {
  return new ChapaResponseError({
    code: 'response_error', message, operation, method: 'GET', endpoint: result.metadata.endpoint,
    httpStatus: result.metadata.httpStatus, attempts: result.metadata.attempts,
    ...(result.metadata.correlationId ? { correlationId: result.metadata.correlationId } : {}), retryable: false, raw: result.raw
  });
}

function usableString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export class MetadataResource implements ChapaMetadata {
  readonly #executor: ChapaRequestExecutor;

  constructor(executor: ChapaRequestExecutor) {
    this.#executor = executor;
  }

  async listBanks(options?: ChapaSafeReadRequestOptions): Promise<ListBanksResult> {
    const result = await this.#executor.execute({
      policy: { operation: 'metadata.listBanks', method: 'GET', path: '/banks', retry: 'safe-read' }, ...(options ? { options } : {})
    });
    const envelope = objectValue(result.data);
    const records = envelope?.data;
    if (!Array.isArray(records)) throw responseError(result, 'metadata.listBanks', 'Chapa bank response is missing its bank array');
    const banks: ChapaBank[] = records.map((record) => {
      const bank = objectValue(record);
      if (!bank || !usableString(bank.name)) throw responseError(result, 'metadata.listBanks', 'Chapa bank response contains a malformed bank');
      const id = typeof bank.id === 'string' || (typeof bank.id === 'number' && Number.isFinite(bank.id)) ? bank.id : undefined;
      const slug = usableString(bank.slug) ? bank.slug : undefined;
      const swift = usableString(bank.swift) ? bank.swift : undefined;
      const accountLength = typeof bank.acct_length === 'number' && Number.isFinite(bank.acct_length) ? bank.acct_length : undefined;
      const currency = usableString(bank.currency) ? bank.currency : undefined;
      return {
        ...(id !== undefined ? { id } : {}), name: bank.name, ...(slug ? { slug } : {}), ...(swift ? { swift } : {}),
        ...(accountLength !== undefined ? { accountLength } : {}), ...(currency ? { currency } : {}), raw: record
      };
    });
    return { banks, response: result.metadata, raw: result.raw };
  }

  async listCurrencies(options?: ChapaSafeReadRequestOptions): Promise<ListCurrenciesResult> {
    const result = await this.#executor.execute({
      policy: { operation: 'metadata.listCurrencies', method: 'GET', path: '/currency_supported', retry: 'safe-read' }, ...(options ? { options } : {})
    });
    const envelope = objectValue(result.data);
    const codes = envelope?.currency_code;
    const names = envelope?.currency_name;
    if (!Array.isArray(codes) || !Array.isArray(names) || codes.length !== names.length) {
      throw responseError(result, 'metadata.listCurrencies', 'Chapa currency response contains invalid parallel arrays');
    }
    const currencies: ChapaCurrency[] = codes.map((providerCode, index) => {
      const name = names[index];
      if (typeof providerCode !== 'number' || !Number.isFinite(providerCode) || !usableString(name)) {
        throw responseError(result, 'metadata.listCurrencies', 'Chapa currency response contains an unusable entry');
      }
      return { providerCode, name, raw: { currency_code: providerCode, currency_name: name } };
    });
    return { currencies, response: result.metadata, raw: result.raw };
  }
}
