import { Inject, Injectable } from '@nestjs/common';
import { ChapaClient } from '../core/client/chapa-client.js';
import type { ChapaModuleOptions } from '../core/config/types.js';
import type { ChapaMetadata } from '../core/metadata/types.js';
import type { ChapaPayments } from '../core/payments/types.js';
import type { ChapaReferences } from '../core/references/types.js';
import type { ChapaWebhooks } from '../core/webhooks/types.js';
import { MODULE_OPTIONS_TOKEN } from './module-definition.js';

@Injectable()
export class ChapaService {
  readonly payments: ChapaPayments;
  readonly metadata: ChapaMetadata;
  readonly webhooks: ChapaWebhooks;
  readonly references: ChapaReferences;

  constructor(@Inject(MODULE_OPTIONS_TOKEN) options: ChapaModuleOptions) {
    const client = new ChapaClient(options);
    this.payments = client.payments;
    this.metadata = client.metadata;
    this.webhooks = client.webhooks;
    this.references = client.references;
  }
}
