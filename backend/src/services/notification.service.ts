import { Notification } from '../models';
import { logger } from './audit.service';
import { AppError, NotFoundError } from '../utils/errors';

export class InboxService {
  async create(userId: string, input: {
    type: string;
    title: string;
    message: string;
    relatedEntityId?: string;
  }): Promise<Notification> {
    return Notification.create({
      user_id: userId,
      type: input.type,
      title: input.title,
      message: input.message,
      read: false,
      related_entity_id: input.relatedEntityId || null,
    });
  }

  async list(userId: string): Promise<Notification[]> {
    return Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.count({
      where: { user_id: userId, read: false },
    });
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const notification = await Notification.findByPk(notificationId);
    if (!notification) throw new NotFoundError('Notification');
    if (notification.user_id !== userId) throw new AppError('Access denied', 403, 'FORBIDDEN');

    notification.read = true;
    await notification.save();
  }

  async markAllRead(userId: string): Promise<void> {
    await Notification.update(
      { read: true },
      { where: { user_id: userId, read: false } }
    );
  }

  async notifyTripCompleted(userId: string, destination: string, tripId: string): Promise<void> {
    await this.create(userId, {
      type: 'trip_completed',
      title: 'Trip completed',
      message: `Your trip to ${destination} ended safely.`,
      relatedEntityId: tripId,
    }).catch((err) => logger.error('Failed to create trip_completed notification', { error: err }));
  }

  async notifyEmergencyTriggered(userId: string, contactName: string, alertId: string): Promise<void> {
    await this.create(userId, {
      type: 'emergency_alert',
      title: 'Emergency alert sent',
      message: `${contactName} has been notified.`,
      relatedEntityId: alertId,
    }).catch((err) => logger.error('Failed to create emergency_alert notification', { error: err }));
  }

  async notifyEmergencyRetracted(userId: string, alertId: string): Promise<void> {
    await this.create(userId, {
      type: 'emergency_retracted',
      title: 'Emergency alert retracted',
      message: 'Your emergency contact has been informed you are safe.',
      relatedEntityId: alertId,
    }).catch((err) => logger.error('Failed to create emergency_retracted notification', { error: err }));
  }

  async notifyNewSession(userId: string, deviceName: string, sessionId: string): Promise<void> {
    await this.create(userId, {
      type: 'new_session',
      title: 'New device signed in',
      message: `${deviceName} signed in to your account.`,
      relatedEntityId: sessionId,
    }).catch((err) => logger.error('Failed to create new_session notification', { error: err }));
  }
}
