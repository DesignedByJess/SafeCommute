import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { sendSuccess } from '../utils/response';

const router = Router();

router.use(authenticate);

router.get('/me', (req: Request, res: Response) => {
  sendSuccess(res, { user: req.user });
});

export default router;
