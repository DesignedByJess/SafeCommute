"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middleware/authenticate");
const validate_1 = require("../middleware/validate");
const response_1 = require("../utils/response");
const trips_service_1 = require("../services/trips.service");
const trip_schema_1 = require("../middleware/validate/trip.schema");
const rate_limit_1 = require("../middleware/rate-limit");
const sanitize_1 = require("../utils/sanitize");
const router = (0, express_1.Router)();
const tripService = new trips_service_1.TripService();
router.use(authenticate_1.authenticate);
router.post('/', rate_limit_1.tripCreationLimiter, (0, validate_1.validate)(trip_schema_1.createTripSchema), async (req, res, next) => {
    try {
        const trip = await tripService.createTrip(req.user.id, req.body);
        (0, response_1.sendCreated)(res, {
            id: trip.id,
            share_token: trip.share_token,
            origin_lat: trip.origin_lat,
            origin_lng: trip.origin_lng,
            origin_address: trip.origin_address,
            destination_lat: trip.destination_lat,
            destination_lng: trip.destination_lng,
            destination_address: trip.destination_address,
            vehicle_plate: (0, sanitize_1.maskPlate)(req.body.vehicle_plate),
            contact_name: trip.contact_name,
            status: trip.status,
            started_at: trip.started_at,
            expires_at: trip.expires_at,
        });
    }
    catch (err) {
        next(err);
    }
});
router.get('/', async (req, res, next) => {
    try {
        const trips = await tripService.listTrips(req.user.id);
        const sanitized = trips.map((t) => ({
            id: t.id,
            destination_address: t.destination_address,
            status: t.status,
            contact_name: t.contact_name,
            started_at: t.started_at,
            ended_at: t.ended_at,
            expires_at: t.expires_at,
        }));
        (0, response_1.sendSuccess)(res, sanitized);
    }
    catch (err) {
        next(err);
    }
});
router.get('/active', async (req, res, next) => {
    try {
        const trip = await tripService.getActiveTrip(req.user.id);
        if (!trip) {
            (0, response_1.sendSuccess)(res, null);
            return;
        }
        (0, response_1.sendSuccess)(res, {
            id: trip.id, share_token: trip.share_token,
            destination_address: trip.destination_address,
            contact_name: trip.contact_name,
            started_at: trip.started_at, expires_at: trip.expires_at,
        });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const { trip, latestLocation } = await tripService.getTrip(req.user.id, req.params.id);
        (0, response_1.sendSuccess)(res, {
            id: trip.id, share_token: trip.share_token,
            origin_lat: trip.origin_lat, origin_lng: trip.origin_lng,
            origin_address: trip.origin_address,
            destination_lat: trip.destination_lat, destination_lng: trip.destination_lng,
            destination_address: trip.destination_address,
            contact_name: trip.contact_name, safety_notes: trip.safety_notes,
            status: trip.status, started_at: trip.started_at,
            ended_at: trip.ended_at, expires_at: trip.expires_at,
            latest_location: latestLocation ? { lat: latestLocation.lat, lng: latestLocation.lng } : null,
        });
    }
    catch (err) {
        next(err);
    }
});
router.patch('/:id/end', (0, validate_1.validate)(trip_schema_1.endTripSchema), async (req, res, next) => {
    try {
        const trip = await tripService.endTrip(req.user.id, req.params.id);
        (0, response_1.sendSuccess)(res, { id: trip.id, status: 'completed' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
