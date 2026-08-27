import type { ChapaResponseMetadata } from '../contracts.js';
import type { ChapaSafeReadRequestOptions } from '../payments/types.js';

export interface ChapaMetadata {
  listBanks(options?: ChapaSafeReadRequestOptions): Promise<ListBanksResult>;
  listCurrencies(options?: ChapaSafeReadRequestOptions): Promise<ListCurrenciesResult>;
}

export interface ChapaBank {
  readonly id?: string | number;
  readonly name: string;
  readonly slug?: string;
  readonly swift?: string;
  readonly accountLength?: number;
  readonly currency?: string;
  readonly raw: unknown;
}

export interface ListBanksResult {
  readonly banks: readonly ChapaBank[];
  readonly response: ChapaResponseMetadata;
  readonly raw: unknown;
}

export interface ChapaCurrency {
  readonly providerCode: number;
  readonly name: string;
  readonly raw: unknown;
}

export interface ListCurrenciesResult {
  readonly currencies: readonly ChapaCurrency[];
  readonly response: ChapaResponseMetadata;
  readonly raw: unknown;
}
