import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { createPaymentRouter } from './controllers/paymentController.js';
import { OrderRepository } from './repositories/orderRepository.js';
import { PaymentRepository } from './repositories/paymentRepository.js';
import { PaymentService } from './services/paymentService.js';
import { VNPayProvider } from './providers/vnpayProvider.js';

export function createApp() {
  const app = express();
  const paymentService = new PaymentService(
    [new VNPayProvider()],
    new OrderRepository(),
    new PaymentRepository()
  );

  app.use(cors({ origin: env.clientUrl }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/payments', createPaymentRouter(paymentService));

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({ message: error.message });
  });

  return app;
}
