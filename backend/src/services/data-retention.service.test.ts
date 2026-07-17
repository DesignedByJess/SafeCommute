jest.mock('../models', () => ({
  Trip: { destroy: jest.fn() },
  Contact: { destroy: jest.fn() },
  AuditLog: { destroy: jest.fn() },
}));

jest.mock('../models/audit.model', () => ({
  AuditLog: {
    destroy: jest.fn(),
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

import { DataRetentionService } from './data-retention.service';
import { Trip, Contact, AuditLog } from '../models';
import { Op } from 'sequelize';

const TripDestroy = Trip.destroy as jest.Mock;
const ContactDestroy = Contact.destroy as jest.Mock;
const AuditLogDestroy = AuditLog.destroy as jest.Mock;

describe('DataRetentionService', () => {
  let service: DataRetentionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DataRetentionService();
  });

  describe('purgeExpiredTrips', () => {
    it('deletes trips past expiry', async () => {
      TripDestroy.mockResolvedValueOnce(5);
      const result = await service.purgeExpiredTrips();
      expect(TripDestroy).toHaveBeenCalledWith({
        where: {
          [Op.or]: [
            { expires_at: { [Op.lt]: expect.any(Date) }, status: { [Op.ne]: 'emergency' } },
            { expires_at: { [Op.lt]: expect.any(Date) }, status: 'emergency' },
          ],
        },
      });
      expect(result).toBe(5);
    });

    it('returns 0 when no expired trips', async () => {
      TripDestroy.mockResolvedValueOnce(0);
      const result = await service.purgeExpiredTrips();
      expect(result).toBe(0);
    });
  });

  describe('purgeSoftDeletedContacts', () => {
    it('hard-deletes contacts soft-deleted over 7 days ago', async () => {
      ContactDestroy.mockResolvedValueOnce(3);
      const result = await service.purgeSoftDeletedContacts();
      expect(ContactDestroy).toHaveBeenCalledWith({
        where: { deleted_at: { [Op.lt]: expect.any(Date) } },
        force: true,
      });
      expect(result).toBe(3);
    });
  });

  describe('purgeOldAuditLogs', () => {
    it('deletes audit logs older than 30 days', async () => {
      AuditLogDestroy.mockResolvedValueOnce(10);
      const result = await service.purgeOldAuditLogs();
      expect(AuditLogDestroy).toHaveBeenCalledWith({
        where: { created_at: { [Op.lt]: expect.any(Date) } },
      });
      expect(result).toBe(10);
    });
  });

  describe('purgeAll', () => {
    it('calls all three purge methods', async () => {
      TripDestroy.mockResolvedValueOnce(2);
      ContactDestroy.mockResolvedValueOnce(1);
      AuditLogDestroy.mockResolvedValueOnce(8);
      await service.purgeAll();
      expect(TripDestroy).toHaveBeenCalled();
      expect(ContactDestroy).toHaveBeenCalled();
      expect(AuditLogDestroy).toHaveBeenCalled();
    });
  });
});
