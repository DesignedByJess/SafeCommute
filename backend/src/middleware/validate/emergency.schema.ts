import { z } from 'zod';

export const triggerEmergencySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000).optional(),
});

export const retractEmergencySchema = z.object({
  reason: z.string().max(500).optional(),
});

export type TriggerEmergencyInput = z.infer<typeof triggerEmergencySchema>;
export type RetractEmergencyInput = z.infer<typeof retractEmergencySchema>;
