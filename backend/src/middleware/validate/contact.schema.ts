import { z } from 'zod';

export const sendOtpSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().regex(/^\+234[0-9]{10}$/, 'Must be a valid Nigerian phone number (+234XXXXXXXXXX)'),
  relationship: z.string().max(20).optional(),
});

export const verifyOtpSchema = z.object({
  token: z.string().length(64),
  otp: z.string().length(6),
});

export const resendOtpSchema = z.object({
  token: z.string().length(64),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
