jest.mock('../models/pending-payment.model', () => ({
  PendingPayment: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../models/subscription.model', () => ({
  Subscription: {
    upsert: jest.fn(),
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

import { PaymentService } from './payment.service';
import { PendingPayment } from '../models/pending-payment.model';
import { Subscription } from '../models/subscription.model';

const PendingPaymentCreate = PendingPayment.create as jest.Mock;
const PendingPaymentFindOne = PendingPayment.findOne as jest.Mock;
const SubscriptionUpsert = Subscription.upsert as jest.Mock;

describe('PaymentService', () => {
  let service: PaymentService;
  const userId = 'test-user-uuid';
  const userEmail = 'test@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentService();
  });

  describe('initializePayment', () => {
    it('creates pending payment and returns details', async () => {
      PendingPaymentCreate.mockResolvedValueOnce({ id: 'pp-1' });
      process.env.FLUTTERWAVE_PUBLIC_KEY = 'flw-pk-test';
      const result = await service.initializePayment(userId, userEmail, 'premium_monthly');
      expect(PendingPaymentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tx_ref: expect.stringMatching(/^SC-/),
          user_id: userId,
          plan: 'premium_monthly',
          amount: 833,
          currency: 'NGN',
          status: 'pending',
        }),
      );
      expect(result).toEqual({
        tx_ref: expect.stringMatching(/^SC-/),
        amount: 833,
        currency: 'NGN',
        plan: 'premium_monthly',
        public_key: 'flw-pk-test',
      });
    });

    it('throws on invalid plan', async () => {
      await expect(service.initializePayment(userId, userEmail, 'nonexistent')).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_PLAN',
      });
    });

    it('accepts premium_yearly plan', async () => {
      PendingPaymentCreate.mockResolvedValueOnce({});
      const result = await service.initializePayment(userId, userEmail, 'premium_yearly');
      expect(result.amount).toBe(10000);
    });

    it('accepts family_yearly plan', async () => {
      PendingPaymentCreate.mockResolvedValueOnce({});
      const result = await service.initializePayment(userId, userEmail, 'family_yearly');
      expect(result.amount).toBe(15000);
    });
  });

  describe('verifyPayment', () => {
    it('marks payment as completed and creates subscription', async () => {
      const mockPending = {
        tx_ref: 'SC-test-ref',
        user_id: userId,
        plan: 'premium_monthly',
        amount: 833,
        status: 'pending',
        save: jest.fn().mockResolvedValueOnce(undefined),
      };
      PendingPaymentFindOne.mockResolvedValueOnce(mockPending);
      SubscriptionUpsert.mockResolvedValueOnce([{ id: 'sub-1' }, true]);
      const result = await service.verifyPayment('txn-123', 'SC-test-ref');
      expect(SubscriptionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          plan: 'premium_monthly',
          status: 'active',
          tx_ref: 'SC-test-ref',
        }),
      );
      expect(mockPending.status).toBe('completed');
      expect(mockPending.save).toHaveBeenCalled();
      expect(result).toEqual({ verified: true });
    });

    it('throws 404 when pending payment not found', async () => {
      PendingPaymentFindOne.mockResolvedValueOnce(null);
      await expect(service.verifyPayment('txn-123', 'bad-ref')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('throws 400 when already processed', async () => {
      PendingPaymentFindOne.mockResolvedValueOnce({
        tx_ref: 'SC-test-ref',
        status: 'completed',
        save: jest.fn(),
      });
      await expect(service.verifyPayment('txn-123', 'SC-test-ref')).rejects.toMatchObject({
        statusCode: 400,
        code: 'ALREADY_PROCESSED',
      });
    });
  });

  describe('handleWebhook', () => {
    it('processes successful charge.completed event', async () => {
      const mockPending = {
        tx_ref: 'SC-ref',
        user_id: userId,
        plan: 'premium_monthly',
        amount: 833,
        status: 'pending',
        save: jest.fn().mockResolvedValueOnce(undefined),
      };
      PendingPaymentFindOne.mockResolvedValueOnce(mockPending);
      SubscriptionUpsert.mockResolvedValueOnce([{}, true]);
      const payload = {
        event: 'charge.completed',
        data: {
          tx_ref: 'SC-ref',
          amount: 833,
          currency: 'NGN',
          status: 'successful',
        },
      };
      await service.handleWebhook(payload);
      expect(SubscriptionUpsert).toHaveBeenCalled();
      expect(mockPending.status).toBe('completed');
    });

    it('ignores non-charge.completed events', async () => {
      await service.handleWebhook({ event: 'charge.failed' });
      expect(PendingPaymentFindOne).not.toHaveBeenCalled();
    });

    it('ignores unsuccessful charges', async () => {
      await service.handleWebhook({
        event: 'charge.completed',
        data: { status: 'failed', tx_ref: 'SC-ref', amount: 833, currency: 'NGN' },
      });
      expect(PendingPaymentFindOne).not.toHaveBeenCalled();
    });

    it('handles amount mismatch without error', async () => {
      PendingPaymentFindOne.mockResolvedValueOnce({
        tx_ref: 'SC-ref',
        user_id: userId,
        plan: 'premium_monthly',
        amount: 833,
        status: 'pending',
        save: jest.fn(),
      });
      const payload = {
        event: 'charge.completed',
        data: {
          tx_ref: 'SC-ref',
          amount: 100,
          currency: 'NGN',
          status: 'successful',
        },
      };
      await expect(service.handleWebhook(payload)).resolves.toBeUndefined();
    });
  });
});
