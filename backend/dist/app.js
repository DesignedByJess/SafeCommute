"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.httpServer = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
dotenv_1.default.config();
const csrfProtection = require('csurf')({ cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' } });
const routes_1 = __importDefault(require("./routes"));
const error_handler_1 = require("./middleware/error-handler");
const audit_service_1 = require("./services/audit.service");
const hmac_1 = require("./utils/hmac");
const data_retention_service_1 = require("./services/data-retention.service");
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    },
    transports: ['websocket'],
});
exports.io = io;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '10kb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(csrfProtection);
app.get('/api/v1/csrf-token', (req, res) => {
    res.json({ success: true, data: { csrfToken: req.csrfToken() } });
});
app.use('/api/v1', routes_1.default);
app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});
app.use(error_handler_1.errorHandler);
io.on('connection', (socket) => {
    audit_service_1.logger.info(`Socket connected: ${socket.id}`);
    socket.on('join:trip', (tripId) => {
        socket.join(`trip:${tripId}`);
        audit_service_1.logger.info(`Socket ${socket.id} joined trip:${tripId}`);
    });
    socket.on('leave:trip', (tripId) => {
        socket.leave(`trip:${tripId}`);
        audit_service_1.logger.info(`Socket ${socket.id} left trip:${tripId}`);
    });
    socket.on('location:update', (data) => {
        const payload = { tripId: data.tripId, lat: data.lat, lng: data.lng, accuracy: data.accuracy };
        if (data.signature && !(0, hmac_1.verifySignature)(payload, data.signature)) {
            audit_service_1.logger.warn(`Rejected unsigned location update from socket ${socket.id}`);
            return;
        }
        socket.to(`trip:${data.tripId}`).emit('location:updated', {
            lat: data.lat, lng: data.lng,
            accuracy: data.accuracy,
            recorded_at: new Date().toISOString(),
        });
    });
    socket.on('disconnect', () => {
        audit_service_1.logger.info(`Socket disconnected: ${socket.id}`);
    });
});
const retentionService = new data_retention_service_1.DataRetentionService();
const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;
setInterval(() => {
    retentionService.purgeAll().catch((err) => {
        audit_service_1.logger.error('Data retention job failed', { error: err });
    });
}, RETENTION_INTERVAL_MS);
retentionService.purgeAll().catch(() => { });
const PORT = parseInt(process.env.PORT || '3000', 10);
httpServer.listen(PORT, () => {
    audit_service_1.logger.info(`SafeCommute backend running on port ${PORT}`);
});
exports.default = app;
