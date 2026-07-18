# Payment API Demo

Demo tích hợp thanh toán tối giản bằng React, Vite, Express, TypeScript và Supabase. Project hiện hỗ trợ VNPay Sandbox và được tổ chức theo Strategy Pattern để thêm provider mới với ít thay đổi.

## Kiến Trúc

- `client`: React UI một sản phẩm demo, lấy danh sách phương thức thanh toán từ API.
- `server`: Express API, controller mỏng, business logic trong service, database access trong repository.
- `server/src/providers`: chứa logic riêng của từng cổng thanh toán.
- `db/schema.sql`: schema Supabase/PostgreSQL gồm `orders` và `payments`.

Luồng chính:

```text
PaymentController -> PaymentService -> PaymentProvider -> VNPayProvider
                                  -> OrderRepository / PaymentRepository
```

## Yêu Cầu

- Node.js 20+
- Supabase project
- Tài khoản VNPay Sandbox gồm `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET`

## Cài Đặt

1. Cài dependencies:

```bash
npm install
```

2. Tạo Supabase project tại `https://supabase.com`.

3. Vào Supabase Dashboard -> SQL Editor, copy nội dung `db/schema.sql` và chạy để tạo bảng.

4. Tạo file cấu hình backend:

```bash
cp server/.env.example server/.env
```

5. Cập nhật `server/.env` bằng thông tin trong Supabase Dashboard -> Project Settings -> API:

```env
PORT=4000
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VNPAY_TMN_CODE=YOUR_TMN_CODE
VNPAY_HASH_SECRET=YOUR_HASH_SECRET
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:4000/api/payments/vnpay/return
```

`SUPABASE_SERVICE_ROLE_KEY` chỉ được dùng ở backend. Không đưa key này vào frontend hoặc public repository.

6. Nếu cần đổi API URL cho frontend, tạo `client/.env` từ `client/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:4000
```

## Chạy Local

Chạy frontend và backend cùng lúc:

```bash
npm run dev
```

Hoặc chạy riêng:

```bash
npm run dev --workspace server
npm run dev --workspace client
```

Mở `http://localhost:5173`, chọn VNPay và bấm `Pay`.

## Build

```bash
npm run build
```

Chạy backend sau build:

```bash
npm run start
```

## API Chính

- `GET /api/payments/methods`: trả danh sách provider đã đăng ký.
- `POST /api/payments/create`: tạo order demo 100,000 VND và trả `paymentUrl`.
- `GET /api/payments/:provider/return`: callback/return URL từ provider, verify kết quả và cập nhật trạng thái.

## Tích Hợp Thêm Một Loại Thanh Toán

Ví dụ thêm MoMo:

1. Tạo provider mới trong `server/src/providers/momoProvider.ts` và implement interface `PaymentProvider`:

```ts
import { CreatePaymentInput, CreatePaymentResult, PaymentProvider, VerifyPaymentResult } from '../types/payment.js';

export class MoMoProvider implements PaymentProvider {
  code = 'momo';
  name = 'MoMo';

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    // Tạo request theo tài liệu MoMo, ký payload, gọi API MoMo.
    return {
      transactionId: `momo-${input.orderId}-${Date.now()}`,
      paymentUrl: 'https://payment-url-from-momo'
    };
  }

  async verifyReturn(query: Record<string, string | string[] | undefined>): Promise<VerifyPaymentResult> {
    // Verify chữ ký/callback theo tài liệu MoMo.
    return {
      orderId: Number(query.orderId),
      transactionId: String(query.transId),
      amount: Number(query.amount),
      status: query.resultCode === '0' ? 'paid' : 'failed',
      rawResponse: query as Record<string, unknown>
    };
  }
}
```

2. Register provider trong `server/src/app.ts`:

```ts
import { MoMoProvider } from './providers/momoProvider.js';

const paymentService = new PaymentService(
  [new VNPayProvider(), new MoMoProvider()],
  new OrderRepository(),
  new PaymentRepository()
);
```

3. Thêm biến môi trường riêng của provider vào `server/.env` nếu provider cần merchant id, access key, secret key hoặc endpoint.

Không cần sửa controller, routes, frontend hoặc database schema vì frontend tự lấy danh sách provider từ `GET /api/payments/methods`, còn service chỉ làm việc qua interface `PaymentProvider`.

## Ghi Chú Supabase

- Backend dùng `@supabase/supabase-js` với service role key để insert/update `orders` và `payments`.
- Frontend không gọi Supabase trực tiếp để tránh lộ service role key và giữ payment flow tập trung ở backend.
- Nếu bật Row Level Security cho bảng, service role key vẫn bypass RLS. Nếu muốn dùng anon key, cần tạo policy insert/update phù hợp, nhưng không khuyến nghị cho demo payment callback.
