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
class TripService {
    notificationService = new notification_service_1.NotificationService();
    async createTrip(userId, input) {
        const shareToken = crypto_1.default.randomBytes(16).toString('hex');
        const { encryptedPlate, encryptedDataKey } = encryption_service_1.EncryptionService.encryptPlate(input.vehicle_plate);
        const contactPhoneEncrypted = encryption_service_1.EncryptionService.encryptPhone(input.contact_phone);
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
        const shareLinkExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
        const trip = await models_1.Trip.create({
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
        await (0, audit_service_1.auditLog)(userId, 'trip_created', { tripId: trip.id });
        await this.notificationService.sendTripStarted({
            contactName: input.contact_name,
            contactPhone: input.contact_phone,
            shareToken,
            userName: userId,
        });
        return trip;
    }
    async listTrips(userId) {
        return models_1.Trip.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit: 50,
        });
    }
    async getActiveTrip(userId) {
        return models_1.Trip.findOne({
            where: { user_id: userId, status: 'active' },
        });
    }
    async getTrip(userId, tripId) {
        const trip = await models_1.Trip.findOne({ where: { id: tripId, user_id: userId } });
        if (!trip)
            throw new errors_1.AppError('Trip not found', 404, 'NOT_FOUND');
        const latestLocation = await models_1.TripLocation.findOne({
            where: { trip_id: trip.id },
            order: [['recorded_at', 'DESC']],
        });
        return { trip, latestLocation };
    }
    async endTrip(userId, tripId) {
        const trip = await models_1.Trip.findOne({ where: { id: tripId, user_id: userId, status: 'active' } });
        if (!trip)
            throw new errors_1.AppError('Active trip not found', 404, 'NOT_FOUND');
        trip.status = 'completed';
        trip.ended_at = new Date();
        await trip.save();
        await models_1.TripLocation.destroy({ where: { trip_id: trip.id } });
        await (0, audit_service_1.auditLog)(userId, 'trip_ended', { tripId: trip.id });
        return trip;
    }
}
exports.TripService = TripService;
