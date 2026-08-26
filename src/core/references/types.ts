export interface GenerateReferenceOptions {
  readonly prefix?: string;
  readonly size?: number;
  readonly separator?: string;
}

export interface ChapaReferences {
  generate(options?: GenerateReferenceOptions): string;
}
