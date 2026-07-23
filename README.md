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

## Hướng Dẫn Tích Hợp VNPay

Project này đã có sẵn luồng VNPay ở backend và frontend. Backend tạo URL thanh toán, redirect người dùng sang VNPay, nhận callback từ VNPay, xác thực chữ ký rồi cập nhật trạng thái đơn hàng trong Supabase.

### 1. Chuẩn Bị Tài Khoản Và Database

Đăng ký tài khoản VNPay sandbox để lấy:

- `VNPAY_TMN_CODE`: mã website/terminal của merchant.
- `VNPAY_HASH_SECRET`: khóa bí mật dùng để ký và xác thực dữ liệu.
- `VNPAY_PAYMENT_URL`: URL cổng thanh toán sandbox, mặc định là `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`.

Tạo database Supabase bằng script `db/schema.sql`. Project cần 2 bảng:

- `orders`: lưu đơn hàng và trạng thái thanh toán.
- `payments`: lưu giao dịch theo provider, mã giao dịch, số tiền, trạng thái và dữ liệu callback gốc.

### 2. Cấu Hình Backend

Tạo file `server/.env` từ `server/.env.example`:

```env
PORT=4000
CLIENT_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

VNPAY_TMN_CODE=YOUR_TMN_CODE
VNPAY_HASH_SECRET=YOUR_HASH_SECRET
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:4000/api/payments/vnpay/return
VNPAY_IPN_URL=http://localhost:4000/api/payments/vnpay/ipn
```

Ý nghĩa các biến quan trọng:

- `CLIENT_URL`: địa chỉ frontend để backend redirect về sau khi thanh toán xong.
- `CORS_ORIGINS`: danh sách domain frontend được phép gọi API.
- `VNPAY_RETURN_URL`: endpoint backend mà VNPay gọi lại sau khi người dùng hoàn tất thanh toán.
- `VNPAY_IPN_URL`: endpoint backend để server VNPay báo kết quả thanh toán trực tiếp.
- `SUPABASE_SERVICE_ROLE_KEY`: key dùng cho backend thao tác với bảng `orders` và `payments`.

Khi deploy thật, đổi `CLIENT_URL`, `CORS_ORIGINS`, `VNPAY_RETURN_URL` và `VNPAY_IPN_URL` sang domain production. Hai URL VNPay phải là URL public để VNPay truy cập được.

### 3. Cấu Hình Frontend

Tạo file `client/.env` từ `client/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:4000
```

