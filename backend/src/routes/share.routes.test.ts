jest.mock('express-rate-limit', () => {
  return jest.fn(() => (_req: any, _res: any, next: any) => next());
});

jest.mock('../models', () => ({
  Trip: {
    findOne: jest.fn(),
  },
  TripLocation: {
    findAll: jest.fn(),
  },
}));

jest.mock('../models/audit.model', () => ({
  AuditLog: {
    create: jest.fn(),
  },
}));

jest.mock('winston', () => {
  const mockLogger = { info: jest.fn(), error: jest.fn() };
  return {
    createLogger: jest.fn(() => mockLogger),
    format: { combine: jest.fn(), timestamp: jest.fn(), json: jest.fn(), colorize: jest.fn(), simple: jest.fn() },
    transports: { Console: jest.fn() },
  };
});

import express from 'express';
import request from 'supertest';
import shareRouter from './share.routes';
import { errorHandler } from '../middleware/error-handler';
import { Trip, TripLocation } from '../models';

const TripFindOne = Trip.findOne as jest.Mock;
const TripLocationFindAll = TripLocation.findAll as jest.Mock;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/share', shareRouter);
  app.use(errorHandler);
  return app;
}

describe('Share Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/share/:share_token', () => {
    it('returns trip details for valid token', async () => {
      TripFindOne.mockResolvedValue({
        id: 'trip-uuid',
        share_token: 'valid-token-123',
        destination_address: 'Ikeja',
        destination_lat: 6.4428,
        destination_lng: 3.4419,
        contact_name: 'Alice',
        status: 'active',
        started_at: new Date(),
        expires_at: new Date(Date.now() + 7200000),
        share_link_expires_at: new Date(Date.now() + 14400000),
        share_link_revoked: false,
        vehicle_plate_encrypted: 'iv:tag:encrypted',
      });
      const app = createApp();
      const res = await request(app).get('/api/v1/share/valid-token-123');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.contact_name).toBe('Alice');
      expect(res.body.data.vehicle_plate).toContain('**-');
    });

    it('returns 404 for unknown token', async () => {
      TripFindOne.mockResolvedValue(null);
      const app = createApp();
      const res = await request(app).get('/api/v1/share/unknown-token');
      expect(res.status).toBe(404);
    });

    it('returns 410 when share link is expired', async () => {
      TripFindOne.mockResolvedValue({
        share_link_revoked: false,
        share_link_expires_at: new Date(Date.now() - 3600000),
      });
      const app = createApp();
      const res = await request(app).get('/api/v1/share/expired-token');
      expect(res.status).toBe(410);
    });

    it('returns 410 when share link is revoked', async () => {
      TripFindOne.mockResolvedValue({
        share_link_revoked: true,
        share_link_expires_at: new Date(Date.now() + 3600000),
      });
      const app = createApp();
      const res = await request(app).get('/api/v1/share/revoked-token');
      expect(res.status).toBe(410);
    });
  });
});
