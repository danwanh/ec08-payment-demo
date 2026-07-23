import { env } from '../config/env.js';
import { OrderRepository } from '../repositories/orderRepository.js';
import { PaymentRepository } from '../repositories/paymentRepository.js';
import { PaymentIpnResponse, PaymentMethod, PaymentProvider } from '../types/payment.js';

export class PaymentService {
  private providers: Map<string, PaymentProvider>;

  constructor(
    providers: PaymentProvider[],
    private readonly orderRepository: OrderRepository,
    private readonly paymentRepository: PaymentRepository
  ) {
    this.providers = new Map(providers.map((provider) => [provider.code, provider]));
  }

  getPaymentMethods(): PaymentMethod[] {
    return Array.from(this.providers.values()).map((provider) => ({
      code: provider.code,
      name: provider.name
    }));
  }

  async createPayment(providerCode: string, amount: number, ipAddress: string): Promise<{ paymentUrl: string; orderId: number }> {
    const provider = this.getProvider(providerCode);
    const order = await this.orderRepository.create(amount);
    const payment = await provider.createPayment({ orderId: order.id, amount, ipAddress });

    await this.paymentRepository.create({
      orderId: order.id,
      provider: provider.code,
      transactionId: payment.transactionId,
      amount,
      status: 'pending'
    });

    return { orderId: order.id, paymentUrl: payment.paymentUrl };
  }

  async handleReturn(providerCode: string, query: Record<string, string | string[] | undefined>): Promise<{ redirectUrl: string }> {
    const provider = this.getProvider(providerCode);
    const result = await provider.verifyReturn(query);

    await this.paymentRepository.updateByTransactionId(result.transactionId, result.status, result.rawResponse);
    await this.orderRepository.updatePaymentStatus(result.orderId, result.status);

    const redirectUrl = new URL('/payment-result', env.clientUrl);
    redirectUrl.searchParams.set('status', result.status);
    redirectUrl.searchParams.set('orderId', String(result.orderId));

    return { redirectUrl: redirectUrl.toString() };
  }

  async handleIpn(providerCode: string, query: Record<string, string | string[] | undefined>): Promise<PaymentIpnResponse> {
    const provider = this.getProvider(providerCode);

    if (provider.code !== 'vnpay' || !('verifyIpn' in provider) || typeof provider.verifyIpn !== 'function') {
      return { RspCode: '99', Message: 'Unsupported IPN provider' };
    }

    const result = provider.verifyIpn(query);

    if (!result.isValidSignature) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const payment = await this.paymentRepository.findByTransactionId(result.transactionId);
    if (!payment) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    const order = await this.orderRepository.findById(result.orderId);
    if (!order) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    if (payment.amount !== result.amount || order.amount !== result.amount) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    if (payment.status !== 'pending' || order.payment_status !== 'pending') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    await this.paymentRepository.updateByTransactionId(result.transactionId, result.status, result.rawResponse);
    await this.orderRepository.updatePaymentStatus(result.orderId, result.status);

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  private getProvider(providerCode: string): PaymentProvider {
    const provider = this.providers.get(providerCode);

    if (!provider) {
      throw new Error(`Unsupported payment provider: ${providerCode}`);
    }

    return provider;
  }
}
