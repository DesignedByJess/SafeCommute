process.env.MASTER_KEY = 'fedcba9876543210fedcba9876543210';
process.env.PHONE_KEY = '0123456789abcdef0123456789abcdef';

jest.mock('express-rate-limit', () => {
  return jest.fn(() => (_req: any, _res: any, next: any) => next());
});

jest.mock('../models', () => ({
  Trip: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  TripLocation: {
    findOne: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../models/audit.model', () => ({
  AuditLog: {
    create: jest.fn(),
  },
}));

jest.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
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

jest.mock('../services/notifications/notification.service', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    sendTripStarted: jest.fn().mockResolvedValue(undefined),
    sendEmergencyAlert: jest.fn().mockResolvedValue(undefined),
  })),
}));

import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import tripsRouter from './trips.routes';
import { errorHandler } from '../middleware/error-handler';
import { Trip, TripLocation } from '../models';

const TripCreate = Trip.create as jest.Mock;
const TripFindAll = Trip.findAll as jest.Mock;
const TripFindOne = Trip.findOne as jest.Mock;
const TripLocationDestroy = TripLocation.destroy as jest.Mock;

function createApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const csrf = require('csurf');
  const csrfProtection = csrf({ cookie: { httpOnly: true, secure: false, sameSite: 'strict' } }) as any;
  app.use(csrfProtection);
  app.get('/csrf-token', (req: any, res: any) => {
    res.json({ success: true, data: { csrfToken: req.csrfToken() } });
  });
  app.use('/api/v1/trips', tripsRouter);
  app.use(errorHandler);
  return app;
}

const validTripInput = {
  origin_lat: 6.5244,
  origin_lng: 3.3792,
  origin_address: 'Lagos',
  destination_lat: 6.4428,
  destination_lng: 3.4419,
  destination_address: 'Ikeja',
  vehicle_plate: 'ABC-123XY',
  contact_name: 'Alice',
  contact_phone: '+2348012345678',
};

describe('Trips Routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/v1/trips', () => {
    it('returns 201 with created trip for valid input', async () => {
      TripCreate.mockResolvedValue({
        id: 'trip-uuid',
        share_token: 'abcdef1234567890abcdef1234567890',
        origin_lat: 6.5244,
        origin_lng: 3.3792,
        origin_address: 'Lagos',
        destination_lat: 6.4428,
        destination_lng: 3.4419,
        destination_address: 'Ikeja',
        contact_name: 'Alice',
        status: 'active',
        started_at: new Date(),
        expires_at: new Date(Date.now() + 7200000),
      });
      const app = createApp();
      const agent = request.agent(app);
      const csrfRes = await agent.get('/csrf-token');
      const csrfToken = csrfRes.body.data.csrfToken;
      const res = await agent
        .post('/api/v1/trips')
        .set('x-csrf-token', csrfToken)
        .send(validTripInput);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 for invalid plate', async () => {
      const app = createApp();
      const agent = request.agent(app);
      const csrfRes = await agent.get('/csrf-token');
      const csrfToken = csrfRes.body.data.csrfToken;
      const res = await agent
        .post('/api/v1/trips')
        .set('x-csrf-token', csrfToken)
        .send({ ...validTripInput, vehicle_plate: '' });
      expect(res.status).toBe(400);
    });

    it('returns 403 when CSRF token is missing', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/trips')
        .send(validTripInput);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/trips/:id/end', () => {
    it('returns 200 with completed status', async () => {
      const mockTrip = {
        id: 'trip-id',
        user_id: 'test-user-id',
        status: 'active',
        save: jest.fn().mockImplementation(function (this: any) {
          this.status = 'completed';
          this.ended_at = new Date();
          return Promise.resolve();
        }),
      };
      TripFindOne.mockResolvedValue(mockTrip);
      TripLocationDestroy.mockResolvedValue(1);
      const app = createApp();
      const agent = request.agent(app);
      const csrfRes = await agent.get('/csrf-token');
      const csrfToken = csrfRes.body.data.csrfToken;
      const res = await agent
        .patch('/api/v1/trips/trip-id/end')
        .set('x-csrf-token', csrfToken)
        .send({ lat: 6.5, lng: 3.4 });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
    });
  });

  describe('GET /api/v1/trips/active', () => {
    it('returns active trip when found', async () => {
      TripFindOne.mockResolvedValue({
        id: 'trip-id',
        share_token: 'token123',
        destination_address: 'Ikeja',
        contact_name: 'Alice',
        status: 'active',
        started_at: new Date(),
        expires_at: new Date(Date.now() + 7200000),
      });
      const app = createApp();
      const res = await request(app).get('/api/v1/trips/active');
      expect(res.status).toBe(200);
      expect(res.body.data).not.toBeNull();
    });

    it('returns null when no active trip', async () => {
      TripFindOne.mockResolvedValue(null);
      const app = createApp();
      const res = await request(app).get('/api/v1/trips/active');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });
});
