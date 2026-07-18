import rateLimit from 'express-rate-limit';

const defaults = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
};

export const loginLimiter = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many login attempts, try again later', code: 'RATE_LIMITED' },
});

export const otpLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Too many OTP requests, try again later', code: 'RATE_LIMITED' },
});

export const tripCreationLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many trips created, try again later', code: 'RATE_LIMITED' },
});

export const shareLinkLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many share link views, try again later', code: 'RATE_LIMITED' },
});

export const emergencyLimiter = rateLimit({
  ...defaults,
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Emergency alert limit reached (3 per 24 hours)', code: 'RATE_LIMITED' },
});

export const emergencyVerifyLimiter = rateLimit({
  ...defaults,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many verification attempts, try again later', code: 'RATE_LIMITED' },
});

export const signupLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many signup attempts, try again later', code: 'RATE_LIMITED' },
});

export const forgotPasswordLimiter = rateLimit({
  ...defaults,
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Too many reset requests, try again later', code: 'RATE_LIMITED' },
});
