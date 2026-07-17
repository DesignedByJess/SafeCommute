import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().regex(/^\+234[0-9]{10}$/, 'Must be a valid Nigerian phone number (+234XXXXXXXXXX)'),
  relationship: z.string().max(20).optional(),
});

export const verifyOtpSchema = z.object({
  otp: z.string().length(6),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
