import crypto from 'crypto';
import { Contact } from '../models/contact.model';
import { EncryptionService } from './encryption.service';
import { auditLog, logger } from './audit.service';
import { AppError } from '../utils/errors';
import { env } from '../utils/config';
import { NotificationService } from './notifications/notification.service';

const notificationService = new NotificationService();

export class ContactService {
  async listContacts(userId: string) {
    return Contact.findAll({
      where: { user_id: userId, deleted_at: null },
      attributes: { exclude: ['otp_code', 'otp_expires_at'] },
      order: [['created_at', 'DESC']],
    });
  }

  async addContact(userId: string, input: { name: string; phone: string; relationship?: string }) {
    const encrypted = EncryptionService.encryptPhone(input.phone);
    const hash = EncryptionService.hashPhone(input.phone);

    const existing = await Contact.findOne({
      where: { phone_number_hash: hash, user_id: userId, deleted_at: null },
    });

    if (existing) {
      throw new AppError('This contact already exists', 409, 'CONTACT_EXISTS');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // In development, include OTP in response for easy testing.
    // Real SMS delivery is always attempted via notificationService above.
    if (env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${input.phone}: ${otp}`);
    }

    const contact = await Contact.create({
      user_id: userId,
      name: input.name,
      phone_number_encrypted: encrypted,
      phone_number_hash: hash,
      relationship: input.relationship || null,
      verified: false,
      otp_code: otp,
      otp_expires_at: otpExpiresAt,
    });

    await auditLog(userId, 'contact_added', { contactId: contact.id });

    // Send OTP via SMS in all environments
    const otpMessage = `Your SafeCommute verification code is ${otp}. It expires in 10 minutes.`;
    notificationService.sendAfricaTalking(input.phone, otpMessage).catch((err) => {
      logger.error('Failed to send OTP SMS', { error: err, phone: input.phone });
    });

    return {
      ...contact.toJSON(),
      ...(env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    };
  }

  async verifyOtp(userId: string, contactId: string, otp: string) {
    const contact = await Contact.findOne({
      where: { id: contactId, user_id: userId, deleted_at: null },
    });

    if (!contact) throw new AppError('Contact not found', 404, 'NOT_FOUND');
    if (contact.verified) throw new AppError('Contact is already verified', 400, 'ALREADY_VERIFIED');

    if (contact.otp_code !== otp) {
      throw new AppError('Invalid OTP code', 400, 'INVALID_OTP');
    }

    if (contact.otp_expires_at && new Date() > contact.otp_expires_at) {
      throw new AppError('OTP has expired', 400, 'OTP_EXPIRED');
    }

    contact.verified = true;
    contact.otp_code = null;
    contact.otp_expires_at = null;
    await contact.save();

    await auditLog(userId, 'otp_verified', { contactId: contact.id });

    return { id: contact.id, verified: true };
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
