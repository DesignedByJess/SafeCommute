import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { sendSuccess, sendNoContent } from '../utils/response';
import { SessionService } from '../services/session.service';
import { logger } from '../services/audit.service';
import { auditLog } from '../services/audit.service';
import { AppError } from '../utils/errors';
import { z } from 'zod';

const router = Router();
const sessionService = new SessionService();

const revokeSessionSchema = z.object({
  id: z.string().uuid('Invalid session ID'),
});

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await sessionService.listUserSessions(req.user!.id, '');
    sendSuccess(res, { sessions });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id || !z.string().uuid().safeParse(id).success) {
      throw new AppError('Invalid session ID', 400, 'VALIDATION_ERROR');
    }

    await sessionService.revokeSession(req.user!.id, id);

    await auditLog(
      req.user!.id,
      'session_revoked',
      { sessionId: id },
      req.ip || req.socket.remoteAddress || null,
      req.headers['user-agent'] || null
    );

    sendNoContent(res);
  } catch (err) {
    next(err);
  }
});

export default router;
