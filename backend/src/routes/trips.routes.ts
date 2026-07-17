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
    const tripResult = await tripService.createTrip(req.user!.id, req.user!.name || req.user!.id, req.body);
    sendCreated(res, {
      id: tripResult.id,
      share_token: tripResult.share_token,
      origin_lat: tripResult.origin_lat,
      origin_lng: tripResult.origin_lng,
      origin_address: tripResult.origin_address,
      destination_lat: tripResult.destination_lat,
      destination_lng: tripResult.destination_lng,
      destination_address: tripResult.destination_address,
      vehicle_plate: maskPlate(req.body.vehicle_plate),
      contact_name: tripResult.contact_name,
      contact_phone: (tripResult as any).rawContactPhone || null,
      status: tripResult.status,
      started_at: tripResult.started_at,
      expires_at: tripResult.expires_at,
      hmac_key: (tripResult as any).hmacKey || null,
    });
  } catch (err) { next(err); }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trips = await tripService.listTrips(req.user!.id);
    const sanitized = trips.map((t) => ({
      id: t.id,
      origin_address: t.origin_address,
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
    let contactPhone: string | null = null;
    if (trip.vehicle_plate_encrypted && trip.vehicle_plate_data_key_encrypted) {
      try {
        vehiclePlate = EncryptionService.decryptPlate(
          trip.vehicle_plate_encrypted,
          trip.vehicle_plate_data_key_encrypted,
        );
      } catch { /* plate decryption failed */ }
    }
    if (trip.contact_phone_encrypted) {
      try {
        contactPhone = EncryptionService.decryptPhone(trip.contact_phone_encrypted);
      } catch { /* phone decryption failed */ }
    }
    sendSuccess(res, {
      id: trip.id, share_token: trip.share_token,
      origin_lat: trip.origin_lat, origin_lng: trip.origin_lng,
      origin_address: trip.origin_address,
      destination_lat: trip.destination_lat, destination_lng: trip.destination_lng,
      destination_address: trip.destination_address,
      vehicle_plate: vehiclePlate ?? undefined,
      contact_name: trip.contact_name,
      contact_phone: contactPhone ?? undefined,
      safety_notes: trip.safety_notes,
      status: trip.status, started_at: trip.started_at,
      ended_at: trip.ended_at, expires_at: trip.expires_at,
      latest_location: latestLocation ? { lat: latestLocation.lat, lng: latestLocation.lng } : null,
    });
  } catch (err) { next(err); }
});

router.patch('/:id/end', validate(endTripSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await tripService.endTrip(req.user!.id, req.params.id, {
      userName: req.body.userName,
      destination: req.body.destination,
    });
    sendSuccess(res, { id: trip.id, status: 'completed' });
  } catch (err) { next(err); }
});

router.get('/:id/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { trip, latestLocation } = await tripService.getTrip(req.user!.id, req.params.id);
    let vehiclePlate: string | null = null;
    let contactPhone: string | null = null;
    if (trip.vehicle_plate_encrypted && trip.vehicle_plate_data_key_encrypted) {
      try {
        vehiclePlate = EncryptionService.decryptPlate(
          trip.vehicle_plate_encrypted,
          trip.vehicle_plate_data_key_encrypted,
        );
      } catch { /* plate decryption failed */ }
    }
    if (trip.contact_phone_encrypted) {
      try {
        contactPhone = EncryptionService.decryptPhone(trip.contact_phone_encrypted);
      } catch { /* phone decryption failed */ }
    }
    sendSuccess(res, {
      exported_at: new Date().toISOString(),
      trip: {
        id: trip.id,
        share_token: trip.share_token,
        destination_address: trip.destination_address,
        origin_address: trip.origin_address,
        vehicle_plate: vehiclePlate,
        contact_name: trip.contact_name,
        contact_phone: contactPhone,
        safety_notes: trip.safety_notes,
        status: trip.status,
        started_at: trip.started_at,
        ended_at: trip.ended_at,
        expires_at: trip.expires_at,
        origin: trip.origin_lat && trip.origin_lng
          ? { lat: trip.origin_lat, lng: trip.origin_lng }
          : null,
        destination: trip.destination_lat && trip.destination_lng
          ? { lat: trip.destination_lat, lng: trip.destination_lng }
          : null,
        latest_location: latestLocation
          ? { lat: latestLocation.lat, lng: latestLocation.lng }
          : null,
      },
    });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await tripService.deleteTrip(req.user!.id, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
