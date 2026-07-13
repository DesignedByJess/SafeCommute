"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTripSocketHandlers = registerTripSocketHandlers;
const audit_service_1 = require("../services/audit.service");
const hmac_1 = require("../utils/hmac");
const locationRateLimit = new Map();
function registerTripSocketHandlers(io) {
    io.on('connection', (socket) => {
        audit_service_1.logger.info(`Socket connected: ${socket.id}`);
        const cookie = socket.handshake.headers.cookie;
        const hasToken = cookie?.includes('sb-access-token=');
        if (!hasToken) {
            audit_service_1.logger.warn(`Socket ${socket.id} rejected — no auth cookie`);
            socket.disconnect();
            return;
        }
        socket.on('join:trip', (tripId) => {
            socket.join(`trip:${tripId}`);
            audit_service_1.logger.info(`Socket ${socket.id} joined trip:${tripId}`);
        });
        socket.on('leave:trip', (tripId) => {
            socket.leave(`trip:${tripId}`);
            audit_service_1.logger.info(`Socket ${socket.id} left trip:${tripId}`);
        });
        socket.on('location:update', (data) => {
            const now = Date.now();
            const last = locationRateLimit.get(data.tripId) ?? 0;
            if (now - last < 10000) {
                audit_service_1.logger.warn(`Rate limited location update for trip ${data.tripId} from socket ${socket.id}`);
                return;
            }
            locationRateLimit.set(data.tripId, now);
            const payload = { tripId: data.tripId, lat: data.lat, lng: data.lng, accuracy: data.accuracy };
            if (data.signature && !(0, hmac_1.verifySignature)(payload, data.signature)) {
                audit_service_1.logger.warn(`Rejected unsigned location update from socket ${socket.id}`);
                return;
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
