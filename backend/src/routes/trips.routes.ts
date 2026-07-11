import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { sendSuccess, sendCreated } from '../utils/response';
import { TripService } from '../services/trips.service';
import { createTripSchema, endTripSchema } from '../middleware/validate/trip.schema';
import { tripCreationLimiter } from '../middleware/rate-limit';
import { NotFoundError } from '../utils/errors';
import { maskPlate } from '../utils/sanitize';
import { EncryptionService } from '../services/encryption.service';

const router = Router();
const tripService = new TripService();

router.use(authenticate);

router.post('/', tripCreationLimiter, validate(createTripSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await tripService.createTrip(req.user!.id, req.body);
    sendCreated(res, {
      id: trip.id,
      share_token: trip.share_token,
      origin_lat: trip.origin_lat,
      origin_lng: trip.origin_lng,
      origin_address: trip.origin_address,
      destination_lat: trip.destination_lat,
      destination_lng: trip.destination_lng,
      destination_address: trip.destination_address,
      vehicle_plate: maskPlate(req.body.vehicle_plate),
      contact_name: trip.contact_name,
      status: trip.status,
      started_at: trip.started_at,
      expires_at: trip.expires_at,
    });
  } catch (err) { next(err); }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trips = await tripService.listTrips(req.user!.id);
    const sanitized = trips.map((t) => ({
      id: t.id,
      destination_address: t.destination_address,
      status: t.status,
      contact_name: t.contact_name,
      started_at: t.started_at,
      ended_at: t.ended_at,
      expires_at: t.expires_at,
    }));
    sendSuccess(res, sanitized);
  } catch (err) { next(err); }
});

router.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await tripService.getActiveTrip(req.user!.id);
    if (!trip) { sendSuccess(res, null); return; }
    sendSuccess(res, {
      id: trip.id, share_token: trip.share_token,
      destination_address: trip.destination_address,
      contact_name: trip.contact_name,
      started_at: trip.started_at, expires_at: trip.expires_at,
    });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { trip, latestLocation } = await tripService.getTrip(req.user!.id, req.params.id);
    let vehiclePlate: string | null = null;
    if (trip.vehicle_plate_encrypted && trip.vehicle_plate_data_key_encrypted) {
      try {
        const decrypted = EncryptionService.decryptPlate(
          trip.vehicle_plate_encrypted,
          trip.vehicle_plate_data_key_encrypted,
        );
        vehiclePlate = decrypted;
      } catch {
        /* plate decryption failed — return null */
      }
    }
    sendSuccess(res, {
      id: trip.id, share_token: trip.share_token,
      origin_lat: trip.origin_lat, origin_lng: trip.origin_lng,
      origin_address: trip.origin_address,
      destination_lat: trip.destination_lat, destination_lng: trip.destination_lng,
      destination_address: trip.destination_address,
        vehicle_plate: vehiclePlate ?? undefined,
      contact_name: trip.contact_name, safety_notes: trip.safety_notes,
      status: trip.status, started_at: trip.started_at,
      ended_at: trip.ended_at, expires_at: trip.expires_at,
      latest_location: latestLocation ? { lat: latestLocation.lat, lng: latestLocation.lng } : null,
    });
  } catch (err) { next(err); }
});

router.patch('/:id/end', validate(endTripSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await tripService.endTrip(req.user!.id, req.params.id);
    sendSuccess(res, { id: trip.id, status: 'completed' });
  } catch (err) { next(err); }
});

export default router;
