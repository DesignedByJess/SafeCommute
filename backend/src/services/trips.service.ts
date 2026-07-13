import crypto from 'crypto';
import { Trip, TripLocation, Contact } from '../models';
import { EncryptionService } from './encryption.service';
import { auditLog, logger } from './audit.service';
import { AppError, NotFoundError } from '../utils/errors';
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
      contact_phone?: string;
      safety_notes?: string[];
    },
  ) {
    let contactPhone = input.contact_phone;

    // If contact_id is provided but no phone, look up the phone from the contact record
    if (!contactPhone && input.contact_id) {
      const contact = await Contact.findOne({
        where: { id: input.contact_id, user_id: userId, deleted_at: null },
      });
      if (contact) {
        contactPhone = EncryptionService.decryptPhone(contact.phone_number_encrypted);
      }
    }

    if (!contactPhone) {
      throw new AppError('contact_phone is required', 400, 'VALIDATION_ERROR');
    }

    const shareToken = crypto.randomBytes(16).toString('hex');
    const { encryptedPlate, encryptedDataKey } = EncryptionService.encryptPlate(input.vehicle_plate);
    const contactPhoneEncrypted = EncryptionService.encryptPhone(contactPhone);
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
      contactPhone,
      shareToken,
      userName: userId,
    });

    return { ...trip.toJSON(), rawContactPhone: contactPhone };
  }

  async listTrips(userId: string) {
    return Trip.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 50,
      raw: true,
    });
  }

  async getActiveTrip(userId: string) {
    const trip = await Trip.findOne({
      where: { user_id: userId, status: 'active' },
      order: [['created_at', 'DESC']],
      raw: true,
    });
    return trip && trip.id ? trip : null;
  }

  async getTrip(userId: string, tripId: string) {
    const trip = await Trip.findOne({
      where: { id: tripId, user_id: userId },
      raw: true,
    });
    if (!trip || !trip.id) throw new AppError('Trip not found', 404, 'NOT_FOUND');

    const latestLocation = await TripLocation.findOne({
      where: { trip_id: trip.id },
      order: [['recorded_at', 'DESC']],
      raw: true,
    });

    return { trip, latestLocation };
  }

  async endTrip(
    userId: string,
    tripId: string,
    notification?: { userName: string; destination: string },
  ) {
    const trip = await Trip.findOne({
      where: { id: tripId, user_id: userId, status: ['active', 'emergency'] },
      raw: true,
    });
    if (!trip) throw new AppError('Active trip not found', 404, 'NOT_FOUND');

    // Use static update — bypasses model instance class field issues entirely
    await Trip.update(
      { status: 'completed', ended_at: new Date() },
      { where: { id: tripId, user_id: userId, status: ['active', 'emergency'] } },
    );

    // Use tripId directly — avoids trip.id class field access issue
    await TripLocation.destroy({ where: { trip_id: tripId } });
    await auditLog(userId, 'trip_ended', { tripId });

    // Send arrival notification — fire-and-forget, never blocks the response
    if (notification && trip.contact_phone_encrypted) {
      try {
        const contactPhone = EncryptionService.decryptPhone(trip.contact_phone_encrypted);
        this.notificationService.sendTripEnded({
          contactName: trip.contact_name,
          contactPhone,
          userName: notification.userName,
          destination: notification.destination,
        }).catch((err) => logger.error('Trip-end notification failed', { error: err }));
      } catch (err) {
        logger.error('Failed to decrypt contact phone for trip-end notification', { error: err });
      }
    }

    return { id: tripId, status: 'completed' };
  }

  async deleteTrip(userId: string, tripId: string) {
    const trip = await Trip.findOne({
      where: { id: tripId, user_id: userId },
      raw: true,
    });
    if (!trip) throw new NotFoundError('Trip not found');

    await Trip.destroy({ where: { id: tripId, user_id: userId } });
    await auditLog(userId, 'trip_deleted', { tripId });
  }
}
