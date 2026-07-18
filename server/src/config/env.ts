import dotenv from 'dotenv';

dotenv.config();

function normalizeOrigin(origin: string): string {
  if (origin.includes('*')) {
    return origin.replace(/\/$/, '');
  }

  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/$/, '');
  }
}

function parseOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

const clientUrl = normalizeOrigin(process.env.CLIENT_URL ?? 'http://localhost:5173');

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientUrl,
  corsOrigins: Array.from(new Set([clientUrl, ...parseOrigins(process.env.CORS_ORIGINS)])),
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  },
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE ?? '',
    hashSecret: process.env.VNPAY_HASH_SECRET ?? '',
    paymentUrl: process.env.VNPAY_PAYMENT_URL ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL ?? 'http://localhost:4000/api/payments/vnpay/return'
  },
  stripe: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    currency: process.env.STRIPE_CURRENCY ?? 'vnd',
    returnUrl: process.env.STRIPE_RETURN_URL ?? 'http://localhost:4000/api/payments/stripe/return'
  }
};