Biến này được dùng trong `client/src/App.tsx` để gọi backend:

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
```

Khi deploy frontend, đổi `VITE_API_BASE_URL` thành domain backend production.

### 4. Đăng Ký VNPay Provider Trong Backend

VNPay provider đã được đăng ký trong `server/src/app.ts`:

```ts
const paymentService = new PaymentService(
  [new VNPayProvider(), new StripeProvider()],
  new OrderRepository(),
  new PaymentRepository()
);
```

Nhờ vậy API `GET /api/payments/methods` sẽ trả về phương thức `vnpay`, frontend tự render radio button mà không cần hard-code.

### 5. Luồng Tạo Thanh Toán

Frontend gọi API tạo thanh toán trong `client/src/App.tsx`:

```ts
await fetch(`${API_BASE_URL}/api/payments/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider: selectedMethod })
});
```

Backend xử lý trong `server/src/controllers/paymentController.ts`:

```ts
router.post('/create', async (req, res, next) => {
  const provider = String(req.body.provider ?? '');
  const result = await paymentService.createPayment(provider, DEMO_AMOUNT, req.ip ?? '127.0.0.1');
  res.json(result);
});
```

Với code hiện tại, số tiền demo đang cố định là `100000` VND qua hằng số `DEMO_AMOUNT`.

Trong `server/src/services/paymentService.ts`, backend sẽ:

- Tạo order mới với trạng thái `pending`.
- Gọi `VNPayProvider.createPayment()` để sinh URL thanh toán.
- Tạo bản ghi `payments` với trạng thái `pending`.
- Trả `paymentUrl` về frontend.

Frontend nhận `paymentUrl` và redirect người dùng sang VNPay:

```ts
window.location.href = data.paymentUrl;
```

### 6. Cách VNPay Provider Tạo URL Thanh Toán

Code chính nằm trong `server/src/providers/vnpayProvider.ts`.

`createPayment()` tạo các tham số VNPay:

- `vnp_Version`: phiên bản API, hiện là `2.1.0`.
- `vnp_Command`: lệnh thanh toán, hiện là `pay`.
- `vnp_TmnCode`: lấy từ `VNPAY_TMN_CODE`.
- `vnp_Amount`: số tiền nhân `100` theo quy định VNPay.
- `vnp_CurrCode`: `VND`.
- `vnp_TxnRef`: mã giao dịch nội bộ, hiện có dạng `{orderId}-{timestamp}`.
- `vnp_OrderInfo`: nội dung thanh toán.
- `vnp_OrderType`: loại đơn hàng, hiện là `other`.
- `vnp_Locale`: ngôn ngữ, hiện là `vn`.
- `vnp_ReturnUrl`: lấy từ `VNPAY_RETURN_URL`.
- `vnp_IpAddr`: IP người thanh toán.
- `vnp_CreateDate`: thời gian tạo giao dịch theo format `yyyyMMddHHmmss`.

IPN URL không được đưa vào danh sách tham số tạo payment URL để tránh lệch chữ ký. Nếu tài khoản VNPay yêu cầu, cấu hình `VNPAY_IPN_URL` trong cổng merchant VNPay hoặc gửi theo đúng hình thức mà VNPay cấp riêng cho tài khoản đó.

Sau đó provider sort params theo tên key, ký bằng HMAC SHA512 với `VNPAY_HASH_SECRET`, thêm `vnp_SecureHash`, rồi ghép thành URL:

```ts
paymentUrl: `${env.vnpay.paymentUrl}?${this.stringifyParams(signedParams)}`
```

### 7. Luồng Callback Và IPN Sau Khi Thanh Toán

Sau khi người dùng thanh toán trên VNPay, VNPay redirect về:

```text
GET /api/payments/vnpay/return
```

Route này được định nghĩa trong `server/src/controllers/paymentController.ts`:

```ts
router.get('/:provider/return', async (req, res, next) => {
  const result = await paymentService.handleReturn(req.params.provider, toPaymentQuery(req.query));
  res.redirect(result.redirectUrl);
});
```

`PaymentService.handleReturn()` sẽ:

- Gọi `VNPayProvider.verifyReturn()` để kiểm tra callback.
- Cập nhật bảng `payments` theo `transaction_id`.
- Cập nhật `orders.payment_status`.
- Redirect người dùng về frontend tại `/payment-result?status=...&orderId=...`.

Ngoài return URL, backend có endpoint IPN để server VNPay gọi trực tiếp:

```text
GET /api/payments/vnpay/ipn
```

`PaymentService.handleIpn()` sẽ kiểm tra chữ ký, kiểm tra giao dịch tồn tại, kiểm tra số tiền khớp, đảm bảo đơn chưa được xác nhận, cập nhật Supabase rồi trả JSON cho VNPay:

```json
{ "RspCode": "00", "Message": "Confirm Success" }
```

Các lỗi chính được trả về gồm `97` khi sai chữ ký, `01` khi không tìm thấy đơn, `04` khi sai số tiền, `02` khi đơn đã được xác nhận.

Trong `VNPayProvider.verifyReturn()`, giao dịch được xem là thành công khi:

```ts
secureHash === expectedHash && params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00'
```

Nếu chữ ký sai hoặc `vnp_ResponseCode` khác `00`, trạng thái sẽ là `failed`.

### 8. Hiển Thị Kết Quả Trên Frontend

Sau khi backend redirect về frontend, `client/src/App.tsx` đọc query string:

```ts
const result = new URLSearchParams(window.location.search);
```

Nếu URL có `status`, frontend hiển thị kết quả:

```tsx
Order #{result.get('orderId')} payment status: {result.get('status')}
```

Ví dụ URL kết quả:

```text
http://localhost:5173/payment-result?status=paid&orderId=1
```

### 9. Chạy Và Kiểm Tra

Chạy project:

```bash
npm install
npm run dev
```

Kiểm tra backend:

```text
GET http://localhost:4000/health
GET http://localhost:4000/api/payments/methods
```

Kiểm tra luồng VNPay:

1. Mở `http://localhost:5173`.
2. Chọn `VNPay`.
3. Bấm `Pay`.
4. Frontend redirect sang trang thanh toán VNPay sandbox.
5. Hoàn tất thanh toán bằng thông tin test của VNPay.
6. VNPay gọi `VNPAY_IPN_URL` để backend xác thực, cập nhật Supabase và trả `RspCode`/`Message`.
7. VNPay redirect trình duyệt về `VNPAY_RETURN_URL`.
8. Frontend hiển thị trạng thái `paid` hoặc `failed`.

### 10. Lưu Ý Khi Đưa Lên Production

- Không commit file `.env` chứa `VNPAY_HASH_SECRET` hoặc `SUPABASE_SERVICE_ROLE_KEY`.
- `VNPAY_RETURN_URL` phải trỏ đến backend public, không dùng `localhost` khi chạy trên sandbox/production từ môi trường ngoài máy local.
- `VNPAY_IPN_URL` cũng phải trỏ đến backend public và nên được cấu hình trong cổng VNPay nếu tài khoản yêu cầu khai báo URL IPN.
- Cần cấu hình đúng domain frontend trong `CLIENT_URL` và `CORS_ORIGINS`.
- Số tiền hiện đang cố định trong `DEMO_AMOUNT`; nếu tích hợp vào web thật, nên truyền amount từ order/cart thật và validate lại ở backend.
- Backend xử lý cả return URL cho trình duyệt và IPN cho xác nhận server-to-server từ VNPay.

## Deploy Frontend Lên Vercel Và Backend Lên Render

Khi deploy, frontend và backend sẽ chạy ở 2 domain khác nhau. Vì vậy cần cấu hình đúng URL giữa hai bên:

- Frontend trên Vercel cần biết URL backend qua `VITE_API_BASE_URL`.
- Backend trên Render cần biết URL frontend qua `CLIENT_URL` và `CORS_ORIGINS`.
- VNPay cần callback về backend qua `VNPAY_RETURN_URL` và `VNPAY_IPN_URL`.

### 1. Deploy Backend Lên Render

Tạo Web Service mới trên Render và kết nối với repository GitHub của project.

Cấu hình service:

```text
Root Directory: server
Build Command: npm install && npm run build
Start Command: npm run start
```

Render sẽ cấp một domain backend dạng:

```text
https://your-backend.onrender.com
```

Trong phần Environment Variables của Render, thêm các biến:

```env
CLIENT_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app,https://*.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

VNPAY_TMN_CODE=YOUR_TMN_CODE
VNPAY_HASH_SECRET=YOUR_HASH_SECRET
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://your-backend.onrender.com/api/payments/vnpay/return
VNPAY_IPN_URL=https://your-backend.onrender.com/api/payments/vnpay/ipn
```

Không cần cấu hình `PORT` thủ công vì Render tự cấp port qua biến môi trường `PORT`.

Sau khi deploy xong, kiểm tra backend bằng URL:

```text
https://your-backend.onrender.com/health
```

Nếu trả về `{ "ok": true }` nghĩa là backend đã chạy.

### 2. Deploy Frontend Lên Vercel

Tạo project mới trên Vercel và kết nối với repository GitHub.

Cấu hình project:

```text
Root Directory: client
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Trong phần Environment Variables của Vercel, thêm:

```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

Project đã có file `client/vercel.json` để hỗ trợ refresh hoặc truy cập trực tiếp các route frontend:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Sau khi deploy, Vercel sẽ cấp domain frontend dạng:

```text
https://your-frontend.vercel.app
```

### 3. Cập Nhật Lại URL Sau Khi Có Domain Thật

Sau khi có domain thật từ Vercel và Render, cần kiểm tra lại 3 biến quan trọng:

Trên Vercel:

```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

Trên Render:

```env
CLIENT_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app,https://*.vercel.app
VNPAY_RETURN_URL=https://your-backend.onrender.com/api/payments/vnpay/return
VNPAY_IPN_URL=https://your-backend.onrender.com/api/payments/vnpay/ipn
```

Nếu đổi domain hoặc dùng custom domain, cần cập nhật lại các biến trên rồi redeploy frontend/backend.

### 4. Kiểm Tra Sau Khi Deploy

Kiểm tra backend:

```text
https://your-backend.onrender.com/health
https://your-backend.onrender.com/api/payments/methods
```

Kiểm tra frontend:

```text
https://your-frontend.vercel.app
```

Kiểm tra luồng thanh toán:

1. Mở frontend trên Vercel.
2. Chọn VNPay và bấm thanh toán.
3. Hệ thống chuyển sang trang VNPay sandbox.
4. Sau khi thanh toán, VNPay redirect về backend Render.
5. Backend xác thực kết quả và chuyển người dùng về frontend Vercel.

Nếu frontend không gọi được backend, thường là do `VITE_API_BASE_URL` sai hoặc backend chưa cho phép domain frontend trong `CORS_ORIGINS`.

Nếu thanh toán xong nhưng không quay về được, thường là do `VNPAY_RETURN_URL` vẫn đang để `localhost` hoặc sai domain backend Render.

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
