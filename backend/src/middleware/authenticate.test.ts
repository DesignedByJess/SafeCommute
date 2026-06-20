import { authenticate } from './authenticate';
import { UnauthorizedError } from '../utils/errors';

function makeToken(payload: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `header.${b64}.signature`;
}

function mockReqRes() {
  const req: any = { cookies: {}, headers: {} };
  const res: any = {};
  const next = jest.fn();
  return { req, res, next };
}

describe('authenticate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts user from cookie token', () => {
    const { req, res, next } = mockReqRes();
    const token = makeToken({ sub: 'user-123', email: 'a@b.com', exp: Math.floor(Date.now() / 1000) + 3600 });
    req.cookies['sb-access-token'] = token;
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'user-123', email: 'a@b.com' });
  });

  it('extracts user from Bearer auth header', () => {
    const { req, res, next } = mockReqRes();
    const token = makeToken({ sub: 'user-456', exp: Math.floor(Date.now() / 1000) + 3600 });
    req.headers.authorization = `Bearer ${token}`;
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'user-456' });
  });

  it('calls next with UnauthorizedError when no token', () => {
    const { req, res, next } = mockReqRes();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with UnauthorizedError when token expired', () => {
    const { req, res, next } = mockReqRes();
    const token = makeToken({ sub: 'user-789', exp: Math.floor(Date.now() / 1000) - 60 });
    req.cookies['sb-access-token'] = token;
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with UnauthorizedError on malformed token', () => {
    const { req, res, next } = mockReqRes();
    req.cookies['sb-access-token'] = 'not-a-jwt';
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('prefers cookie over auth header when both present', () => {
    const { req, res, next } = mockReqRes();
    const cookieToken = makeToken({ sub: 'cookie-user', exp: Math.floor(Date.now() / 1000) + 3600 });
    const headerToken = makeToken({ sub: 'header-user', exp: Math.floor(Date.now() / 1000) + 3600 });
    req.cookies['sb-access-token'] = cookieToken;
    req.headers.authorization = `Bearer ${headerToken}`;
    authenticate(req, res, next);
    expect(req.user).toEqual({ id: 'cookie-user' });
  });
});
