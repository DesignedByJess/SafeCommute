import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+234[0-9]{10}$/, 'Phone must be in format +234XXXXXXXXXX').optional(),
});

export const verifyPhoneOtpSchema = z.object({
  otp: z.string().length(6),
});
