import { supabase } from '../db/supabase.js';
import { PaymentStatus } from '../types/payment.js';

export interface OrderRecord {
  id: number;
  amount: number;
  payment_status: PaymentStatus;
  created_at: Date;
}

export class OrderRepository {
  async findById(orderId: number): Promise<OrderRecord | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('id, amount, payment_status, created_at')
      .eq('id', orderId)
      .maybeSingle<OrderRecord>();

    if (error) {
      throw new Error(`Cannot find order: ${error.message}`);
    }

    return data;
  }

  async create(amount: number): Promise<OrderRecord> {
    const { data, error } = await supabase
      .from('orders')
      .insert({ amount, payment_status: 'pending' })
      .select('id, amount, payment_status, created_at')
      .single<OrderRecord>();

    if (error) {
      throw new Error(`Cannot create order: ${error.message}`);
    }

    return data;
  }

  async updatePaymentStatus(orderId: number, status: PaymentStatus): Promise<void> {
    const { error } = await supabase.from('orders').update({ payment_status: status }).eq('id', orderId);

    if (error) {
      throw new Error(`Cannot update order payment status: ${error.message}`);
    }
  }
}
