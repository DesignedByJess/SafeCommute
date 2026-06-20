import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const csrfProtection = require('csurf')({ cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const } });

import apiRoutes from './routes';
import { errorHandler } from './middleware/error-handler';
import { logger } from './services/audit.service';
import { verifySignature } from './utils/hmac';
import { DataRetentionService } from './services/data-retention.service';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  transports: ['websocket'],
});

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

app.use(csrfProtection);

app.get('/api/v1/csrf-token', (req: any, res) => {
  res.json({ success: true, data: { csrfToken: req.csrfToken() } });
});

app.use('/api/v1', apiRoutes);

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use(errorHandler);

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join:trip', (tripId: string) => {
    socket.join(`trip:${tripId}`);
    logger.info(`Socket ${socket.id} joined trip:${tripId}`);
  });

  socket.on('leave:trip', (tripId: string) => {
    socket.leave(`trip:${tripId}`);
    logger.info(`Socket ${socket.id} left trip:${tripId}`);
  });

  socket.on('location:update', (data: { tripId: string; lat: number; lng: number; accuracy?: number; signature?: string }) => {
    const payload = { tripId: data.tripId, lat: data.lat, lng: data.lng, accuracy: data.accuracy };
    if (data.signature && !verifySignature(payload, data.signature)) {
      logger.warn(`Rejected unsigned location update from socket ${socket.id}`);
      return;
    }
    socket.to(`trip:${data.tripId}`).emit('location:updated', {
      lat: data.lat, lng: data.lng,
      accuracy: data.accuracy,
      recorded_at: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

const retentionService = new DataRetentionService();
const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

setInterval(() => {
  retentionService.purgeAll().catch((err) => {
    logger.error('Data retention job failed', { error: err });
  });
}, RETENTION_INTERVAL_MS);

retentionService.purgeAll().catch(() => {});

const PORT = parseInt(process.env.PORT || '3000', 10);

httpServer.listen(PORT, () => {
  logger.info(`SafeCommute backend running on port ${PORT}`);
});

export { app, httpServer, io };
export default app;
