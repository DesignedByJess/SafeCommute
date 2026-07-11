import { Trip, EmergencyAlert } from '../models';
import { auditLog } from './audit.service';
import { EncryptionService } from './encryption.service';
import { AppError } from '../utils/errors';
import { NotificationService } from './notifications/notification.service';

export class EmergencyService {
  private notificationService = new NotificationService();

  async triggerEmergency(
    userId: string,
    tripId: string,
    input: { lat: number; lng: number; accuracy?: number },
    meta: { ip: string; userAgent: string },
  ) {
    const trip = await Trip.findOne({ where: { id: tripId, user_id: userId } });
    if (!trip) throw new AppError('Trip not found', 404, 'NOT_FOUND');
    if (trip.status === 'completed') {
      throw new AppError('Cannot trigger emergency on a completed trip', 400, 'TRIP_COMPLETED');
    }

    const existingActiveAlert = await EmergencyAlert.findOne({
      where: { trip_id: trip.id, retracted_at: null },
    });
    if (existingActiveAlert) {
      throw new AppError('An active emergency alert already exists for this trip', 409, 'ALERT_EXISTS');
    }

    const alert = await EmergencyAlert.create({
      trip_id: trip.id,
      lat: input.lat,
      lng: input.lng,
      accuracy: input.accuracy || null,
      ip_address: meta.ip || null,
      user_agent: meta.userAgent || null,
      verified: false,
    });

    trip.status = 'emergency';
    await trip.save();

    await auditLog(userId, 'emergency_triggered', {
      tripId: trip.id,
      alertId: alert.id,
      lat: input.lat,
      lng: input.lng,
    });

    // Notifications are best-effort — alert is already created
    try {
      const contactPhone = EncryptionService.decryptPhone(trip.contact_phone_encrypted);
      await this.notificationService.sendEmergencyAlert({
        contactName: trip.contact_name,
        contactPhone,
        shareToken: trip.share_token,
        lat: input.lat,
        lng: input.lng,
      });
    } catch {
      /* notification delivery failure doesn't roll back the emergency alert */
    }

    return alert;
  }

  async retractAlert(userId: string, alertId: string, reason?: string) {
    const alert = await EmergencyAlert.findOne({
      where: { id: alertId, retracted_at: null },
      include: [{ model: Trip, as: 'trip', where: { user_id: userId } }],
    });

    if (!alert) throw new AppError('Active emergency alert not found', 404, 'NOT_FOUND');

    alert.retracted_at = new Date();
    alert.retraction_reason = reason || null;
    await alert.save();

    const trip = (alert as any).trip as Trip | undefined;
    if (trip && trip.status === 'emergency') {
      await trip.update({ status: 'active' });
    }

    await auditLog(userId, 'emergency_retracted', { alertId: alert.id, tripId: alert.trip_id });

    return alert;
  }

  async listAlerts(userId: string) {
    return EmergencyAlert.findAll({
      include: [{
        model: Trip,
        as: 'trip',
        where: { user_id: userId },
        attributes: ['id', 'destination_address', 'status'],
      }],
      order: [['triggered_at', 'DESC']],
      limit: 50,
    });
  }
}
