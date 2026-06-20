"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyService = void 0;
const models_1 = require("../models");
const audit_service_1 = require("./audit.service");
const errors_1 = require("../utils/errors");
const notification_service_1 = require("./notifications/notification.service");
class EmergencyService {
    notificationService = new notification_service_1.NotificationService();
    async triggerEmergency(userId, tripId, input, meta) {
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
        const alert = await models_1.EmergencyAlert.create({
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
        await (0, audit_service_1.auditLog)(userId, 'emergency_triggered', {
            tripId: trip.id,
            alertId: alert.id,
            lat: input.lat,
            lng: input.lng,
        });
        await this.notificationService.sendEmergencyAlert({
            contactName: trip.contact_name,
            contactPhone: trip.contact_phone_encrypted,
            shareToken: trip.share_token,
            lat: input.lat,
            lng: input.lng,
        });
        return alert;
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
        await (0, audit_service_1.auditLog)(userId, 'emergency_retracted', { alertId: alert.id, tripId: alert.trip_id });
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
