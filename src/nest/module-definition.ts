import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { ChapaModuleOptions } from '../core/config/types.js';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<ChapaModuleOptions>({
  moduleName: 'Chapa'
})
  .setClassMethodName('register')
  .build();
