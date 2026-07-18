import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { createPaymentRouter } from './controllers/paymentController.js';
import { OrderRepository } from './repositories/orderRepository.js';
import { PaymentRepository } from './repositories/paymentRepository.js';
import { PaymentService } from './services/paymentService.js';
import { VNPayProvider } from './providers/vnpayProvider.js';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isAllowedOrigin(origin: string): boolean {
  return env.corsOrigins.some((allowedOrigin) => {
    if (!allowedOrigin.includes('*')) {
      return origin === allowedOrigin;
    }

    const pattern = `^${allowedOrigin.split('*').map(escapeRegex).join('.*')}$`;
    return new RegExp(pattern).test(origin);
  });
}

export function createApp() {
  const app = express();
  const paymentService = new PaymentService(
    [new VNPayProvider()],
    new OrderRepository(),
    new PaymentRepository()
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS origin is not allowed: ${origin}`));
      }
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/payments', createPaymentRouter(paymentService));

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({ message: error.message });
  });

  return app;
}
