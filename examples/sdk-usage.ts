import { Injectable, Module } from '@nestjs/common';
import {
  ChapaError,
  ChapaModule,
  ChapaService,
  type ChapaModuleOptions,
  type InitializePaymentInput,
  type VerifyWebhookInput
} from '@sye1321/nestjs-chapa';

@Module({
  imports: [
    ChapaModule.register({
      secretKey: 'CHASECK_TEST-FICTIONAL',
      webhookSecret: 'fictional-webhook-secret'
    })
  ]
})
export class SynchronousExampleModule {}

@Module({
  imports: [
    ChapaModule.registerAsync({
      useFactory: (): ChapaModuleOptions => ({
        secretKey: 'CHASECK_TEST-FICTIONAL'
      })
    })
  ]
})
export class AsynchronousExampleModule {}

@Injectable()
export class CheckoutExample {
  constructor(private readonly chapa: ChapaService) {}

  async initialize(input: InitializePaymentInput): Promise<string> {
    const payment = await this.chapa.payments.initialize(input);
    return payment.checkoutUrl;
  }

  async verifyBeforeFulfilment(txRef: string): Promise<boolean> {
    try {
      const payment = await this.chapa.payments.verify(txRef);
      return payment.status === 'success';
    } catch (error) {
      if (error instanceof ChapaError) console.error(error.toJSON());
      throw error;
    }
  }

  verifyWebhook(input: VerifyWebhookInput): string | undefined {
    return this.chapa.webhooks.verify(input).event.txRef;
  }
}
