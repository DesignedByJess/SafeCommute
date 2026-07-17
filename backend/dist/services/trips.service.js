"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const models_1 = require("../models");
const encryption_service_1 = require("./encryption.service");
const audit_service_1 = require("./audit.service");
const errors_1 = require("../utils/errors");
const notification_service_1 = require("./notifications/notification.service");
const config_1 = require("../utils/config");
class TripService {
    constructor() {
        this.notificationService = new notification_service_1.NotificationService();
    }
    async createTrip(userId, userName, input) {
        let contactPhone = input.contact_phone;
        // If contact_id is provided but no phone, look up the phone from the contact record
        if (!contactPhone && input.contact_id) {
            const contact = await models_1.Contact.findOne({
                where: { id: input.contact_id, user_id: userId, deleted_at: null },
            });
            if (contact) {
                contactPhone = encryption_service_1.EncryptionService.decryptPhone(contact.phone_number_encrypted);
            }
        }
        if (!contactPhone) {
            throw new errors_1.AppError('contact_phone is required', 400, 'VALIDATION_ERROR');
        }
        const shareToken = crypto_1.default.randomBytes(16).toString('hex');
        const { encryptedPlate, encryptedDataKey } = encryption_service_1.EncryptionService.encryptPlate(input.vehicle_plate);
        const contactPhoneEncrypted = encryption_service_1.EncryptionService.encryptPhone(contactPhone);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const displayName = userName || userId;
        const hmacKey = crypto_1.default.createHmac('sha256', config_1.env.HMAC_SECRET)
            .update(shareToken)
            .digest('hex');
        const trip = await models_1.Trip.create({
            user_id: userId,
            share_token: shareToken,
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
        await (0, audit_service_1.auditLog)(userId, 'trip_created', { tripId: trip.id });
        await this.notificationService.sendTripStarted({
            contactName: input.contact_name,
            contactPhone,
            shareToken,
            userName: displayName,
        });
        return { ...trip.toJSON(), rawContactPhone: contactPhone, hmacKey };
    }
    async listTrips(userId) {
        return models_1.Trip.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit: 50,
            raw: true,
        });
    }
    async getActiveTrip(userId) {
        const trip = await models_1.Trip.findOne({
            where: { user_id: userId, status: 'active' },
            order: [['created_at', 'DESC']],
            raw: true,
        });
        return trip && trip.id ? trip : null;
    }
    async getTrip(userId, tripId) {
        const trip = await models_1.Trip.findOne({
            where: { id: tripId, user_id: userId },
            raw: true,
        });
        if (!trip || !trip.id)
            throw new errors_1.AppError('Trip not found', 404, 'NOT_FOUND');
        const latestLocation = await models_1.TripLocation.findOne({
            where: { trip_id: trip.id },
            order: [['recorded_at', 'DESC']],
            raw: true,
        });
        return { trip, latestLocation };
    }
    async endTrip(userId, tripId, notification) {
        const trip = await models_1.Trip.findOne({
            where: { id: tripId, user_id: userId, status: ['active', 'emergency'] },
            raw: true,
        });
        if (!trip)
            throw new errors_1.AppError('Active trip not found', 404, 'NOT_FOUND');
        // Use static update — bypasses model instance class field issues entirely
        await models_1.Trip.update({
            status: 'completed',
            ended_at: new Date(),
            share_link_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
        }, { where: { id: tripId, user_id: userId, status: ['active', 'emergency'] } });
        // Use tripId directly — avoids trip.id class field access issue
        await models_1.TripLocation.destroy({ where: { trip_id: tripId } });
        await (0, audit_service_1.auditLog)(userId, 'trip_ended', { tripId });
        // Send arrival notification — fire-and-forget, never blocks the response
        if (notification && trip.contact_phone_encrypted) {
            try {
                const contactPhone = encryption_service_1.EncryptionService.decryptPhone(trip.contact_phone_encrypted);
                this.notificationService.sendTripEnded({
                    contactName: trip.contact_name,
                    contactPhone,
                    userName: notification.userName,
                    destination: notification.destination,
                }).catch((err) => audit_service_1.logger.error('Trip-end notification failed', { error: err }));
            }
            catch (err) {
                audit_service_1.logger.error('Failed to decrypt contact phone for trip-end notification', { error: err });
            }
        }
        return { id: tripId, status: 'completed' };
    }
    async deleteTrip(userId, tripId) {
        const trip = await models_1.Trip.findOne({
            where: { id: tripId, user_id: userId },
            raw: true,
        });
        if (!trip)
            throw new errors_1.NotFoundError('Trip not found');
        await models_1.Trip.destroy({ where: { id: tripId, user_id: userId } });
        await (0, audit_service_1.auditLog)(userId, 'trip_deleted', { tripId });
    }
}
exports.TripService = TripService;
