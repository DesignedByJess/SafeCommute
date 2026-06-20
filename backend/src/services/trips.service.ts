import crypto from 'crypto';
import { Trip, TripLocation } from '../models';
import { EncryptionService } from './encryption.service';
import { auditLog } from './audit.service';
import { AppError } from '../utils/errors';
import { NotificationService } from './notifications/notification.service';

export class TripService {
  private notificationService = new NotificationService();

  async createTrip(
    userId: string,
    input: {
      origin_lat: number;
      origin_lng: number;
      origin_address?: string;
      destination_lat: number;
      destination_lng: number;
      destination_address: string;
      vehicle_plate: string;
      contact_id?: string;
      contact_name: string;
      contact_phone: string;
      safety_notes?: string[];
    },
  ) {
    const shareToken = crypto.randomBytes(16).toString('hex');
    const { encryptedPlate, encryptedDataKey } = EncryptionService.encryptPlate(input.vehicle_plate);
    const contactPhoneEncrypted = EncryptionService.encryptPhone(input.contact_phone);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const shareLinkExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

    const trip = await Trip.create({
      user_id: userId,
      share_token: shareToken,
      share_link_expires_at: shareLinkExpiresAt,
      share_link_revoked: false,
      origin_lat: input.origin_lat,
      origin_lng: input.origin_lng,
      origin_address: input.origin_address || null,
      destination_lat: input.destination_lat,
      destination_lng: input.destination_lng,
      destination_address: input.destination_address,
      vehicle_plate_encrypted: encryptedPlate,
      vehicle_plate_data_key_encrypted: encryptedDataKey,
      contact_id: input.contact_id || null,
      contact_name: input.contact_name,
      contact_phone_encrypted: contactPhoneEncrypted,
      safety_notes: input.safety_notes || null,
      status: 'active',
      expires_at: expiresAt,
    });

    await auditLog(userId, 'trip_created', { tripId: trip.id });

    await this.notificationService.sendTripStarted({
      contactName: input.contact_name,
      contactPhone: input.contact_phone,
      shareToken,
      userName: userId,
    });

    return trip;
  }

  async listTrips(userId: string) {
    return Trip.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
  }

  async getActiveTrip(userId: string) {
    return Trip.findOne({
      where: { user_id: userId, status: 'active' },
    });
  }

  async getTrip(userId: string, tripId: string) {
    const trip = await Trip.findOne({ where: { id: tripId, user_id: userId } });
    if (!trip) throw new AppError('Trip not found', 404, 'NOT_FOUND');

    const latestLocation = await TripLocation.findOne({
      where: { trip_id: trip.id },
      order: [['recorded_at', 'DESC']],
    });

    return { trip, latestLocation };
  }

  async endTrip(userId: string, tripId: string) {
    const trip = await Trip.findOne({ where: { id: tripId, user_id: userId, status: 'active' } });
    if (!trip) throw new AppError('Active trip not found', 404, 'NOT_FOUND');

    trip.status = 'completed';
    trip.ended_at = new Date();
    await trip.save();

    await TripLocation.destroy({ where: { trip_id: trip.id } });
    await auditLog(userId, 'trip_ended', { tripId: trip.id });

    return trip;
  }
}
