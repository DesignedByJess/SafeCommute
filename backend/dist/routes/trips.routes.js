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
const encryption_service_1 = require("../services/encryption.service");
const router = (0, express_1.Router)();
const tripService = new trips_service_1.TripService();
router.use(authenticate_1.authenticate);
router.post('/', rate_limit_1.tripCreationLimiter, (0, validate_1.validate)(trip_schema_1.createTripSchema), async (req, res, next) => {
    try {
        const tripResult = await tripService.createTrip(req.user.id, req.user.name || req.user.id, req.body);
        (0, response_1.sendCreated)(res, {
            id: tripResult.id,
            share_token: tripResult.share_token,
            origin_lat: tripResult.origin_lat,
            origin_lng: tripResult.origin_lng,
            origin_address: tripResult.origin_address,
            destination_lat: tripResult.destination_lat,
            destination_lng: tripResult.destination_lng,
            destination_address: tripResult.destination_address,
            vehicle_plate: (0, sanitize_1.maskPlate)(req.body.vehicle_plate),
            contact_name: tripResult.contact_name,
            contact_phone: tripResult.rawContactPhone || null,
            status: tripResult.status,
            started_at: tripResult.started_at,
            expires_at: tripResult.expires_at,
            hmac_key: tripResult.hmacKey || null,
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
            origin_address: t.origin_address,
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
        let vehiclePlate = null;
        let contactPhone = null;
        if (trip.vehicle_plate_encrypted && trip.vehicle_plate_data_key_encrypted) {
            try {
                vehiclePlate = encryption_service_1.EncryptionService.decryptPlate(trip.vehicle_plate_encrypted, trip.vehicle_plate_data_key_encrypted);
            }
            catch { /* plate decryption failed */ }
        }
        if (trip.contact_phone_encrypted) {
            try {
                contactPhone = encryption_service_1.EncryptionService.decryptPhone(trip.contact_phone_encrypted);
            }
            catch { /* phone decryption failed */ }
        }
        (0, response_1.sendSuccess)(res, {
            id: trip.id, share_token: trip.share_token,
            origin_lat: trip.origin_lat, origin_lng: trip.origin_lng,
            origin_address: trip.origin_address,
            destination_lat: trip.destination_lat, destination_lng: trip.destination_lng,
            destination_address: trip.destination_address,
            vehicle_plate: vehiclePlate ?? undefined,
            contact_name: trip.contact_name,
            contact_phone: contactPhone ?? undefined,
            safety_notes: trip.safety_notes,
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
        const trip = await tripService.endTrip(req.user.id, req.params.id, {
            userName: req.body.userName,
            destination: req.body.destination,
        });
        (0, response_1.sendSuccess)(res, { id: trip.id, status: 'completed' });
    }
    catch (err) {
        next(err);
    }
});
router.get('/:id/export', async (req, res, next) => {
    try {
        const { trip, latestLocation } = await tripService.getTrip(req.user.id, req.params.id);
        let vehiclePlate = null;
        let contactPhone = null;
        if (trip.vehicle_plate_encrypted && trip.vehicle_plate_data_key_encrypted) {
            try {
                vehiclePlate = encryption_service_1.EncryptionService.decryptPlate(trip.vehicle_plate_encrypted, trip.vehicle_plate_data_key_encrypted);
            }
            catch { /* plate decryption failed */ }
        }
        if (trip.contact_phone_encrypted) {
            try {
                contactPhone = encryption_service_1.EncryptionService.decryptPhone(trip.contact_phone_encrypted);
            }
            catch { /* phone decryption failed */ }
        }
        (0, response_1.sendSuccess)(res, {
            exported_at: new Date().toISOString(),
            trip: {
                id: trip.id,
                share_token: trip.share_token,
                destination_address: trip.destination_address,
                origin_address: trip.origin_address,
                vehicle_plate: vehiclePlate,
                contact_name: trip.contact_name,
                contact_phone: contactPhone,
                safety_notes: trip.safety_notes,
                status: trip.status,
                started_at: trip.started_at,
                ended_at: trip.ended_at,
                expires_at: trip.expires_at,
                origin: trip.origin_lat && trip.origin_lng
                    ? { lat: trip.origin_lat, lng: trip.origin_lng }
                    : null,
                destination: trip.destination_lat && trip.destination_lng
                    ? { lat: trip.destination_lat, lng: trip.destination_lng }
                    : null,
                latest_location: latestLocation
                    ? { lat: latestLocation.lat, lng: latestLocation.lng }
                    : null,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        await tripService.deleteTrip(req.user.id, req.params.id);
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
