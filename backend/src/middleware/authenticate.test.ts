jest.mock('../utils/config', () => ({
  env: {
    SUPABASE_JWT_SECRET: 'test-jwt-secret',
    NODE_ENV: 'test',
  },
}));

jest.mock('../utils/jwt', () => ({
  verifyJwt: jest.fn(),
}));

import { authenticate } from './authenticate';
import { UnauthorizedError } from '../utils/errors';
import { verifyJwt } from '../utils/jwt';

const mockVerifyJwt = verifyJwt as jest.Mock;

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
    mockVerifyJwt.mockReturnValueOnce({ sub: 'user-123', email: 'a@b.com', user_metadata: { name: 'Alice' } });
    req.cookies['sb-access-token'] = 'valid-token';
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 'user-123', email: 'a@b.com', name: 'Alice' });
  });

  it('extracts user from Bearer auth header', () => {
    const { req, res, next } = mockReqRes();
    mockVerifyJwt.mockReturnValueOnce({ sub: 'user-456' });
    req.headers.authorization = 'Bearer valid-token';
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 'user-456' });
  });

  it('calls next with UnauthorizedError when no token', () => {
    const { req, res, next } = mockReqRes();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with UnauthorizedError when token expired', () => {
    const { req, res, next } = mockReqRes();
    mockVerifyJwt.mockReturnValueOnce(null);
    req.cookies['sb-access-token'] = 'expired-token';
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next with UnauthorizedError on malformed token', () => {
    const { req, res, next } = mockReqRes();
    mockVerifyJwt.mockReturnValueOnce(null);
    req.cookies['sb-access-token'] = 'bad-token';
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('prefers cookie over auth header when both present', () => {
    const { req, res, next } = mockReqRes();
    mockVerifyJwt.mockReturnValueOnce({ sub: 'cookie-user' });
    req.cookies['sb-access-token'] = 'cookie-token';
    req.headers.authorization = 'Bearer header-token';
    authenticate(req, res, next);
    expect(req.user).toMatchObject({ id: 'cookie-user' });
  });
});
