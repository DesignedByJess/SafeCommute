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
import { loginLimiter, signupLimiter, forgotPasswordLimiter } from '../middleware/rate-limit';
import { sendSuccess, sendCreated } from '../utils/response';
import { env } from '../utils/config';
import { auditLog, logger } from '../services/audit.service';
import { AppError } from '../utils/errors';
import { UserProfile } from '../models/user-profile.model';

const router = Router();

router.post('/signup', signupLimiter, validate(signupSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    let supabaseRes;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      supabaseRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
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
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch (fetchErr) {
      logger.error('Supabase unreachable during signup', { error: fetchErr, supabaseUrl: env.SUPABASE_URL });
      const message = (fetchErr as Error)?.name === 'AbortError'
        ? 'Authentication service timed out. Please try again.'
        : 'Authentication service is unavailable. Please ensure Supabase is running and try again.';
      return next(new AppError(message, 503, 'AUTH_SERVICE_UNAVAILABLE'));
    }

    const data = (await supabaseRes.json()) as SupabaseSignupResponse;

    if (!supabaseRes.ok) {
      console.error('[SIGNUP ERROR] Supabase responded with', supabaseRes.status, JSON.stringify(data));
      logger.error('Supabase signup rejected', { status: supabaseRes.status, body: data });
      return next(new AppError(data.msg || data.error_description || 'Signup failed. Please check your details and try again.', 400, 'SIGNUP_FAILED'));
    }

    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await auditLog(data.id, 'signup', { email, name }, ipAddress, userAgent);

    let loginRes;
    try {
      const loginController = new AbortController();
      const loginTimeout = setTimeout(() => loginController.abort(), 15000);
      loginRes = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ email, password }),
        signal: loginController.signal,
      });
      clearTimeout(loginTimeout);
    } catch (fetchErr) {
      logger.error('Supabase unreachable during auto-login after signup', { error: fetchErr });
      return next(new AppError('Account created but could not sign in automatically. Please try logging in.', 200, 'SIGNUP_NO_SESSION'));
    }

    const loginData = (await loginRes.json()) as SupabaseLoginResponse;

    if (!loginRes.ok) {
      return next(new AppError('Account created but could not sign in automatically. Please try logging in.', 200, 'SIGNUP_NO_SESSION'));
    }

    res.cookie('sb-access-token', loginData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 60 * 60 * 24 * 7 * 1000,
    });

    res.cookie('sb-refresh-token', loginData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 60 * 60 * 24 * 30 * 1000,
    });

    const user: UserResponse = { id: loginData.user.id, email: loginData.user.email, name };
    sendCreated(res, { user });

    // Fire-and-forget: create user profile in background.
    // Uses findOrCreate to avoid overwriting onboarding_complete if user
    // completes onboarding before this fires (race condition fix).
    UserProfile.findOrCreate({
      where: { user_id: loginData.user.id },
      defaults: { user_id: loginData.user.id, onboarding_complete: false },
    }).catch((err) => logger.error('Failed to create user profile after signup', { error: err }));
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new AppError('Email is required', 400, 'VALIDATION_ERROR'));
    }

    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${origin}/reset-password`;

    let resetRes;
    try {
      const resetController = new AbortController();
      const resetTimeout = setTimeout(() => resetController.abort(), 15000);
      resetRes = await fetch(`${env.SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ email, redirect_to: resetUrl }),
        signal: resetController.signal,
      });
      clearTimeout(resetTimeout);
    } catch (fetchErr) {
      logger.error('Supabase unreachable during password reset', { error: fetchErr });
      const message = (fetchErr as Error)?.name === 'AbortError'
        ? 'Authentication service timed out. Please try again.'
        : 'Authentication service is unavailable. Please try again later.';
      return next(new AppError(message, 503, 'AUTH_SERVICE_UNAVAILABLE'));
    }

    if (!resetRes.ok) {
      const data = await resetRes.json() as { msg?: string };
      return next(new AppError(data.msg || 'Failed to send reset email', 400, 'RESET_FAILED'));
    }

    await auditLog(null, 'password_reset_requested', { email }, req.ip || req.socket.remoteAddress || null, req.headers['user-agent'] || null);

    sendSuccess(res, { message: 'Reset link sent' });
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    let loginRes;
    try {
      const loginController = new AbortController();
      const loginTimeout = setTimeout(() => loginController.abort(), 15000);
      loginRes = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ email, password }),
        signal: loginController.signal,
      });
      clearTimeout(loginTimeout);
    } catch (fetchErr) {
      logger.error('Supabase unreachable during login', { error: fetchErr, supabaseUrl: env.SUPABASE_URL });
      const message = (fetchErr as Error)?.name === 'AbortError'
        ? 'Authentication service timed out. Please try again.'
        : 'Authentication service is unavailable. Please ensure Supabase is running and try again.';
      return next(new AppError(message, 503, 'AUTH_SERVICE_UNAVAILABLE'));
    }

    const data = (await loginRes.json()) as SupabaseLoginResponse;

    if (!loginRes.ok) {
      return next(new AppError(data.msg || 'Invalid credentials', 401, 'LOGIN_FAILED'));
    }

    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await auditLog(data.user.id, 'login', { email }, ipAddress, userAgent);

    res.cookie('sb-access-token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 60 * 60 * 24 * 7 * 1000,
    });

    res.cookie('sb-refresh-token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 60 * 60 * 24 * 30 * 1000,
    });

    let onboardingComplete = false;
    const profile = await UserProfile.findByPk(data.user.id);
    if (profile) {
      onboardingComplete = profile.onboarding_complete;
    }

    sendSuccess(res, { user: { id: data.user.id, email: data.user.email, onboarding_complete: onboardingComplete } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let onboardingComplete = false;
    const profile = await UserProfile.findByPk(req.user!.id);
    if (profile) {
      onboardingComplete = profile.onboarding_complete;
    }

    sendSuccess(res, {
      user: {
        ...req.user,
        onboarding_complete: onboardingComplete,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', forgotPasswordLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return next(new AppError('Token and new password are required', 400, 'VALIDATION_ERROR'));
    }
    if (password.length < 8) {
      return next(new AppError('Password must be at least 8 characters', 400, 'VALIDATION_ERROR'));
    }

    let supabaseRes;
    try {
      const pwResetController = new AbortController();
      const pwResetTimeout = setTimeout(() => pwResetController.abort(), 15000);
      supabaseRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
        signal: pwResetController.signal,
      });
      clearTimeout(pwResetTimeout);
    } catch (fetchErr) {
      logger.error('Supabase unreachable during password reset', { error: fetchErr });
      const message = (fetchErr as Error)?.name === 'AbortError'
        ? 'Authentication service timed out. Please try again.'
        : 'Authentication service is unavailable. Please try again later.';
      return next(new AppError(message, 503, 'AUTH_SERVICE_UNAVAILABLE'));
    }

    if (!supabaseRes.ok) {
      const data = await supabaseRes.json() as { msg?: string };
      return next(new AppError(data.msg || 'Failed to reset password. The link may have expired.', 400, 'RESET_FAILED'));
    }

    sendSuccess(res, { message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/complete-onboarding', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await UserProfile.upsert({
      user_id: req.user!.id,
      onboarding_complete: true,
    });

    await auditLog(req.user!.id, 'onboarding_completed', {}, req.ip || req.socket.remoteAddress || null, req.headers['user-agent'] || null);

    sendSuccess(res, { message: 'Onboarding marked as complete' });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await auditLog(req.user!.id, 'logout', {}, ipAddress, userAgent);

    res.clearCookie('sb-access-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path: '/',
    });

    res.clearCookie('sb-refresh-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path: '/',
    });

    res.clearCookie('_csrf', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path: '/',
    });

    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) { next(err); }
});

export default router;
