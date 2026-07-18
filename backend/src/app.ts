import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';

dotenv.config();

import apiRoutes from './routes';
import { errorHandler } from './middleware/error-handler';
import { logger } from './services/audit.service';
import { registerTripSocketHandlers } from './sockets/trip.socket';
import { DataRetentionService } from './services/data-retention.service';

const app = express();
const httpServer = createServer(app);

const configuredOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());
const corsOriginCheck = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
  if (!origin) return callback(null, true);
  if (configuredOrigins.includes(origin)) return callback(null, true);
  callback(null, false);
};

const io = new Server(httpServer, {
  cors: {
    origin: corsOriginCheck,
    credentials: true,
  },
  transports: ['websocket'],
});

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: corsOriginCheck,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

function createCsrfToken(secret: string): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(16).toString('hex');
  const payload = `${ts}.${rand}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyCsrfToken(secret: string, token: string, maxAgeMs = 60 * 60 * 1000): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [ts, rand, sig] = parts;
  const payload = `${ts}.${rand}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return false;
  const tsNum = parseInt(ts, 36);
  if (isNaN(tsNum)) return false;
  return Date.now() - tsNum <= maxAgeMs;
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1/auth/') || req.path.startsWith('/api/v1/csrf-token') || req.path.startsWith('/health')) {
    return next();
  }

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const secret = process.env.CSRF_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  const headerToken = req.headers['csrf-token'] as string | undefined;
  if (!headerToken || !verifyCsrfToken(secret, headerToken)) {
    return res.status(403).json({ success: false, error: 'Invalid CSRF token' });
  }

  next();
});

app.get('/api/v1/csrf-token', (_req, res) => {
  const secret = process.env.CSRF_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }
  const csrfToken = createCsrfToken(secret);
  res.json({ success: true, data: { csrfToken } });
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
