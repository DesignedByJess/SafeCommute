jest.mock('express-rate-limit', () => {
  return jest.fn(() => (_req: any, _res: any, next: any) => next());
});

jest.mock('../models', () => ({
  Trip: {
    findOne: jest.fn(),
  },
  EmergencyAlert: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
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
import emergencyRouter from './emergency.routes';
import { errorHandler } from '../middleware/error-handler';
import { Trip, EmergencyAlert } from '../models';

const TripFindOne = Trip.findOne as jest.Mock;
const AlertFindOne = EmergencyAlert.findOne as jest.Mock;
const AlertCreate = EmergencyAlert.create as jest.Mock;

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
  app.use('/api/v1/emergency', emergencyRouter);
  app.use(errorHandler);
  return app;
}

describe('Emergency Routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/v1/emergency/:tripId/trigger', () => {
    it('returns 201 with created alert', async () => {
      TripFindOne.mockResolvedValue({
        id: 'trip-1',
        user_id: 'test-user-id',
        status: 'active',
        contact_name: 'Alice',
        contact_phone_encrypted: 'enc123',
        share_token: 'token123',
        save: jest.fn().mockResolvedValue(undefined),
      });
      AlertFindOne.mockResolvedValue(null);
      AlertCreate.mockResolvedValue({
        id: 'alert-uuid',
        trip_id: 'trip-1',
        lat: 6.5,
        lng: 3.4,
        triggered_at: new Date(),
      });
      const app = createApp();
      const agent = request.agent(app);
      const csrfRes = await agent.get('/csrf-token');
      const csrfToken = csrfRes.body.data.csrfToken;
      const res = await agent
        .post('/api/v1/emergency/trip-1/trigger')
        .set('x-csrf-token', csrfToken)
        .send({ lat: 6.5, lng: 3.4 });
      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('alert-uuid');
    });

    it('returns 400 when trip is completed', async () => {
      TripFindOne.mockResolvedValue({
        id: 'trip-1',
        user_id: 'test-user-id',
        status: 'completed',
      });
      const app = createApp();
      const agent = request.agent(app);
      const csrfRes = await agent.get('/csrf-token');
      const csrfToken = csrfRes.body.data.csrfToken;
      const res = await agent
        .post('/api/v1/emergency/trip-1/trigger')
        .set('x-csrf-token', csrfToken)
        .send({ lat: 6.5, lng: 3.4 });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/emergency/:alertId/retract', () => {
    it('returns 200 with retracted alert', async () => {
      AlertFindOne.mockResolvedValue({
        id: 'alert-1',
        trip_id: 'trip-1',
        retracted_at: null,
        save: jest.fn().mockResolvedValue(undefined),
        trip: { id: 'trip-1', status: 'emergency', update: jest.fn().mockResolvedValue(undefined) },
      });
      const app = createApp();
      const agent = request.agent(app);
      const csrfRes = await agent.get('/csrf-token');
      const csrfToken = csrfRes.body.data.csrfToken;
      const res = await agent
        .post('/api/v1/emergency/alert-1/retract')
        .set('x-csrf-token', csrfToken)
        .send({ reason: 'false alarm' });
      expect(res.status).toBe(200);
      expect(res.body.data.retracted_at).toBeDefined();
    });
  });
});
