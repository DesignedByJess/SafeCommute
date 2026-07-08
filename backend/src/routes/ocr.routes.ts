import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { sendSuccess } from '../utils/response';
import { detectLicensePlate } from '../services/ocr.service';
import { AppError } from '../utils/errors';

const router = Router();

router.use(authenticate);

router.post('/scan-plate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return next(new AppError('Image data is required', 400, 'MISSING_IMAGE'));
    }

    const result = await detectLicensePlate(image);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
