import { resolveChapaConfiguration, type ResolvedChapaConfiguration } from '../config/configuration.js';
import type { ChapaModuleOptions } from '../config/types.js';
import { ChapaRequestExecutor } from '../executor/request-executor.js';
import { FetchTransport } from '../transport/fetch-transport.js';

export class ChapaClient {
  readonly configuration: ResolvedChapaConfiguration;
  readonly executor: ChapaRequestExecutor;

  constructor(options: ChapaModuleOptions) {
    this.configuration = resolveChapaConfiguration(options);
    const transport = this.configuration.transport ?? new FetchTransport();
    this.executor = new ChapaRequestExecutor(this.configuration, transport);
  }
}
