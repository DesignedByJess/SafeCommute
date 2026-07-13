import { z } from 'zod';

export const initiateEmergencySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000).optional(),
  userName: z.string().min(1).max(100),
});

export const verifyEmergencySchema = z.object({
  code: z.string().length(6),
});

export const retractEmergencySchema = z.object({
  reason: z.string().max(500).optional(),
});

export type InitiateEmergencyInput = z.infer<typeof initiateEmergencySchema>;
export type VerifyEmergencyInput = z.infer<typeof verifyEmergencySchema>;
export type RetractEmergencyInput = z.infer<typeof retractEmergencySchema>;
