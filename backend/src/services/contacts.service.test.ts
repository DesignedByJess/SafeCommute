process.env.PHONE_KEY = '0123456789abcdef0123456789abcdef';

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

jest.mock('winston', () => {
  const mockLogger = { info: jest.fn(), error: jest.fn() };
  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      json: jest.fn(),
      colorize: jest.fn(),
      simple: jest.fn(),
    },
    transports: { Console: jest.fn() },
  };
});

jest.mock('./notifications/notification.service', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    sendAfricaTalking: jest.fn().mockResolvedValue(undefined),
  })),
}));

import crypto from 'crypto';
import { ContactService, pendingStore } from './contacts.service';
import { Contact } from '../models/contact.model';

const ContactFindAll = Contact.findAll as jest.Mock;
const ContactFindOne = Contact.findOne as jest.Mock;
const ContactCreate = Contact.create as jest.Mock;

const mockToken = crypto.randomBytes(32).toString('hex');

describe('ContactService', () => {
  let service: ContactService;
  const userId = 'test-user-uuid';

  beforeEach(() => {
    jest.resetAllMocks();
    pendingStore.clear();
    service = new ContactService();
  });

  afterAll(() => {
    pendingStore.clear();
  });

  describe('listContacts', () => {
    it('returns only verified contacts excluding otp fields', async () => {
      const mockContacts = [
        { id: '1', name: 'Alice', phone_number_encrypted: 'enc123', verified: true, created_at: new Date(), toJSON: () => ({}) },
      ];
      ContactFindAll.mockResolvedValue(mockContacts);
      const result = await service.listContacts(userId);
      expect(ContactFindAll).toHaveBeenCalledWith({
        where: { user_id: userId, deleted_at: null, verified: true },
        attributes: { exclude: ['otp_code', 'otp_expires_at'] },
        order: [['created_at', 'DESC']],
      });
      expect(result).toEqual(mockContacts);
    });
  });

  describe('sendOtp', () => {
    const input = { name: 'Alice', phone: '+2348012345678', relationship: 'sister' };

    it('stores OTP in memory and returns verification token', async () => {
      ContactFindOne.mockResolvedValue(null);
      const result = await service.sendOtp(userId, input);
      expect(result.verification_token).toBeDefined();
      expect(result.verification_token).toHaveLength(64);
      expect(ContactCreate).not.toHaveBeenCalled();
    });

    it('throws 409 when contact already exists', async () => {
      ContactFindOne.mockResolvedValue({ id: 'existing' });
      await expect(service.sendOtp(userId, input)).rejects.toMatchObject({
        statusCode: 409,
        code: 'CONTACT_EXISTS',
      });
    });

    it('includes devOtp in the response', async () => {
      ContactFindOne.mockResolvedValue(null);
      const result = await service.sendOtp(userId, input);
      expect(result.devOtp).toBeDefined();
      expect(result.devOtp).toMatch(/^\d{6}$/);
    });
  });

  describe('verifyOtp', () => {
    const input = { name: 'Bob', phone: '+2348012345678', relationship: 'friend' };

    it('creates contact and returns id on valid OTP', async () => {
      ContactFindOne.mockResolvedValue(null);
      const sendResult = await service.sendOtp(userId, input);
      ContactCreate.mockResolvedValue({
        id: 'new-contact-uuid',
        user_id: userId,
        name: input.name,
        phone_number_encrypted: expect.any(String),
        phone_number_hash: expect.any(String),
        relationship: input.relationship,
        verified: true,
      });
      const result = await service.verifyOtp(userId, sendResult.verification_token, sendResult.devOtp!);
      expect(ContactCreate).toHaveBeenCalled();
      expect(result.verified).toBe(true);
    });

    it('throws 404 on unknown token', async () => {
      await expect(service.verifyOtp(userId, 'nonexistent-token', '123456')).rejects.toMatchObject({
        statusCode: 404,
        code: 'VERIFICATION_NOT_FOUND',
      });
    });

    it('throws 403 on wrong user', async () => {
      ContactFindOne.mockResolvedValue(null);
      const sendResult = await service.sendOtp(userId, input);
      await expect(service.verifyOtp('other-user', sendResult.verification_token, sendResult.devOtp!)).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });

    it('throws 400 on wrong OTP', async () => {
      ContactFindOne.mockResolvedValue(null);
      const sendResult = await service.sendOtp(userId, input);
      await expect(service.verifyOtp(userId, sendResult.verification_token, '000000')).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_OTP',
      });
    });

    it('throws 400 on expired OTP', async () => {
      ContactFindOne.mockResolvedValue(null);
      const sendResult = await service.sendOtp(userId, input);
      const pending = pendingStore.get(sendResult.verification_token);
      if (pending) {
        pending.expiresAt = Date.now() - 1;
      }
      await expect(service.verifyOtp(userId, sendResult.verification_token, sendResult.devOtp!)).rejects.toMatchObject({
        statusCode: 400,
        code: 'OTP_EXPIRED',
      });
    });
  });

  describe('getContact', () => {
    it('returns contact when found', async () => {
      const mockContact = { id: 'c1', name: 'Alice' };
      ContactFindOne.mockResolvedValue(mockContact);
      const result = await service.getContact(userId, 'c1');
      expect(result).toEqual(mockContact);
    });

    it('throws 404 when not found', async () => {
      ContactFindOne.mockResolvedValue(null);
      await expect(service.getContact(userId, 'nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('deleteContact', () => {
    it('soft-deletes contact', async () => {
      const mockContact = {
        id: 'c1',
        update: jest.fn().mockResolvedValue(undefined),
      };
      ContactFindOne.mockResolvedValue(mockContact);
      await service.deleteContact(userId, 'c1');
      expect(mockContact.update).toHaveBeenCalledWith({ deleted_at: expect.any(Date) });
    });

    it('throws 404 when not found', async () => {
      ContactFindOne.mockResolvedValue(null);
      await expect(service.deleteContact(userId, 'nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
