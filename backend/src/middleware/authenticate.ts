import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';
import { verifyJwt } from '../utils/jwt';

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

    next();
  } catch (err) {
    next(err);
  }
}
