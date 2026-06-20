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

import { ContactService } from './contacts.service';
import { Contact } from '../models/contact.model';

const ContactFindAll = Contact.findAll as jest.Mock;
const ContactFindOne = Contact.findOne as jest.Mock;
const ContactCreate = Contact.create as jest.Mock;

describe('ContactService', () => {
  let service: ContactService;
  const userId = 'test-user-uuid';

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ContactService();
  });

  describe('listContacts', () => {
    it('returns contacts excluding otp fields', async () => {
      const mockContacts = [
        { id: '1', name: 'Alice', phone_number_encrypted: 'enc123', verified: true, created_at: new Date(), toJSON: () => ({}) },
        { id: '2', name: 'Bob', phone_number_encrypted: 'enc456', verified: false, created_at: new Date(), toJSON: () => ({}) },
      ];
      ContactFindAll.mockResolvedValue(mockContacts);
      const result = await service.listContacts(userId);
      expect(ContactFindAll).toHaveBeenCalledWith({
        where: { user_id: userId, deleted_at: null },
        attributes: { exclude: ['otp_code', 'otp_expires_at'] },
        order: [['created_at', 'DESC']],
      });
      expect(result).toEqual(mockContacts);
    });
  });

  describe('addContact', () => {
    const input = { name: 'Alice', phone: '+2348012345678', relationship: 'sister' };

    it('creates a contact with encrypted phone and OTP', async () => {
      ContactFindOne.mockResolvedValue(null);
      ContactCreate.mockImplementationOnce((data: any) => Promise.resolve({
        id: 'contact-uuid',
        ...data,
        created_at: new Date(),
        toJSON() { return { ...this }; },
      }));
      const result = await service.addContact(userId, input);
      expect(ContactCreate).toHaveBeenCalled();
      expect(result.otp_code).toMatch(/^\d{6}$/);
    });

    it('throws 409 when contact already exists', async () => {
      ContactFindOne.mockResolvedValue({ id: 'existing' });
      await expect(service.addContact(userId, input)).rejects.toMatchObject({
        statusCode: 409,
        code: 'CONTACT_EXISTS',
      });
    });
  });

  describe('verifyOtp', () => {
    const contactId = 'contact-uuid';
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);

    it('verifies OTP successfully', async () => {
      const mockContact = {
        id: contactId,
        user_id: userId,
        verified: false,
        otp_code: '123456',
        otp_expires_at: futureDate,
        save: jest.fn().mockResolvedValue(undefined),
      };
      ContactFindOne.mockResolvedValue(mockContact);
      const result = await service.verifyOtp(userId, contactId, '123456');
      expect(mockContact.verified).toBe(true);
      expect(mockContact.otp_code).toBeNull();
      expect(mockContact.save).toHaveBeenCalled();
      expect(result).toEqual({ id: contactId, verified: true });
    });

    it('throws 404 when contact not found', async () => {
      ContactFindOne.mockResolvedValue(null);
      await expect(service.verifyOtp(userId, contactId, '123456')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('throws 400 when already verified', async () => {
      ContactFindOne.mockResolvedValue({
        id: contactId,
        user_id: userId,
        verified: true,
        otp_code: '123456',
        otp_expires_at: futureDate,
      });
      await expect(service.verifyOtp(userId, contactId, '123456')).rejects.toMatchObject({
        statusCode: 400,
        code: 'ALREADY_VERIFIED',
      });
    });

    it('throws 400 on wrong OTP', async () => {
      ContactFindOne.mockResolvedValue({
        id: contactId,
        user_id: userId,
        verified: false,
        otp_code: '999999',
        otp_expires_at: futureDate,
      });
      await expect(service.verifyOtp(userId, contactId, '123456')).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_OTP',
      });
    });

    it('throws 400 on expired OTP', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      ContactFindOne.mockResolvedValue({
        id: contactId,
        user_id: userId,
        verified: false,
        otp_code: '123456',
        otp_expires_at: pastDate,
      });
      await expect(service.verifyOtp(userId, contactId, '123456')).rejects.toMatchObject({
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
