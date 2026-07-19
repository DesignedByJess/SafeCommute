import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { playgroundRenderSchema } from '../middleware/validate/playground.schema';
import { sendSuccess } from '../utils/response';
import { renderWithVite } from '../services/playground/vite-renderer';
import { generateCode } from '../services/playground/code-generator';
import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/errors';

const router = Router();

const playgroundLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, error: 'Too many playground requests, try again later', code: 'RATE_LIMITED' },
});

router.use(authenticate);
router.use(playgroundLimiter);

router.post('/code', validate(playgroundRenderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { config } = req.body;
    const { jsx, css } = generateCode(config);
    sendSuccess(res, { jsx, css });
  } catch (err) {
    next(err);
  }
});

router.post('/render', validate(playgroundRenderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { config } = req.body;

    const result = await renderWithVite(config);

    sendSuccess(res, {
      js: result.js,
      css: result.css,
      html: result.html,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Compilation timed out') {
      return next(new AppError('Compilation timed out', 408, 'COMPILATION_TIMEOUT'));
    }
    next(err);
  }
});

export default router;
