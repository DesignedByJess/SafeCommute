import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';
import { verifyJwt } from '../utils/jwt';
import { Session } from '../models';

const lastTouchByUser = new Map<string, number>();
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const accessToken = req.cookies?.['sb-access-token'];
    const authHeader = req.headers.authorization;

    let token: string | undefined;

    if (accessToken) {
      token = accessToken;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const payload = await verifyJwt(token);
    if (!payload) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      phone: payload.phone,
      name: payload.user_metadata?.name || undefined,
    };

    const userId = payload.sub;
    const now = Date.now();
    const lastTouch = lastTouchByUser.get(userId) || 0;

    if (now - lastTouch >= TOUCH_INTERVAL_MS) {
      lastTouchByUser.set(userId, now);
      const userAgent = req.headers['user-agent'] || '';
      Session.findOne({
        where: { user_id: userId, user_agent: userAgent },
        order: [['created_at', 'DESC']],
      }).then((session) => {
        if (session) {
          session.last_active_at = new Date();
          session.save().catch(() => {});
          req.sessionId = session.id;
        }
      }).catch(() => {});
    }

    next();
  } catch (err) {
    next(err);
  }
}
