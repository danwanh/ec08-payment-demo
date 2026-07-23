import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { CreatePaymentInput, CreatePaymentResult, PaymentProvider, VerifyPaymentResult } from '../types/payment.js';

export class VNPayProvider implements PaymentProvider {
  code = 'vnpay';
  name = 'VNPay';

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    this.ensureConfigured();

    const transactionId = `${input.orderId}-${Date.now()}`;
    const createdAt = new Date();
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: env.vnpay.tmnCode,
      vnp_Amount: String(input.amount * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: transactionId,
      vnp_OrderInfo: `Payment for order ${input.orderId}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: env.vnpay.returnUrl,
      vnp_IpAddr: input.ipAddress,
      vnp_CreateDate: this.formatVNPayDate(createdAt)
    };

    const signedParams = this.signParams(params);

    return {
      transactionId,
      paymentUrl: `${env.vnpay.paymentUrl}?${this.stringifyParams(signedParams)}`
    };
  }

  async verifyReturn(query: Record<string, string | string[] | undefined>): Promise<VerifyPaymentResult> {
    this.ensureConfigured();

    return this.verifyPaymentResult(query);
  }

  verifyIpn(query: Record<string, string | string[] | undefined>): VerifyPaymentResult {
    this.ensureConfigured();

    return this.verifyPaymentResult(query);
  }

  private verifyPaymentResult(query: Record<string, string | string[] | undefined>): VerifyPaymentResult {
    const params = this.normalizeQuery(query);
    const secureHash = params.vnp_SecureHash;
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const expectedHash = this.hashParams(params);
    const transactionId = params.vnp_TxnRef;
    const orderId = Number((transactionId ?? '').split('-')[0]);
    const amount = Number(params.vnp_Amount) / 100;
    const isValidSignature = secureHash === expectedHash;
    const isSuccessful = params.vnp_ResponseCode === '00' && (params.vnp_TransactionStatus ?? '00') === '00';

    return {
      orderId,
      transactionId,
      amount,
      status: isValidSignature && isSuccessful ? 'paid' : 'failed',
      isValidSignature,
      rawResponse: { ...params, vnp_SecureHash: secureHash }
    };
  }

  private ensureConfigured(): void {
    if (!env.vnpay.tmnCode || !env.vnpay.hashSecret) {
      throw new Error('VNPay is not configured. Set VNPAY_TMN_CODE and VNPAY_HASH_SECRET.');
    }
  }

  private signParams(params: Record<string, string>): Record<string, string> {
    const signedParams = this.sortParams(params);
    signedParams.vnp_SecureHash = this.hashParams(signedParams);
    return signedParams;
  }

  private hashParams(params: Record<string, string>): string {
    return crypto.createHmac('sha512', env.vnpay.hashSecret).update(this.stringifyParams(this.sortParams(params))).digest('hex');
  }

  private stringifyParams(params: Record<string, string>): string {
    return Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%20/g, '+')}`)
      .join('&');
  }

  private sortParams(params: Record<string, string>): Record<string, string> {
    return Object.keys(params)
      .sort()
      .reduce<Record<string, string>>((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
  }

  private normalizeQuery(query: Record<string, string | string[] | undefined>): Record<string, string> {
    return Object.entries(query).reduce<Record<string, string>>((result, [key, value]) => {
      if (typeof value === 'string') {
        result[key] = value;
      }
      return result;
    }, {});
  }

  private formatVNPayDate(date: Date): string {
    const parts = [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
    ];

    return parts.map((part) => String(part).padStart(2, '0')).join('');
  }
}
