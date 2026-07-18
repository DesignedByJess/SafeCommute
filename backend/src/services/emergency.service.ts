import crypto from 'crypto';
import { Trip, EmergencyAlert, PendingEmergencyVerification } from '../models';
import { auditLog, logger } from './audit.service';
import { EncryptionService } from './encryption.service';
import { env } from '../utils/config';
import { AppError } from '../utils/errors';
import { NotificationService } from './notifications/notification.service';
import { InboxService } from './notification.service';

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function devCode(): string {
  return '123456';
}

export class EmergencyService {
  private notificationService = new NotificationService();
  private inboxService = new InboxService();

  async initiateEmergency(
    userId: string,
    tripId: string,
    input: { lat: number; lng: number; accuracy?: number; userName: string; userPhone?: string },
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

    const code = env.NODE_ENV !== 'production' ? devCode() : generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Upsert into DB — survives restarts and works across instances
    await PendingEmergencyVerification.upsert({
      trip_id: tripId,
      code,
      expires_at: expiresAt,
      attempts: 0,
      user_id: userId,
      lat: input.lat,
      lng: input.lng,
      accuracy: input.accuracy,
      user_name: input.userName,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
    });

    if (env.NODE_ENV !== 'production') {
      logger.info(`[DEV] Emergency verification code for trip ${tripId}: ${code}`);
    }

    if (input.userPhone) {
      try {
        const message = `Your SafeCommute emergency verification code is: ${code}. It expires in 5 minutes.`;
        const results = await Promise.allSettled([
          this.notificationService.sendAfricaTalking(input.userPhone, message),
        ]);
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            logger.error(`SMS channel ${i} failed for emergency verification code`, { error: r.reason });
          }
        });
      } catch (err) {
        logger.error('Failed to send emergency verification code', { error: err });
        throw new AppError('Could not send verification code. Please try again.', 500, 'SMS_FAILED');
      }
    }

    return { expires_at: expiresAt.toISOString() };
  }

  async verifyAndTrigger(userId: string, tripId: string, code: string) {
    const pending = await PendingEmergencyVerification.findByPk(tripId);
    if (!pending) throw new AppError('No pending emergency verification. Please start again.', 400, 'NO_PENDING');
    if (pending.user_id !== userId) throw new AppError('Unauthorized', 403, 'FORBIDDEN');

    if (new Date() > pending.expires_at) {
      await pending.destroy();
      throw new AppError('Verification code has expired. Please start again.', 400, 'CODE_EXPIRED');
    }

    pending.attempts += 1;
    if (pending.code !== code) {
      if (pending.attempts >= 3) {
        await pending.destroy();
        throw new AppError('Too many incorrect attempts. Please start again.', 400, 'TOO_MANY_ATTEMPTS');
      }
      await pending.save();
      const remaining = 3 - pending.attempts;
      throw new AppError(`Incorrect code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`, 400, 'INVALID_CODE');
    }

    // Code verified — remove from DB
    await pending.destroy();

    const trip = await Trip.findOne({ where: { id: tripId, user_id: userId } });
    if (!trip) throw new AppError('Trip not found', 404, 'NOT_FOUND');

    // Create the alert record
    const alert = await EmergencyAlert.create({
      trip_id: trip.id,
      lat: pending.lat,
      lng: pending.lng,
      accuracy: pending.accuracy || null,
      ip_address: pending.ip_address || null,
      user_agent: pending.user_agent || null,
      verified: true,
    });

    trip.status = 'emergency';
    await trip.save();

    await auditLog(userId, 'emergency_triggered', {
      tripId: trip.id,
      alertId: alert.id,
      lat: pending.lat,
      lng: pending.lng,
      ip: pending.ip_address,
      userAgent: pending.user_agent,
      accuracy: pending.accuracy,
    });

    // In-app notification — fire-and-forget
    this.inboxService.notifyEmergencyTriggered(userId, pending.user_name, alert.id);

    // Send alert to contact
    const timeStr = new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const contactMessage = `🚨 EMERGENCY: ${pending.user_name} needs help! Last location: https://maps.google.com/?q=${pending.lat},${pending.lng}. Alert sent at ${timeStr}. — SafeCommute`;

    try {
      const contactPhone = EncryptionService.decryptPhone(trip.contact_phone_encrypted);
      await this.notificationService.sendAfricaTalking(contactPhone, contactMessage);
    } catch {
      logger.error('Failed to send emergency alert SMS to contact');
    }

    return { id: alert.id, trip_id: alert.trip_id, triggered_at: alert.triggered_at };
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

    const trip = (alert as { trip?: Trip }).trip;
    if (trip && trip.status === 'emergency') {
      await trip.update({ status: 'active' });
    }

    await auditLog(userId, 'emergency_retracted', { alertId: alert.id, tripId: alert.trip_id, reason });

    // In-app notification — fire-and-forget
    this.inboxService.notifyEmergencyRetracted(userId, alert.id);

    // Send retraction SMS to contact
    const timeStr = new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const retractMessage = `${trip ? 'A user' : 'A user'}'s emergency alert has been retracted — they are safe. (${timeStr}) — SafeCommute`;

    try {
      if (trip && trip.contact_phone_encrypted) {
        const contactPhone = EncryptionService.decryptPhone(trip.contact_phone_encrypted);
        await this.notificationService.sendAfricaTalking(contactPhone, retractMessage);
      }
    } catch {
      logger.error('Failed to send retraction SMS to contact');
    }

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
