import { z } from 'zod';

export const createTripSchema = z.object({
  origin_lat: z.number().min(-90).max(90),
  origin_lng: z.number().min(-180).max(180),
  origin_address: z.string().max(200).optional(),
  destination_lat: z.number().min(-90).max(90),
  destination_lng: z.number().min(-180).max(180),
  destination_address: z.string().min(1).max(200),
  vehicle_plate: z.string().min(3).max(20),
  contact_id: z.string().uuid().optional(),
  contact_name: z.string().min(1).max(50),
  contact_phone: z.string().regex(/^\+234[0-9]{10}$/, 'Must be a valid Nigerian phone number').optional(),
  safety_notes: z.array(z.string().max(500)).optional(),
});

export const endTripSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  userName: z.string().min(1).max(100),
  destination: z.string().min(1).max(200),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type EndTripInput = z.infer<typeof endTripSchema>;
