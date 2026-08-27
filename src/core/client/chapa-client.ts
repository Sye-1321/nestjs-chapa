import { resolveChapaConfiguration, type ResolvedChapaConfiguration } from '../config/configuration.js';
import type { ChapaModuleOptions } from '../config/types.js';
import { ChapaRequestExecutor } from '../executor/request-executor.js';
import { MetadataResource } from '../metadata/metadata-resource.js';
import { PaymentsResource } from '../payments/payments-resource.js';
import { ReferencesResource } from '../references/references-resource.js';
import { FetchTransport } from '../transport/fetch-transport.js';
import { WebhooksResource } from '../webhooks/webhooks-resource.js';

export class ChapaClient {
  readonly configuration: ResolvedChapaConfiguration;
  readonly executor: ChapaRequestExecutor;
  readonly payments: PaymentsResource;
  readonly references: ReferencesResource;
  readonly metadata: MetadataResource;
  readonly webhooks: WebhooksResource;

  constructor(options: ChapaModuleOptions) {
    this.configuration = resolveChapaConfiguration(options);
    const transport = this.configuration.transport ?? new FetchTransport();
    this.executor = new ChapaRequestExecutor(this.configuration, transport);
    this.payments = new PaymentsResource(this.executor, this.configuration);
    this.references = new ReferencesResource();
    this.metadata = new MetadataResource(this.executor);
    this.webhooks = new WebhooksResource(this.configuration);
  }
}
