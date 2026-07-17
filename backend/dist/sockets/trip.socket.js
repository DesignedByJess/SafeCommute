"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTripSocketHandlers = registerTripSocketHandlers;
const crypto_1 = __importDefault(require("crypto"));
const models_1 = require("../models");
const encryption_service_1 = require("../services/encryption.service");
const audit_service_1 = require("../services/audit.service");
const jwt_1 = require("../utils/jwt");
const config_1 = require("../utils/config");
const locationRateLimit = new Map();
function parseAccessToken(cookieHeader) {
    if (!cookieHeader)
        return null;
    const match = cookieHeader.match(/sb-access-token=([^;]+)/);
    return match ? match[1] : null;
}
function getTripHmacKey(shareToken) {
    return crypto_1.default.createHmac('sha256', config_1.env.HMAC_SECRET)
        .update(shareToken)
        .digest('hex');
}
function registerTripSocketHandlers(io) {
    io.on('connection', async (socket) => {
        audit_service_1.logger.info(`Socket connected: ${socket.id}`);
        const cookieHeader = socket.handshake.headers.cookie;
        const token = parseAccessToken(cookieHeader);
        if (!token) {
            audit_service_1.logger.warn(`Socket ${socket.id} rejected — no auth token in cookie`);
            socket.disconnect();
            return;
        }
        const payload = await (0, jwt_1.verifyJwt)(token);
        if (!payload) {
            audit_service_1.logger.warn(`Socket ${socket.id} rejected — invalid or expired token`);
            socket.disconnect();
            return;
        }
        socket.data.userId = payload.sub;
        socket.data.phone = payload.phone;
        socket.data.email = payload.email;
        socket.on('join:trip', async (tripId) => {
            try {
                const trip = await models_1.Trip.findOne({ where: { id: tripId } });
                if (!trip) {
                    audit_service_1.logger.warn(`Socket ${socket.id} attempted to join non-existent trip ${tripId}`);
                    return;
                }
                const userId = socket.data.userId;
                let isAuthorized = trip.user_id === userId;
                if (!isAuthorized && trip.contact_phone_encrypted && socket.data.phone) {
                    try {
                        const decryptedContactPhone = encryption_service_1.EncryptionService.decryptPhone(trip.contact_phone_encrypted);
                        if (decryptedContactPhone === socket.data.phone) {
                            isAuthorized = true;
                        }
                    }
                    catch (err) {
                        audit_service_1.logger.error('Failed to decrypt contact phone for authorization check', { error: err });
                    }
                }
                if (!isAuthorized) {
                    audit_service_1.logger.warn(`Socket ${socket.id} (user ${userId}) unauthorized to join trip ${tripId}`);
                    socket.disconnect();
                    return;
                }
                socket.data.shareToken = trip.share_token;
                socket.join(`trip:${tripId}`);
                audit_service_1.logger.info(`Socket ${socket.id} joined trip:${tripId}`);
            }
            catch (err) {
                audit_service_1.logger.error(`Error during join:trip for socket ${socket.id}`, { error: err });
            }
        });
        socket.on('leave:trip', (tripId) => {
            socket.leave(`trip:${tripId}`);
            audit_service_1.logger.info(`Socket ${socket.id} left trip:${tripId}`);
        });
        socket.on('location:update', async (data) => {
            const now = Date.now();
            const last = locationRateLimit.get(data.tripId) ?? 0;
            if (now - last < 10000) {
                audit_service_1.logger.warn(`Rate limited location update for trip ${data.tripId} from socket ${socket.id}`);
                return;
            }
            locationRateLimit.set(data.tripId, now);
            if (!data.signature) {
                audit_service_1.logger.warn(`Rejected unsigned location update from socket ${socket.id} — disconnecting`);
                socket.disconnect();
                return;
            }
            try {
                const trip = await models_1.Trip.findOne({
                    where: { id: data.tripId },
                    attributes: ['id', 'share_token'],
                });
                if (!trip) {
                    audit_service_1.logger.warn(`Rejected location update for non-existent trip ${data.tripId}`);
                    return;
                }
                const tripKey = getTripHmacKey(trip.share_token);
                const payload = { tripId: data.tripId, lat: data.lat, lng: data.lng, accuracy: data.accuracy };
                const expectedSig = crypto_1.default.createHmac('sha256', tripKey)
                    .update(JSON.stringify(payload))
                    .digest('hex');
                if (expectedSig.length !== data.signature.length) {
                    audit_service_1.logger.warn(`Rejected location update with invalid signature from socket ${socket.id} — disconnecting`);
                    socket.disconnect();
                    return;
                }
                let sigValid = true;
                for (let i = 0; i < expectedSig.length; i++) {
                    if (expectedSig[i] !== data.signature[i])
                        sigValid = false;
                }
                if (!sigValid) {
                    audit_service_1.logger.warn(`Rejected location update with invalid signature from socket ${socket.id} — disconnecting`);
                    socket.disconnect();
                    return;
                }
            }
            catch (err) {
                audit_service_1.logger.error('Failed to verify location signature', { error: err });
                return;
            }
            try {
                await models_1.TripLocation.create({
                    trip_id: data.tripId,
                    lat: data.lat,
                    lng: data.lng,
                    accuracy: data.accuracy || null,
                    recorded_at: new Date(),
                });
            }
            catch (err) {
                audit_service_1.logger.error('Failed to persist location update to database', { error: err });
            }
            socket.to(`trip:${data.tripId}`).emit('location:updated', {
                lat: data.lat,
                lng: data.lng,
                accuracy: data.accuracy,
                recorded_at: new Date().toISOString(),
            });
        });
        socket.on('disconnect', () => {
            audit_service_1.logger.info(`Socket disconnected: ${socket.id}`);
        });
    });
}
