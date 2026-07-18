import { Router, Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Trip, TripLocation } from '../models';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ShareLinkExpiredError, AppError } from '../utils/errors';
import { shareLinkLimiter } from '../middleware/rate-limit';
import { auditLog } from '../services/audit.service';
import { maskPlate } from '../utils/sanitize';
import { EncryptionService } from '../services/encryption.service';

const router = Router();

router.get('/:share_token', shareLinkLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await Trip.findOne({
      where: { share_token: req.params.share_token },
      attributes: [
        'id', 'share_token', 'destination_address', 'destination_lat', 'destination_lng',
        'contact_name', 'status', 'started_at', 'expires_at', 'share_link_expires_at',
        'share_link_revoked', 'vehicle_plate_encrypted', 'vehicle_plate_data_key_encrypted',
      ],
    });

    if (!trip) throw new NotFoundError('Trip');
    if (trip.share_link_revoked) {
      throw new AppError('This share link has been revoked', 410, 'SHARE_LINK_REVOKED');
    }
    if (trip.share_link_expires_at && new Date() > trip.share_link_expires_at) {
      throw new ShareLinkExpiredError();
    }

    await auditLog(null, 'share_link_accessed', { shareToken: req.params.share_token });

    let maskedPlate = '***';
    try {
      const plate = EncryptionService.decryptPlate(
        trip.vehicle_plate_encrypted,
        trip.vehicle_plate_data_key_encrypted,
      );
      maskedPlate = maskPlate(plate);
    } catch { /* decryption failed — return masked placeholder */ }

    sendSuccess(res, {
      id: trip.id,
      destination_address: trip.destination_address,
      destination_lat: trip.destination_lat,
      destination_lng: trip.destination_lng,
      contact_name: trip.contact_name,
      status: trip.status,
      started_at: trip.started_at,
      expires_at: trip.expires_at,
      vehicle_plate: maskedPlate,
    });
  } catch (err) { next(err); }
});

router.get('/:share_token/locations', shareLinkLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await Trip.findOne({
      where: { share_token: req.params.share_token },
      attributes: ['id', 'share_link_expires_at', 'share_link_revoked', 'status'],
    });

    if (!trip) throw new NotFoundError('Trip');
    if (trip.share_link_revoked) {
      throw new AppError('This share link has been revoked', 410, 'SHARE_LINK_REVOKED');
    }
    if (trip.share_link_expires_at && new Date() > trip.share_link_expires_at) {
      throw new ShareLinkExpiredError();
    }

    const since = req.query.since as string | undefined;
    const where: Record<string, unknown> = { trip_id: trip.id };
    if (since) {
      where.recorded_at = { [Op.gt]: new Date(since) };
    }

    const locations = await TripLocation.findAll({
      where,
      attributes: ['lat', 'lng', 'accuracy', 'recorded_at'],
      order: [['recorded_at', 'ASC']],
    });

    sendSuccess(res, { locations, status: trip.status });
  } catch (err) { next(err); }
});

export default router;
