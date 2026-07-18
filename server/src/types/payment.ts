export type PaymentProviderCode = string;

export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface PaymentMethod {
  code: PaymentProviderCode;
  name: string;
}

export interface CreatePaymentInput {
  orderId: number;
  amount: number;
  ipAddress: string;
}

export interface CreatePaymentResult {
  paymentUrl: string;
  transactionId: string;
}

export interface VerifyPaymentResult {
  orderId: number;
  transactionId: string;
  amount: number;
  status: PaymentStatus;
  rawResponse: Record<string, unknown>;
}

export interface PaymentProvider {
  code: PaymentProviderCode;
  name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyReturn(query: Record<string, string | string[] | undefined>): Promise<VerifyPaymentResult>;
}
