import { supabase } from '../db/supabase.js';
import { PaymentStatus } from '../types/payment.js';

export interface CreatePaymentRecordInput {
  orderId: number;
  provider: string;
  transactionId: string;
  amount: number;
  status: PaymentStatus;
  rawResponse?: Record<string, unknown>;
}

export class PaymentRepository {
  async create(input: CreatePaymentRecordInput): Promise<void> {
    const { error } = await supabase.from('payments').insert({
      order_id: input.orderId,
      provider: input.provider,
      transaction_id: input.transactionId,
      amount: input.amount,
      status: input.status,
      raw_response: input.rawResponse ?? {}
    });

    if (error) {
      throw new Error(`Cannot create payment: ${error.message}`);
    }
  }

  async updateByTransactionId(
    transactionId: string,
    status: PaymentStatus,
    rawResponse: Record<string, unknown>
  ): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .update({ status, raw_response: rawResponse })
      .eq('transaction_id', transactionId);

    if (error) {
      throw new Error(`Cannot update payment: ${error.message}`);
    }
  }
}
