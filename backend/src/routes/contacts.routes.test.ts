process.env.PHONE_KEY = '0123456789abcdef0123456789abcdef';

jest.mock('express-rate-limit', () => {
  return jest.fn(() => (_req: any, _res: any, next: any) => next());
});

jest.mock('../models/contact.model', () => ({
  Contact: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
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

import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import contactsRouter from './contacts.routes';
import { errorHandler } from '../middleware/error-handler';
import { Contact } from '../models/contact.model';

const ContactFindAll = Contact.findAll as jest.Mock;
const ContactFindOne = Contact.findOne as jest.Mock;
const ContactCreate = Contact.create as jest.Mock;

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
  app.use('/api/v1/contacts', contactsRouter);
  app.use(errorHandler);
  return app;
}

describe('Contacts Routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/v1/contacts', () => {
    it('returns 201 with created contact for valid input', async () => {
      ContactFindOne.mockResolvedValue(null);
      ContactCreate.mockResolvedValue({
        id: 'new-uuid',
        name: 'Alice',
        phone_number_encrypted: 'iv:tag:encrypted',
        relationship: 'sister',
        verified: false,
        created_at: new Date('2025-01-01'),
        toJSON() { return { ...this }; },
      });
      const app = createApp();
      const agent = request.agent(app);
      const csrfRes = await agent.get('/csrf-token');
      const csrfToken = csrfRes.body.data.csrfToken;
      const res = await agent
        .post('/api/v1/contacts')
        .set('x-csrf-token', csrfToken)
        .send({ name: 'Alice', phone: '+2348012345678', relationship: 'sister' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('new-uuid');
      expect(res.body.data.name).toBe('Alice');
    });

    it('returns 400 for invalid phone number', async () => {
      const app = createApp();
      const agent = request.agent(app);
      const csrfRes = await agent.get('/csrf-token');
      const csrfToken = csrfRes.body.data.csrfToken;
      const res = await agent
        .post('/api/v1/contacts')
        .set('x-csrf-token', csrfToken)
        .send({ name: 'Alice', phone: '12345' });
      expect(res.status).toBe(400);
    });

    it('returns 403 when CSRF token is missing', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/contacts')
        .send({ name: 'Alice', phone: '+2348012345678' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/contacts', () => {
    it('returns list of contacts', async () => {
      const mockContacts = [
        {
          id: 'c1', name: 'Alice', phone_number_encrypted: '+2348012345678',
          relationship: 'sister', verified: true, created_at: new Date('2025-01-01'),
          toJSON() { return { ...this }; },
        },
        {
          id: 'c2', name: 'Bob', phone_number_encrypted: '+2348098765432',
          relationship: 'friend', verified: false, created_at: new Date('2025-01-02'),
          toJSON() { return { ...this }; },
        },
      ];
      ContactFindAll.mockResolvedValue(mockContacts);
      const app = createApp();
      const res = await request(app).get('/api/v1/contacts');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('DELETE /api/v1/contacts/:id', () => {
    it('returns 204 on successful delete', async () => {
      const mockContact = { id: 'c1', update: jest.fn().mockResolvedValue(undefined) };
      ContactFindOne.mockResolvedValue(mockContact);
      const app = createApp();
      const agent = request.agent(app);
      const csrfRes = await agent.get('/csrf-token');
      const csrfToken = csrfRes.body.data.csrfToken;
      const res = await agent
        .delete('/api/v1/contacts/c1')
        .set('x-csrf-token', csrfToken);
      expect(res.status).toBe(204);
    });
  });

  describe('POST /api/v1/contacts/:id/verify-otp', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    it('verifies OTP successfully', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      ContactFindOne.mockResolvedValue({
        id: uuid,
        user_id: 'test-user-id',
        verified: false,
        otp_code: '123456',
        otp_expires_at: futureDate,
        save: jest.fn().mockResolvedValue(undefined),
      });
      const app = createApp();
      const agent = request.agent(app);
      const csrfRes = await agent.get('/csrf-token');
      const csrfToken = csrfRes.body.data.csrfToken;
      const res = await agent
        .post(`/api/v1/contacts/${uuid}/verify-otp`)
        .set('x-csrf-token', csrfToken)
        .send({ contactId: uuid, otp: '123456' });
      expect(res.status).toBe(200);
      expect(res.body.data.verified).toBe(true);
    });

    it('returns 400 for invalid OTP', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      ContactFindOne.mockResolvedValue({
        id: uuid,
        user_id: 'test-user-id',
        verified: false,
        otp_code: '999999',
        otp_expires_at: futureDate,
      });
      const app = createApp();
      const agent = request.agent(app);
      const csrfRes = await agent.get('/csrf-token');
      const csrfToken = csrfRes.body.data.csrfToken;
      const res = await agent
        .post(`/api/v1/contacts/${uuid}/verify-otp`)
        .set('x-csrf-token', csrfToken)
        .send({ contactId: uuid, otp: '123456' });
      expect(res.status).toBe(400);
    });
  });
});
