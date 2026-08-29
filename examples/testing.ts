import { ChapaModule, type ChapaTransport, type ChapaTransportResponse } from '@sye1321/nestjs-chapa';
import { generateChapaTestSignature } from '@sye1321/nestjs-chapa/testing';

const json = new TextEncoder().encode('{"status":"success","data":{"status":"success"}}');
const response: ChapaTransportResponse = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: json,
  durationMs: 0
};

export const mockTransport: ChapaTransport = {
  send(request) {
    if (request.method !== 'GET') throw new Error(`unexpected ${request.method} request`);
    return Promise.resolve(response);
  }
};

export const testingModule = ChapaModule.register({
  secretKey: 'CHASECK_TEST-FICTIONAL',
  transport: mockTransport
});

const rawBody = Buffer.from('{"event":"charge.success","status":"success","tx_ref":"fictional-order"}');
export const signature = generateChapaTestSignature({
  rawBody,
  secret: 'fictional-webhook-secret'
});
