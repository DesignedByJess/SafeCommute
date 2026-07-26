import crypto from 'crypto';
import { Contact } from '../models/contact.model';
import { EncryptionService } from './encryption.service';
import { auditLog, logger } from './audit.service';
import { AppError } from '../utils/errors';
import { env } from '../utils/config';
import { NotificationService } from './notifications/notification.service';

const notificationService = new NotificationService();

interface PendingContact {
  userId: string;
  name: string;
  phone: string;
  encrypted: string;
  hash: string;
  relationship: string | null;
  otp: string;
  expiresAt: number;
}

const PENDING_TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60_000;

export const pendingStore = new Map<string, PendingContact>();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [token, pending] of pendingStore) {
    if (now > pending.expiresAt) {
      pendingStore.delete(token);
      logger.info('[PendingContact] Cleaned up expired entry', { token });
    }
  }
}, CLEANUP_INTERVAL_MS);

process.on('exit', () => clearInterval(cleanupInterval));

export class ContactService {
  async listContacts(userId: string) {
    return Contact.findAll({
      where: { user_id: userId, deleted_at: null, verified: true },
      attributes: { exclude: ['otp_code', 'otp_expires_at'] },
      order: [['created_at', 'DESC']],
    });
  }

  async sendOtp(userId: string, input: { name: string; phone: string; relationship?: string }) {
    const encrypted = EncryptionService.encryptPhone(input.phone);
    const hash = EncryptionService.hashPhone(input.phone);

    const existing = await Contact.findOne({
      where: { phone_number_hash: hash, user_id: userId, deleted_at: null },
    });

    if (existing) {
      throw new AppError('This contact already exists', 409, 'CONTACT_EXISTS');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const token = crypto.randomBytes(32).toString('hex');

    pendingStore.set(token, {
      userId,
      name: input.name,
      phone: input.phone,
      encrypted,
      hash,
      relationship: input.relationship || null,
      otp,
      expiresAt: Date.now() + PENDING_TTL_MS,
    });

    if (env.NODE_ENV !== 'production') {
      logger.info(`[DEV] OTP for new contact (user ${userId}): ${otp}`);
    }

    await auditLog(userId, 'otp_requested', { phone_hash: hash });

    const otpMessage = `Your SafeCommute verification code is ${otp}. It expires in 10 minutes.`;
    try {
      await notificationService.sendAfricaTalking(input.phone, otpMessage);
    } catch (err) {
      logger.error('Failed to send OTP SMS', { error: err, phone: input.phone });
    }

    return {
      verification_token: token,
      ...(env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    };
  }

  async verifyOtp(userId: string, token: string, otp: string) {
    const pending = pendingStore.get(token);
    if (!pending) throw new AppError('Verification not found or expired', 404, 'VERIFICATION_NOT_FOUND');

    if (pending.userId !== userId) {
      throw new AppError('Verification does not belong to this user', 403, 'FORBIDDEN');
    }

    if (Date.now() > pending.expiresAt) {
      pendingStore.delete(token);
      throw new AppError('OTP has expired', 400, 'OTP_EXPIRED');
    }

    if (pending.otp !== otp) {
      throw new AppError('Invalid OTP code', 400, 'INVALID_OTP');
    }

    pendingStore.delete(token);

    const contact = await Contact.create({
      user_id: userId,
      name: pending.name,
      phone_number_encrypted: pending.encrypted,
      phone_number_hash: pending.hash,
      relationship: pending.relationship,
      verified: true,
    });

    await auditLog(userId, 'otp_verified', { contactId: contact.id });
    await auditLog(userId, 'contact_added', { contactId: contact.id });

    return { id: contact.id, verified: true };
  }

  async resendOtp(userId: string, token: string): Promise<{ verification_token: string; devOtp?: string }> {
    const pending = pendingStore.get(token);
    if (!pending) throw new AppError('Verification not found or expired', 404, 'VERIFICATION_NOT_FOUND');

    if (pending.userId !== userId) {
      throw new AppError('Verification does not belong to this user', 403, 'FORBIDDEN');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    pending.otp = otp;
    pending.expiresAt = Date.now() + PENDING_TTL_MS;

    await auditLog(userId, 'otp_requested', { phone_hash: pending.hash });

    const otpMessage = `Your SafeCommute verification code is ${otp}. It expires in 10 minutes.`;
    try {
      await notificationService.sendAfricaTalking(pending.phone, otpMessage);
    } catch (err) {
      logger.error('Failed to resend OTP SMS', { error: err, token });
    }

    if (env.NODE_ENV !== 'production') {
      logger.info(`[DEV] Resent OTP for token ${token}: ${otp}`);
      return { verification_token: token, devOtp: otp };
    }

    return { verification_token: token };
  }

  async getContact(userId: string, contactId: string) {
    const contact = await Contact.findOne({
      where: { id: contactId, user_id: userId, deleted_at: null },
      attributes: { exclude: ['otp_code', 'otp_expires_at'] },
    });

    if (!contact) throw new AppError('Contact not found', 404, 'NOT_FOUND');
    return contact;
  }

  async deleteContact(userId: string, contactId: string) {
    const contact = await Contact.findOne({
      where: { id: contactId, user_id: userId, deleted_at: null },
    });

    if (!contact) throw new AppError('Contact not found', 404, 'NOT_FOUND');

    await contact.update({ deleted_at: new Date() });
    await auditLog(userId, 'contact_deleted', { contactId: contact.id });
  }
}
