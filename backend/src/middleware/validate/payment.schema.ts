import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  plan: z.enum(['premium_monthly', 'premium_yearly', 'family_yearly']),
  currency: z.enum(['NGN']).default('NGN'),
});

export const verifyPaymentSchema = z.object({
  transaction_id: z.string().min(1),
  tx_ref: z.string().min(1),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
