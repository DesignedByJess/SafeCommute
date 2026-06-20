interface SupabaseSignupResponse {
  id: string;
  email: string;
  msg?: string;
}

interface UserResponse {
  id: string;
  email: string;
  name?: string;
}

interface SupabaseLoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
  };
  msg?: string;
}

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { signupSchema } from '../middleware/validate/auth.schema';
import { loginSchema } from '../middleware/validate/auth.schema';
import { loginLimiter, signupLimiter } from '../middleware/rate-limit';
import { sendSuccess, sendCreated } from '../utils/response';
import { env } from '../utils/config';
import { auditLog } from '../services/audit.service';
import { AppError } from '../utils/errors';

const router = Router();

router.post('/signup', signupLimiter, validate(signupSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ email, password, data: { name } }),
    });

    const data = (await response.json()) as SupabaseSignupResponse;

    if (!response.ok) {
      return next(new AppError(data.msg || 'Signup failed', 400, 'SIGNUP_FAILED'));
    }

    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await auditLog(data.id, 'signup', { email, name }, ipAddress, userAgent);

    const user: UserResponse = { id: data.id, email: data.email, name };
    sendCreated(res, { user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json()) as SupabaseLoginResponse;

    if (!response.ok) {
      return next(new AppError(data.msg || 'Invalid credentials', 401, 'LOGIN_FAILED'));
    }

    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await auditLog(data.user.id, 'login', { email }, ipAddress, userAgent);

    res.cookie('sb-access-token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 * 1000,
    });

    res.cookie('sb-refresh-token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30 * 1000,
    });

    sendSuccess(res, { user: { id: data.user.id, email: data.user.email } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, (req: Request, res: Response) => {
  sendSuccess(res, { user: req.user });
});

export default router;
