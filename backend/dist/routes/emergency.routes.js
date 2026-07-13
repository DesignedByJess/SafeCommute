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
router.post('/:tripId/initiate', rate_limit_1.emergencyLimiter, (0, validate_1.validate)(emergency_schema_1.initiateEmergencySchema), async (req, res, next) => {
    try {
        const result = await emergencyService.initiateEmergency(req.user.id, req.params.tripId, req.body, { ip: req.ip || '', userAgent: req.headers['user-agent'] || '' });
        (0, response_1.sendSuccess)(res, result);
    }
    catch (err) {
        next(err);
    }
});
router.post('/:tripId/verify', (0, validate_1.validate)(emergency_schema_1.verifyEmergencySchema), async (req, res, next) => {
    try {
        const alert = await emergencyService.verifyAndTrigger(req.user.id, req.params.tripId, req.body.code);
        (0, response_1.sendSuccess)(res, alert, 201);
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
