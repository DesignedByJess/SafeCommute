"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const contact_model_1 = require("../models/contact.model");
const encryption_service_1 = require("./encryption.service");
const audit_service_1 = require("./audit.service");
const errors_1 = require("../utils/errors");
class ContactService {
    async listContacts(userId) {
        return contact_model_1.Contact.findAll({
            where: { user_id: userId, deleted_at: null },
            attributes: { exclude: ['otp_code', 'otp_expires_at'] },
            order: [['created_at', 'DESC']],
        });
    }
    async addContact(userId, input) {
        const encrypted = encryption_service_1.EncryptionService.encryptPhone(input.phone);
        const hash = encryption_service_1.EncryptionService.hashPhone(input.phone);
        const existing = await contact_model_1.Contact.findOne({
            where: { phone_number_hash: hash, user_id: userId, deleted_at: null },
        });
        if (existing) {
            throw new errors_1.AppError('This contact already exists', 409, 'CONTACT_EXISTS');
        }
        const otp = crypto_1.default.randomInt(100000, 999999).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const contact = await contact_model_1.Contact.create({
            user_id: userId,
            name: input.name,
            phone_number_encrypted: encrypted,
            phone_number_hash: hash,
            relationship: input.relationship || null,
            verified: false,
            otp_code: otp,
            otp_expires_at: otpExpiresAt,
        });
        await (0, audit_service_1.auditLog)(userId, 'contact_added', { contactId: contact.id });
        return contact;
    }
    async verifyOtp(userId, contactId, otp) {
        const contact = await contact_model_1.Contact.findOne({
            where: { id: contactId, user_id: userId, deleted_at: null },
        });
        if (!contact)
            throw new errors_1.AppError('Contact not found', 404, 'NOT_FOUND');
        if (contact.verified)
            throw new errors_1.AppError('Contact is already verified', 400, 'ALREADY_VERIFIED');
        if (contact.otp_code !== otp) {
            throw new errors_1.AppError('Invalid OTP code', 400, 'INVALID_OTP');
        }
        if (contact.otp_expires_at && new Date() > contact.otp_expires_at) {
            throw new errors_1.AppError('OTP has expired', 400, 'OTP_EXPIRED');
        }
        contact.verified = true;
        contact.otp_code = null;
        contact.otp_expires_at = null;
        await contact.save();
        await (0, audit_service_1.auditLog)(userId, 'otp_verified', { contactId: contact.id });
        return { id: contact.id, verified: true };
    }
    async getContact(userId, contactId) {
        const contact = await contact_model_1.Contact.findOne({
            where: { id: contactId, user_id: userId, deleted_at: null },
            attributes: { exclude: ['otp_code', 'otp_expires_at'] },
        });
        if (!contact)
            throw new errors_1.AppError('Contact not found', 404, 'NOT_FOUND');
        return contact;
    }
    async deleteContact(userId, contactId) {
        const contact = await contact_model_1.Contact.findOne({
            where: { id: contactId, user_id: userId, deleted_at: null },
        });
        if (!contact)
            throw new errors_1.AppError('Contact not found', 404, 'NOT_FOUND');
        await contact.update({ deleted_at: new Date() });
        await (0, audit_service_1.auditLog)(userId, 'contact_deleted', { contactId: contact.id });
    }
}
exports.ContactService = ContactService;
