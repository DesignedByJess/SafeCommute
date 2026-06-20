"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const validate_1 = require("../middleware/validate");
const response_1 = require("../utils/response");
const emergency_service_1 = require("../services/emergency.service");
const emergency_schema_1 = require("../middleware/validate/emergency.schema");
const rate_limit_1 = require("../middleware/rate-limit");
const router = (0, express_1.Router)();
const emergencyService = new emergency_service_1.EmergencyService();
router.use(authenticate_1.authenticate);
router.post('/:tripId/trigger', rate_limit_1.emergencyLimiter, (0, validate_1.validate)(emergency_schema_1.triggerEmergencySchema), async (req, res, next) => {
    try {
        const alert = await emergencyService.triggerEmergency(req.user.id, req.params.tripId, req.body, { ip: req.ip || '', userAgent: req.headers['user-agent'] || '' });
        (0, response_1.sendSuccess)(res, {
            id: alert.id, trip_id: alert.trip_id,
            lat: alert.lat, lng: alert.lng, triggered_at: alert.triggered_at,
        }, 201);
    }
    catch (err) {
        next(err);
    }
});
router.post('/:alertId/retract', (0, validate_1.validate)(emergency_schema_1.retractEmergencySchema), async (req, res, next) => {
    try {
        const alert = await emergencyService.retractAlert(req.user.id, req.params.alertId, req.body.reason);
        (0, response_1.sendSuccess)(res, { id: alert.id, retracted_at: alert.retracted_at });
    }
    catch (err) {
        next(err);
    }
});
router.get('/', async (req, res, next) => {
    try {
        const alerts = await emergencyService.listAlerts(req.user.id);
        (0, response_1.sendSuccess)(res, alerts);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
