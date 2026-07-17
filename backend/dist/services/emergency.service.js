"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const models_1 = require("../models");
const audit_service_1 = require("./audit.service");
const encryption_service_1 = require("./encryption.service");
const config_1 = require("../utils/config");
const errors_1 = require("../utils/errors");
const notification_service_1 = require("./notifications/notification.service");
const pendingMap = new Map();
function generateCode() {
    return crypto_1.default.randomInt(100000, 999999).toString();
}
function devCode() {
    return '123456';
}
class EmergencyService {
    constructor() {
        this.notificationService = new notification_service_1.NotificationService();
    }
    async initiateEmergency(userId, tripId, input, meta) {
        const trip = await models_1.Trip.findOne({ where: { id: tripId, user_id: userId } });
        if (!trip)
            throw new errors_1.AppError('Trip not found', 404, 'NOT_FOUND');
        if (trip.status === 'completed') {
            throw new errors_1.AppError('Cannot trigger emergency on a completed trip', 400, 'TRIP_COMPLETED');
        }
        const existingActiveAlert = await models_1.EmergencyAlert.findOne({
            where: { trip_id: trip.id, retracted_at: null },
        });
        if (existingActiveAlert) {
            throw new errors_1.AppError('An active emergency alert already exists for this trip', 409, 'ALERT_EXISTS');
        }
        const code = config_1.env.NODE_ENV !== 'production' ? devCode() : generateCode();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        pendingMap.set(tripId, {
            code,
            expiresAt,
            attempts: 0,
            userId,
            tripId,
            lat: input.lat,
            lng: input.lng,
            accuracy: input.accuracy,
            userName: input.userName,
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        if (config_1.env.NODE_ENV !== 'production') {
            audit_service_1.logger.info(`[DEV] Emergency verification code for trip ${tripId}: ${code}`);
        }
        if (input.userPhone) {
            try {
                const message = `Your SafeCommute emergency verification code is: ${code}. It expires in 5 minutes.`;
                const results = await Promise.allSettled([
                    this.notificationService.sendAfricaTalking(input.userPhone, message),
                ]);
                results.forEach((r, i) => {
                    if (r.status === 'rejected') {
                        audit_service_1.logger.error(`SMS channel ${i} failed for emergency verification code`, { error: r.reason });
                    }
                });
            }
            catch (err) {
                audit_service_1.logger.error('Failed to send emergency verification code', { error: err });
                throw new errors_1.AppError('Could not send verification code. Please try again.', 500, 'SMS_FAILED');
            }
        }
        return { expires_at: expiresAt.toISOString() };
    }
    async verifyAndTrigger(userId, tripId, code) {
        const pending = pendingMap.get(tripId);
        if (!pending)
            throw new errors_1.AppError('No pending emergency verification. Please start again.', 400, 'NO_PENDING');
        if (pending.userId !== userId)
            throw new errors_1.AppError('Unauthorized', 403, 'FORBIDDEN');
        if (new Date() > pending.expiresAt) {
            pendingMap.delete(tripId);
            throw new errors_1.AppError('Verification code has expired. Please start again.', 400, 'CODE_EXPIRED');
        }
        pending.attempts++;
        if (pending.code !== code) {
            if (pending.attempts >= 3) {
                pendingMap.delete(tripId);
                throw new errors_1.AppError('Too many incorrect attempts. Please start again.', 400, 'TOO_MANY_ATTEMPTS');
            }
            const remaining = 3 - pending.attempts;
            throw new errors_1.AppError(`Incorrect code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`, 400, 'INVALID_CODE');
        }
        // Code verified — remove from pending
        pendingMap.delete(tripId);
        const trip = await models_1.Trip.findOne({ where: { id: tripId, user_id: userId } });
        if (!trip)
            throw new errors_1.AppError('Trip not found', 404, 'NOT_FOUND');
        // Create the alert record
        const alert = await models_1.EmergencyAlert.create({
            trip_id: trip.id,
            lat: pending.lat,
            lng: pending.lng,
            accuracy: pending.accuracy || null,
            ip_address: pending.ip || null,
            user_agent: pending.userAgent || null,
            verified: false,
        });
        trip.status = 'emergency';
        await trip.save();
        await (0, audit_service_1.auditLog)(userId, 'emergency_triggered', {
            tripId: trip.id,
            alertId: alert.id,
            lat: pending.lat,
            lng: pending.lng,
            ip: pending.ip,
            userAgent: pending.userAgent,
            accuracy: pending.accuracy,
        });
        // Send alert to contact
        const timeStr = new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
        const contactMessage = `🚨 EMERGENCY: ${pending.userName} needs help! Last location: https://maps.google.com/?q=${pending.lat},${pending.lng}. Alert sent at ${timeStr}. — SafeCommute`;
        try {
            const contactPhone = encryption_service_1.EncryptionService.decryptPhone(trip.contact_phone_encrypted);
            await this.notificationService.sendAfricaTalking(contactPhone, contactMessage);
        }
        catch {
            audit_service_1.logger.error('Failed to send emergency alert SMS to contact');
        }
        return { id: alert.id, trip_id: alert.trip_id, triggered_at: alert.triggered_at };
    }
    async retractAlert(userId, alertId, reason) {
        const alert = await models_1.EmergencyAlert.findOne({
            where: { id: alertId, retracted_at: null },
            include: [{ model: models_1.Trip, as: 'trip', where: { user_id: userId } }],
        });
        if (!alert)
            throw new errors_1.AppError('Active emergency alert not found', 404, 'NOT_FOUND');
        alert.retracted_at = new Date();
        alert.retraction_reason = reason || null;
        await alert.save();
        const trip = alert.trip;
        if (trip && trip.status === 'emergency') {
            await trip.update({ status: 'active' });
        }
        await (0, audit_service_1.auditLog)(userId, 'emergency_retracted', { alertId: alert.id, tripId: alert.trip_id, reason });
        // Send retraction SMS to contact
        const timeStr = new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
        const retractMessage = `${trip ? 'A user' : 'A user'}'s emergency alert has been retracted — they are safe. (${timeStr}) — SafeCommute`;
        try {
            if (trip && trip.contact_phone_encrypted) {
                const contactPhone = encryption_service_1.EncryptionService.decryptPhone(trip.contact_phone_encrypted);
                await this.notificationService.sendAfricaTalking(contactPhone, retractMessage);
            }
        }
        catch {
            audit_service_1.logger.error('Failed to send retraction SMS to contact');
        }
        return alert;
    }
    async listAlerts(userId) {
        return models_1.EmergencyAlert.findAll({
            include: [{
                    model: models_1.Trip,
                    as: 'trip',
                    where: { user_id: userId },
                    attributes: ['id', 'destination_address', 'status'],
                }],
            order: [['triggered_at', 'DESC']],
            limit: 50,
        });
    }
}
exports.EmergencyService = EmergencyService;
