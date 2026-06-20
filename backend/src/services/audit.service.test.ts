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

jest.mock('../models/audit.model', () => ({
  AuditLog: {
    create: jest.fn(),
  },
}));

import { auditLog } from './audit.service';
import { AuditLog } from '../models/audit.model';

const AuditLogMock = AuditLog.create as jest.Mock;

describe('auditLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes to AuditLog table with correct fields', async () => {
    AuditLogMock.mockResolvedValueOnce({ id: 1 });
    await auditLog('user-1', 'login', { ip: '127.0.0.1' }, '127.0.0.1', 'Chrome');
    expect(AuditLogMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      event_type: 'login',
      event_data: { ip: '127.0.0.1' },
      ip_address: '127.0.0.1',
      user_agent: 'Chrome',
    });
  });

  it('handles null userId', async () => {
    AuditLogMock.mockResolvedValueOnce({ id: 2 });
    await auditLog(null, 'anonymous_event', {});
    expect(AuditLogMock).toHaveBeenCalledWith({
      user_id: null,
      event_type: 'anonymous_event',
      event_data: {},
      ip_address: null,
      user_agent: null,
    });
  });

  it('falls back to logger when DB write fails', async () => {
    const dbError = new Error('Connection lost');
    AuditLogMock.mockRejectedValueOnce(dbError);
    const { logger } = await import('./audit.service');
    await expect(auditLog('user-2', 'test_event', {})).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to write audit log to database',
      expect.objectContaining({ error: dbError, userId: 'user-2', eventType: 'test_event' }),
    );
  });
});
