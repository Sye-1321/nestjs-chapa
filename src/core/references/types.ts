/** Controls local cryptographic transaction-reference generation.
 * @public
 */
export interface GenerateReferenceOptions {
  /** Optional reference prefix using letters, digits, or underscores. */
  readonly prefix?: string;
  /** Random-body length; the complete reference must not exceed 50 characters. */
  readonly size?: number;
  /** Separator inserted after a prefix; defaults to an underscore. */
  readonly separator?: string;
}

/** Local reference generation with no provider request.
 * @public
 */
export interface ChapaReferences {
  /** Generates a cryptographically random Chapa-compatible reference. */
  generate(options?: GenerateReferenceOptions): string;
}
