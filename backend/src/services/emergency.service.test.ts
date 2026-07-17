process.env.PHONE_KEY = '0123456789abcdef0123456789abcdef';

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
    sendTripStarted: jest.fn().mockResolvedValue(undefined),
    sendEmergencyAlert: jest.fn().mockResolvedValue(undefined),
    sendAfricaTalking: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { EmergencyService } from './emergency.service';
import { EncryptionService } from './encryption.service';
import { Trip, EmergencyAlert } from '../models';
import { NotificationService } from './notifications/notification.service';

const testEncryptedPhone = EncryptionService.encryptPhone('+2348012345678');

const TripFindOne = Trip.findOne as jest.Mock;
const AlertFindOne = EmergencyAlert.findOne as jest.Mock;
const AlertCreate = EmergencyAlert.create as jest.Mock;
const AlertFindAll = EmergencyAlert.findAll as jest.Mock;
const MockNotificationService = NotificationService as jest.Mock;

interface MockAlert {
  id: string;
  trip_id: string;
  retracted_at: Date | null;
  retraction_reason?: string | null;
  save: jest.Mock;
  trip?: Record<string, any>;
}

describe('EmergencyService', () => {
  let service: EmergencyService;
  const userId = 'test-user-uuid';
  const tripId = 'trip-uuid';
  const alertInput = { lat: 6.5, lng: 3.3, accuracy: 10 };
  const meta = { ip: '192.168.1.1', userAgent: 'Chrome' };

  beforeEach(() => {
    jest.resetAllMocks();
    MockNotificationService.mockImplementation(() => ({
      sendTripStarted: jest.fn().mockResolvedValue(undefined),
      sendEmergencyAlert: jest.fn().mockResolvedValue(undefined),
      sendAfricaTalking: jest.fn().mockResolvedValue(undefined),
    }));
    service = new EmergencyService();
  });

  describe('initiateEmergency', () => {
    it('generates verification code and returns expires_at', async () => {
      const mockTrip = {
        id: tripId,
        user_id: userId,
        status: 'active',
        save: jest.fn().mockResolvedValue(undefined),
      };
      TripFindOne.mockResolvedValue(mockTrip);
      AlertFindOne.mockResolvedValue(null);
      const result = await service.initiateEmergency(
        userId, tripId,
        { lat: 6.5, lng: 3.3, accuracy: 10, userName: 'Test User' },
        meta,
      );
      expect(result.expires_at).toBeDefined();
    });

    it('throws 404 when trip not found', async () => {
      TripFindOne.mockResolvedValue(null);
      await expect(
        service.initiateEmergency(userId, tripId, { lat: 6.5, lng: 3.3, userName: 'Test' }, meta),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 400 when trip is completed', async () => {
      TripFindOne.mockResolvedValue({ id: tripId, user_id: userId, status: 'completed' });
      await expect(
        service.initiateEmergency(userId, tripId, { lat: 6.5, lng: 3.3, userName: 'Test' }, meta),
      ).rejects.toMatchObject({ statusCode: 400, code: 'TRIP_COMPLETED' });
    });

    it('throws 409 when alert already active', async () => {
      TripFindOne.mockResolvedValue({ id: tripId, user_id: userId, status: 'active', save: jest.fn() });
      AlertFindOne.mockResolvedValue({ id: 'existing' });
      await expect(
        service.initiateEmergency(userId, tripId, { lat: 6.5, lng: 3.3, userName: 'Test' }, meta),
      ).rejects.toMatchObject({ statusCode: 409, code: 'ALERT_EXISTS' });
    });
  });

  describe('verifyAndTrigger', () => {
    it('verifies code and creates alert', async () => {
      const mockTrip = {
        id: tripId,
        user_id: userId,
        status: 'active',
        contact_name: 'Alice',
        contact_phone_encrypted: testEncryptedPhone,
        save: jest.fn().mockResolvedValue(undefined),
      };
      const mockAlert = {
        id: 'alert-uuid',
        trip_id: tripId,
        lat: 6.5,
        lng: 3.3,
        triggered_at: new Date(),
      };
      TripFindOne.mockResolvedValue(mockTrip);
      AlertFindOne.mockResolvedValue(null);
      AlertCreate.mockResolvedValue(mockAlert);

      // First initiate
      await service.initiateEmergency(
        userId, tripId,
        { lat: 6.5, lng: 3.3, accuracy: 10, userName: 'Test User' },
        meta,
      );

      // Then verify with dev code
      const result = await service.verifyAndTrigger(userId, tripId, '123456');
      expect(result.trip_id).toBe(tripId);
    });

    it('throws 400 for invalid code', async () => {
      TripFindOne.mockResolvedValue({ id: tripId, user_id: userId, status: 'active', save: jest.fn() });
      AlertFindOne.mockResolvedValue(null);

      await service.initiateEmergency(
        userId, tripId,
        { lat: 6.5, lng: 3.3, userName: 'Test' },
        meta,
      );

      await expect(
        service.verifyAndTrigger(userId, tripId, '000000'),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('retractAlert', () => {
    it('retracts alert and reverts trip status', async () => {
      const mockTrip = {
        id: tripId,
        user_id: userId,
        status: 'emergency',
        update: jest.fn().mockResolvedValue(undefined),
      };
      const mockAlert: MockAlert = {
        id: 'alert-uuid',
        trip_id: tripId,
        retracted_at: null,
        save: jest.fn().mockResolvedValue(undefined),
        trip: mockTrip,
      };
      AlertFindOne.mockResolvedValue(mockAlert);
      const result = await service.retractAlert(userId, 'alert-uuid', 'false alarm');
      expect(mockAlert.retracted_at).toBeDefined();
      expect(mockAlert.retraction_reason).toBe('false alarm');
      expect(mockAlert.save).toHaveBeenCalled();
      expect(mockTrip.update).toHaveBeenCalledWith({ status: 'active' });
      expect(result).toEqual(mockAlert);
    });

    it('throws 404 when alert not found', async () => {
      AlertFindOne.mockResolvedValue(null);
      await expect(service.retractAlert(userId, 'nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('retracts without reverting status when trip is not emergency', async () => {
      const mockTrip = {
        id: tripId,
        user_id: userId,
        status: 'active',
        update: jest.fn(),
      };
      const mockAlert: MockAlert = {
        id: 'alert-uuid',
        trip_id: tripId,
        retracted_at: null,
        save: jest.fn().mockResolvedValue(undefined),
        trip: mockTrip,
      };
      AlertFindOne.mockResolvedValue(mockAlert);
      await service.retractAlert(userId, 'alert-uuid');
      expect(mockTrip.update).not.toHaveBeenCalled();
    });
  });

  describe('listAlerts', () => {
    it('returns alerts for user trips', async () => {
      const mockAlerts = [{ id: 'a1' }, { id: 'a2' }];
      AlertFindAll.mockResolvedValue(mockAlerts);
      const result = await service.listAlerts(userId);
      expect(AlertFindAll).toHaveBeenCalledWith({
        include: [{
          model: Trip,
          as: 'trip',
          where: { user_id: userId },
          attributes: ['id', 'destination_address', 'status'],
        }],
        order: [['triggered_at', 'DESC']],
        limit: 50,
      });
      expect(result).toEqual(mockAlerts);
    });
  });
});
