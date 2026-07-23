import { Router } from 'express';
import { PaymentService } from '../services/paymentService.js';

const DEMO_AMOUNT = 100000;

function toPaymentQuery(query: unknown): Record<string, string | string[] | undefined> {
  const params = query as Record<string, unknown>;

  return Object.entries(params).reduce<Record<string, string | string[] | undefined>>((result, [key, value]) => {
    if (typeof value === 'string') {
      result[key] = value;
    }

    if (Array.isArray(value)) {
      result[key] = value.filter((item): item is string => typeof item === 'string');
    }

    return result;
  }, {});
}

export function createPaymentRouter(paymentService: PaymentService): Router {
  const router = Router();

  router.get('/methods', (_req, res) => {
    res.json({ methods: paymentService.getPaymentMethods() });
  });

  router.post('/create', async (req, res, next) => {
    try {
      const provider = String(req.body.provider ?? '');
      const result = await paymentService.createPayment(provider, DEMO_AMOUNT, req.ip ?? '127.0.0.1');
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:provider/return', async (req, res, next) => {
    try {
      const result = await paymentService.handleReturn(req.params.provider, toPaymentQuery(req.query));
      res.redirect(result.redirectUrl);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:provider/ipn', async (req, res, next) => {
    try {
      const result = await paymentService.handleIpn(req.params.provider, toPaymentQuery(req.query));
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
