process.env.MASTER_KEY = 'fedcba9876543210fedcba9876543210';
process.env.PHONE_KEY = '0123456789abcdef0123456789abcdef';

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
  })),
}));

import { TripService } from './trips.service';
import { Trip, TripLocation } from '../models';
import { NotificationService } from './notifications/notification.service';

const TripCreate = Trip.create as jest.Mock;
const TripFindAll = Trip.findAll as jest.Mock;
const TripFindOne = Trip.findOne as jest.Mock;
const TripLocationFindOne = TripLocation.findOne as jest.Mock;
const TripLocationDestroy = TripLocation.destroy as jest.Mock;
const MockNotificationService = NotificationService as jest.Mock;

describe('TripService', () => {
  let service: TripService;
  const userId = 'test-user-uuid';
  const defaultInput = {
    origin_lat: 6.5244,
    origin_lng: 3.3792,
    origin_address: 'Lagos',
    destination_lat: 6.4428,
    destination_lng: 3.4419,
    destination_address: 'Ikeja',
    vehicle_plate: 'ABC-123XY',
    contact_name: 'Alice',
    contact_phone: '+2348012345678',
    contact_id: undefined,
    safety_notes: undefined,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    MockNotificationService.mockImplementation(() => ({
      sendTripStarted: jest.fn().mockResolvedValue(undefined),
      sendEmergencyAlert: jest.fn().mockResolvedValue(undefined),
    }));
    service = new TripService();
  });

  describe('createTrip', () => {
    it('creates trip with share token and encrypted plate', async () => {
      const mockTrip = {
        id: 'trip-uuid',
        user_id: userId,
        share_token: 'abcdef1234567890abcdef1234567890',
        status: 'active',
        vehicle_plate_encrypted: 'iv:tag:data',
        vehicle_plate_data_key_encrypted: 'iv:data',
        contact_phone_encrypted: 'enc:enc:enc',
        expires_at: new Date(Date.now() + 7200000),
        share_link_expires_at: new Date(Date.now() + 14400000),
        share_link_revoked: false,
        origin_lat: defaultInput.origin_lat,
        origin_lng: defaultInput.origin_lng,
        origin_address: defaultInput.origin_address,
        destination_lat: defaultInput.destination_lat,
        destination_lng: defaultInput.destination_lng,
        destination_address: defaultInput.destination_address,
        contact_name: 'Alice',
        safety_notes: null,
      };
      TripCreate.mockResolvedValue(mockTrip);
      const result = await service.createTrip(userId, defaultInput);
      expect(TripCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          share_token: expect.stringMatching(/^[0-9a-f]{32}$/),
          status: 'active',
        }),
      );
      expect(result.share_token).toMatch(/^[0-9a-f]{32}$/);
    });

    it('sends notification on trip creation', async () => {
      TripCreate.mockResolvedValue({ id: 'trip-uuid', share_token: 'token123' });
      await service.createTrip(userId, defaultInput);
      const { NotificationService } = await import('./notifications/notification.service');
      const mockInstance = (NotificationService as jest.Mock).mock.results[0].value;
      expect(mockInstance.sendTripStarted).toHaveBeenCalledWith({
        contactName: 'Alice',
        contactPhone: '+2348012345678',
        shareToken: expect.any(String),
        userName: userId,
      });
    });
  });

  describe('listTrips', () => {
    it('returns recent trips ordered by created_at', async () => {
      const mockTrips = [{ id: 't1' }, { id: 't2' }];
      TripFindAll.mockResolvedValue(mockTrips);
      const result = await service.listTrips(userId);
      expect(TripFindAll).toHaveBeenCalledWith({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: 50,
      });
      expect(result).toEqual(mockTrips);
    });
  });

  describe('getActiveTrip', () => {
    it('returns active trip when found', async () => {
      const mockTrip = { id: 't1', status: 'active' };
      TripFindOne.mockResolvedValue(mockTrip);
      const result = await service.getActiveTrip(userId);
      expect(TripFindOne).toHaveBeenCalledWith({
        where: { user_id: userId, status: 'active' },
      });
      expect(result).toEqual(mockTrip);
    });

    it('returns null when no active trip', async () => {
      TripFindOne.mockResolvedValue(null);
      const result = await service.getActiveTrip(userId);
      expect(result).toBeNull();
    });
  });

  describe('getTrip', () => {
    it('returns trip with latest location', async () => {
      const mockTrip = { id: 'trip-id', user_id: userId };
      const mockLocation = { lat: 6.5, lng: 3.3, recorded_at: new Date() };
      TripFindOne.mockResolvedValue(mockTrip);
      TripLocationFindOne.mockResolvedValue(mockLocation);
      const result = await service.getTrip(userId, 'trip-id');
      expect(result.trip).toEqual(mockTrip);
      expect(result.latestLocation).toEqual(mockLocation);
    });

    it('throws 404 when trip not found', async () => {
      TripFindOne.mockResolvedValue(null);
      await expect(service.getTrip(userId, 'nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('endTrip', () => {
    it('marks trip as completed and deletes locations', async () => {
      const savedEndedAt = new Date();
      const mockTrip = {
        id: 'trip-id',
        user_id: userId,
        status: 'active',
        ended_at: savedEndedAt,
        save: jest.fn().mockImplementation(function (this: any) {
          this.status = 'completed';
          this.ended_at = new Date();
          return Promise.resolve();
        }),
      };
      TripFindOne.mockResolvedValue(mockTrip);
      TripLocationDestroy.mockResolvedValue(42);
      const result = await service.endTrip(userId, 'trip-id');
      expect(result.status).toBe('completed');
      expect(result.ended_at).toBeDefined();
      expect(mockTrip.save).toHaveBeenCalled();
      expect(TripLocationDestroy).toHaveBeenCalledWith({ where: { trip_id: 'trip-id' } });
    });

    it('throws 404 when active trip not found', async () => {
      TripFindOne.mockResolvedValue(null);
      await expect(service.endTrip(userId, 'nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
