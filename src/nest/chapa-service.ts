import { Inject, Injectable } from '@nestjs/common';
import { ChapaClient } from '../core/client/chapa-client.js';
import type { ChapaModuleOptions } from '../core/config/types.js';
import type { ChapaLogger, ChapaTransport } from '../core/contracts.js';
import type { ChapaMetadata } from '../core/metadata/types.js';
import type { ChapaPayments } from '../core/payments/types.js';
import type { ChapaReferences } from '../core/references/types.js';
import type { ChapaWebhooks } from '../core/webhooks/types.js';
import { MODULE_OPTIONS_TOKEN } from './module-definition.js';
import { CHAPA_LOGGER, CHAPA_TRANSPORT } from './tokens.js';

/** Framework-managed facade injected after registering {@link ChapaModule}.
 * @public
 */
@Injectable()
export class ChapaService {
  /** Payment initialization, verification, and checkout cancellation operations. */
  readonly payments: ChapaPayments;
  /** Evidence-backed bank and currency lookups. */
  readonly metadata: ChapaMetadata;
  /** Offline webhook signature verification. */
  readonly webhooks: ChapaWebhooks;
  /** Local cryptographic transaction-reference generation. */
  readonly references: ChapaReferences;

  /**
   * Constructed by Nest dependency injection.
   * @internal
   */
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) options: ChapaModuleOptions,
    @Inject(CHAPA_TRANSPORT) transport: ChapaTransport,
    @Inject(CHAPA_LOGGER) logger: ChapaLogger
  ) {
    const client = new ChapaClient({ ...options, transport, logger });
    this.payments = client.payments;
    this.metadata = client.metadata;
    this.webhooks = client.webhooks;
    this.references = client.references;
  }
}
