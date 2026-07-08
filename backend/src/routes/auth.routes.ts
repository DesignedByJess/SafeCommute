interface SupabaseSignupResponse {
  id: string;
  email: string;
  msg?: string;
  error_description?: string;
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
import { auditLog, logger } from '../services/audit.service';
import { AppError } from '../utils/errors';

const router = Router();

router.post('/signup', signupLimiter, validate(signupSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    let response: Response;
    try {
      response = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        }),
      });
    } catch (fetchErr) {
      logger.error('Supabase unreachable during signup', { error: fetchErr, supabaseUrl: env.SUPABASE_URL });
      return next(new AppError('Authentication service is unavailable. Please ensure Supabase is running and try again.', 503, 'AUTH_SERVICE_UNAVAILABLE'));
    }

    const data = (await response.json()) as SupabaseSignupResponse;

    if (!response.ok) {
      return next(new AppError(data.msg || data.error_description || 'Signup failed', 400, 'SIGNUP_FAILED'));
    }

    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await auditLog(data.id, 'signup', { email, name }, ipAddress, userAgent);

    let loginResponse: Response;
    try {
      loginResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (fetchErr) {
      logger.error('Supabase unreachable during auto-login after signup', { error: fetchErr });
      return next(new AppError('Account created but could not sign in automatically. Please try logging in.', 200, 'SIGNUP_NO_SESSION'));
    }

    const loginData = (await loginResponse.json()) as SupabaseLoginResponse;

    if (!loginResponse.ok) {
      return next(new AppError('Account created but could not sign in automatically. Please try logging in.', 200, 'SIGNUP_NO_SESSION'));
    }

    res.cookie('sb-access-token', loginData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 * 1000,
    });

    res.cookie('sb-refresh-token', loginData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30 * 1000,
    });

    const user: UserResponse = { id: loginData.user.id, email: loginData.user.email, name };
    sendCreated(res, { user });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new AppError('Email is required', 400, 'VALIDATION_ERROR'));
    }

    let response: Response;
    try {
      response = await fetch(`${env.SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ email }),
      });
    } catch (fetchErr) {
      logger.error('Supabase unreachable during password reset', { error: fetchErr });
      return next(new AppError('Authentication service is unavailable. Please try again later.', 503, 'AUTH_SERVICE_UNAVAILABLE'));
    }

    if (!response.ok) {
      const data = await response.json();
      return next(new AppError(data.msg || 'Failed to send reset email', 400, 'RESET_FAILED'));
    }

    sendSuccess(res, { message: 'Reset link sent' });
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    let response: Response;
    try {
      response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (fetchErr) {
      logger.error('Supabase unreachable during login', { error: fetchErr, supabaseUrl: env.SUPABASE_URL });
      return next(new AppError('Authentication service is unavailable. Please ensure Supabase is running and try again.', 503, 'AUTH_SERVICE_UNAVAILABLE'));
    }

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
