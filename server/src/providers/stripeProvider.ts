import Stripe from 'stripe';
import { env } from '../config/env.js';
import { CreatePaymentInput, CreatePaymentResult, PaymentProvider, VerifyPaymentResult } from '../types/payment.js';

export class StripeProvider implements PaymentProvider {
  code = 'stripe';
  name = 'Stripe';

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    this.ensureConfigured();

    const stripe = this.getClient();
    const transactionId = `stripe-${input.orderId}-${Date.now()}`;
    const successUrl = `${env.stripe.returnUrl}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${env.stripe.returnUrl}?status=failed`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: String(input.orderId),
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: env.stripe.currency,
            product_data: {
              name: `Payment for order ${input.orderId}`
            },
            unit_amount: input.amount
          }
        }
      ],
      metadata: {
        orderId: String(input.orderId),
        amount: String(input.amount),
        transactionId
      }
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout session URL.');
    }

    return {
      transactionId: session.id,
      paymentUrl: session.url
    };
  }

  async verifyReturn(query: Record<string, string | string[] | undefined>): Promise<VerifyPaymentResult> {
    this.ensureConfigured();

    const sessionId = this.getQueryValue(query.session_id);

    if (!sessionId) {
      return {
        orderId: 0,
        transactionId: '',
        amount: 0,
        status: 'failed',
        rawResponse: this.normalizeQuery(query)
      };
    }

    const stripe = this.getClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId = Number(session.client_reference_id ?? session.metadata?.orderId ?? 0);
    const amount = Number(session.amount_total ?? 0);
    const currency = session.currency ?? env.stripe.currency;

    return {
      orderId,
      transactionId: session.id,
      amount,
      status: session.payment_status === 'paid' ? 'paid' : 'failed',
      rawResponse: {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        client_reference_id: session.client_reference_id,
        amount_total: session.amount_total,
        currency,
        metadata: session.metadata
      }
    };
  }

  private ensureConfigured(): void {
    if (!env.stripe.secretKey) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
    }
  }

  private getClient(): Stripe {
    return new Stripe(env.stripe.secretKey);
  }

  private getQueryValue(value: string | string[] | undefined): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.find((item): item is string => typeof item === 'string');
    }

    return undefined;
  }

  private normalizeQuery(query: Record<string, string | string[] | undefined>): Record<string, unknown> {
    return Object.entries(query).reduce<Record<string, unknown>>((result, [key, value]) => {
      result[key] = value;
      return result;
    }, {});
  }
}