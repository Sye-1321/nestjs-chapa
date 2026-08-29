import type { ChapaResponseMetadata } from '../contracts.js';
import type { ChapaSafeReadRequestOptions } from '../payments/types.js';

/** Evidence-backed Chapa metadata lookups. Results are not cached by the SDK.
 * @public
 */
export interface ChapaMetadata {
  /** Lists provider banks using a safe GET operation. */
  listBanks(options?: ChapaSafeReadRequestOptions): Promise<ListBanksResult>;
  /** Lists provider-supported currencies using a safe GET operation. */
  listCurrencies(options?: ChapaSafeReadRequestOptions): Promise<ListCurrenciesResult>;
}

/** Normalized bank fields supported by committed provider evidence.
 * @public
 */
export interface ChapaBank {
  /** Provider bank identifier. */
  readonly id?: string | number;
  /** Usable provider bank name. */
  readonly name: string;
  /** Provider slug, when present. */
  readonly slug?: string;
  /** Provider SWIFT code, when present. */
  readonly swift?: string;
  /** Provider account-length value, when present. */
  readonly accountLength?: number;
  /** Provider currency value, when present. */
  readonly currency?: string;
  /** Unnormalized bank record. */
  readonly raw: unknown;
}

/** Bank-list result and its request metadata.
 * @public
 */
export interface ListBanksResult {
  /** Normalized bank records. */
  readonly banks: readonly ChapaBank[];
  /** Safe request/response metadata. */
  readonly response: ChapaResponseMetadata;
  /** Unnormalized provider payload. */
  readonly raw: unknown;
}

/** Currency entry reconstructed from Chapa's parallel response arrays.
 * @public
 */
export interface ChapaCurrency {
  /** Numeric provider currency identifier. */
  readonly providerCode: number;
  /** Provider currency name. */
  readonly name: string;
  /** Unnormalized currency entry. */
  readonly raw: unknown;
}

/** Currency-list result and its request metadata.
 * @public
 */
export interface ListCurrenciesResult {
  /** Normalized provider currencies. */
  readonly currencies: readonly ChapaCurrency[];
  /** Safe request/response metadata. */
  readonly response: ChapaResponseMetadata;
  /** Unnormalized provider payload. */
  readonly raw: unknown;
}
