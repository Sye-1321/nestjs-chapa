import { Module } from '@nestjs/common';
import type { ConfigurableModuleAsyncOptions, DynamicModule } from '@nestjs/common';
import type { ChapaModuleOptions } from '../core/config/types.js';
import type { ChapaLogger, ChapaTransport } from '../core/contracts.js';
import { FetchTransport } from '../core/transport/fetch-transport.js';
import { ChapaService } from './chapa-service.js';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './module-definition.js';
import { CHAPA_LOGGER, CHAPA_TRANSPORT } from './tokens.js';

const NOOP_LOGGER: ChapaLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });
export type ChapaModuleAsyncOptions = ConfigurableModuleAsyncOptions<ChapaModuleOptions>;

@Module({
  providers: [
    ChapaService,
    {
      provide: CHAPA_TRANSPORT,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: { readonly transport?: ChapaTransport }): ChapaTransport => options.transport ?? new FetchTransport()
    },
    {
      provide: CHAPA_LOGGER,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: { readonly logger?: ChapaLogger }): ChapaLogger => options.logger ?? NOOP_LOGGER
    }
  ],
  exports: [ChapaService, CHAPA_TRANSPORT, CHAPA_LOGGER]
})
export class ChapaModule {
  static register(options: ChapaModuleOptions): DynamicModule {
    return { ...ConfigurableModuleClass.register(options), module: ChapaModule };
  }

  static registerAsync(options: ChapaModuleAsyncOptions): DynamicModule {
    return { ...ConfigurableModuleClass.registerAsync(options), module: ChapaModule };
  }
}
