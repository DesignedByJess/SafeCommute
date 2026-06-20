import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  exp?: number;
  aud?: string;
  role?: string;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
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

  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) throw new UnauthorizedError('Invalid token format');

    const payload: SupabaseJwtPayload = JSON.parse(
      Buffer.from(base64Payload, 'base64').toString('utf-8'),
    );

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return next(new UnauthorizedError('Token has expired'));
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      phone: payload.phone,
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    return next(new UnauthorizedError('Invalid token'));
  }
}
