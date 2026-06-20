import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { sendSuccess } from '../utils/response';
import { PaymentService } from '../services/payment.service';
import { initiatePaymentSchema, verifyPaymentSchema } from '../middleware/validate/payment.schema';

const router = Router();
const paymentService = new PaymentService();

router.post('/initiate', authenticate, validate(initiatePaymentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await paymentService.initializePayment(
      req.user!.id, req.user!.email || '', req.body.plan,
    );
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/verify', authenticate, validate(verifyPaymentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await paymentService.verifyPayment(req.body.transaction_id, req.body.tx_ref);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

router.post('/webhook', async (req: Request, res: Response) => {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH || '';
  const signature = req.headers['verif-hash'];

  if (!signature || signature !== secretHash) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    await paymentService.handleWebhook(req.body);
  } catch {
    /* Log webhook processing error but always return 200 */
  }

  res.status(200).json({ success: true, data: { received: true } });
});

export default router;
