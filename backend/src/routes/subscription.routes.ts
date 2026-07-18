import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { sendSuccess } from '../utils/response';
import { Subscription } from '../models';
import { logger } from '../services/audit.service';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subscription = await Subscription.findOne({
      where: { user_id: req.user!.id },
      order: [['created_at', 'DESC']],
    });

    if (!subscription) {
      return sendSuccess(res, {
        plan: 'free',
        status: null,
        expires_at: null,
      });
    }

    const now = new Date();
    const isActive = subscription.status === 'active' && subscription.expires_at > now;

    sendSuccess(res, {
      plan: isActive ? subscription.plan : 'free',
      status: subscription.status,
      expires_at: subscription.expires_at.toISOString(),
      starts_at: subscription.starts_at.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
