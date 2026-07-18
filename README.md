# Payment API Demo

Demo tích hợp thanh toán tối giản bằng React, Vite, Express, TypeScript và Supabase.

## Cách Chạy Project

1. Cài dependencies:

```bash
npm install
```

2. Chạy frontend và backend:

```bash
npm run dev
```

Frontend chạy tại:

```text
http://localhost:5173
```

Backend chạy tại:

```text
http://localhost:4000
```

## Tích Hợp Thêm Một Loại Thanh Toán

Project dùng Strategy Pattern. Để thêm một cổng thanh toán mới như MoMo, PayPal hoặc Stripe, chỉ cần thêm provider mới và đăng ký provider đó vào `PaymentService`.

1. Tạo file provider mới, ví dụ `server/src/providers/momoProvider.ts`:

```ts
import { CreatePaymentInput, CreatePaymentResult, PaymentProvider, VerifyPaymentResult } from '../types/payment.js';

export class MoMoProvider implements PaymentProvider {
  code = 'momo';
  name = 'MoMo';

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    // Tạo request thanh toán theo tài liệu của provider.
    return {
      transactionId: `momo-${input.orderId}-${Date.now()}`,
      paymentUrl: 'https://payment-url-from-provider'
    };
  }

  async verifyReturn(query: Record<string, string | string[] | undefined>): Promise<VerifyPaymentResult> {
    // Verify callback/return theo tài liệu của provider.
    return {
      orderId: Number(query.orderId),
      transactionId: String(query.transactionId),
      amount: Number(query.amount),
      status: query.status === 'success' ? 'paid' : 'failed',
      rawResponse: query as Record<string, unknown>
    };
  }
}
```

2. Đăng ký provider trong `server/src/app.ts`:

```ts
import { MoMoProvider } from './providers/momoProvider.js';

const paymentService = new PaymentService(
  [new VNPayProvider(), new MoMoProvider()],
  new OrderRepository(),
  new PaymentRepository()
);
```

Không cần sửa controller, route, frontend hoặc database schema. Frontend tự lấy danh sách phương thức thanh toán từ API `GET /api/payments/methods`.
