import UAParser from 'ua-parser-js';
import { Session } from '../models';
import { AppError, NotFoundError } from '../utils/errors';
import { logger } from './audit.service';
import { Op } from 'sequelize';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UAConstructor = UAParser as any;

function parseUserAgent(ua: string | null): { name: string; type: 'mobile' | 'desktop' } {
  if (!ua) return { name: 'Unknown Browser', type: 'desktop' };

  const parser = new UAConstructor(ua);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  const isMobile = device.type === 'mobile' || device.type === 'tablet';
  const browserName = browser.name || 'Browser';
  const osName = os.name || 'Unknown OS';

  return {
    name: `${browserName} on ${osName}`,
    type: isMobile ? 'mobile' : 'desktop',
  };
}

export interface SessionResponse {
  id: string;
  name: string;
  type: 'mobile' | 'desktop';
  ip: string;
  lastActive: string;
  current: boolean;
}

export class SessionService {
  async createOrUpdate(userId: string, userAgent: string | null, ipAddress: string | null): Promise<Session> {
    const existing = await Session.findOne({
      where: { user_id: userId, user_agent: userAgent || '' },
      order: [['created_at', 'DESC']],
    });

    if (existing) {
      existing.last_active_at = new Date();
      if (ipAddress) existing.ip_address = ipAddress;
      await existing.save();
      return existing;
    }

    return Session.create({
      user_id: userId,
      user_agent: userAgent,
      ip_address: ipAddress,
    });
  }

  async touchSession(sessionId: string): Promise<void> {
    const session = await Session.findByPk(sessionId);
    if (session) {
      session.last_active_at = new Date();
      await session.save();
    }
  }

  async listUserSessions(userId: string, currentSessionId: string): Promise<SessionResponse[]> {
    const sessions = await Session.findAll({
      where: { user_id: userId },
      order: [['last_active_at', 'DESC']],
    });

    return sessions.map((s) => {
      const parsed = parseUserAgent(s.user_agent);
      return {
        id: s.id,
        name: parsed.name,
        type: parsed.type,
        ip: s.ip_address || 'Unknown',
        lastActive: this.formatRelativeTime(s.last_active_at),
        current: s.id === currentSessionId,
      };
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await Session.findByPk(sessionId);
    if (!session) throw new NotFoundError('Session');
    if (session.user_id !== userId) throw new AppError('Access denied', 403, 'FORBIDDEN');

    await session.destroy();
  }

  async deleteAllExcept(userId: string, sessionId: string): Promise<number> {
    return Session.destroy({
      where: {
        user_id: userId,
        id: { [Op.ne]: sessionId },
      },
    });
  }

  async findSessionId(userId: string, userAgent: string | null, ipAddress: string | null): Promise<string | null> {
    const session = await Session.findOne({
      where: { user_id: userId, user_agent: userAgent || '' },
      order: [['created_at', 'DESC']],
    });
    return session?.id || null;
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;

    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}
