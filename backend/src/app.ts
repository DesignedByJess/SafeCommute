import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const csrfProtection = require('csurf')({ cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'none' as const } });

import apiRoutes from './routes';
import { errorHandler } from './middleware/error-handler';
import { logger } from './services/audit.service';
import { registerTripSocketHandlers } from './sockets/trip.socket';
import { DataRetentionService } from './services/data-retention.service';

const app = express();
const httpServer = createServer(app);

// csurf v1.11 uses cookie@0.4 which ignores sameSite option, so patch it here
app.use((_req, res, next) => {
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function (name: string, value: string | string[]) {
    if (name.toLowerCase() === 'set-cookie' && Array.isArray(value)) {
      value = value.map((cookie) =>
        cookie.startsWith('_csrf=') ? cookie.replace('SameSite=Strict', 'SameSite=None') : cookie,
      );
    }
    return originalSetHeader(name, value);
  };
  next();
});

const configuredOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());
const corsOriginCheck = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
  if (!origin) return callback(null, true);
  if (configuredOrigins.includes(origin)) return callback(null, true);
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return callback(null, true);
  callback(null, false);
};

const io = new Server(httpServer, {
  cors: {
    origin: corsOriginCheck,
    credentials: true,
  },
  transports: ['websocket'],
});

app.use(helmet());
app.use(cors({
  origin: corsOriginCheck,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1/auth/')) {
    return next();
  }
  return csrfProtection(req, res, next);
});

app.get('/api/v1/csrf-token', (req: any, res) => {
  res.json({ success: true, data: { csrfToken: req.csrfToken() } });
});

app.use('/api/v1', apiRoutes);

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use(errorHandler);

registerTripSocketHandlers(io);

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
