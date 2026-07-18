import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { sendSuccess, sendNoContent } from '../utils/response';
import { InboxService } from '../services/notification.service';
import { AppError } from '../utils/errors';
import { z } from 'zod';

const router = Router();
const inboxService = new InboxService();

router.get('/unread-count', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await inboxService.getUnreadCount(req.user!.id);
    sendSuccess(res, { count });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await inboxService.list(req.user!.id);
    sendSuccess(res, { notifications });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await inboxService.markAllRead(req.user!.id);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id || !z.string().uuid().safeParse(id).success) {
      throw new AppError('Invalid notification ID', 400, 'VALIDATION_ERROR');
    }

    await inboxService.markRead(req.user!.id, id);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
});

export default router;
