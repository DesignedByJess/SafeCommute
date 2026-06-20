import { AppError, NotFoundError, UnauthorizedError, ForbiddenError, ShareLinkExpiredError, RateLimitError, ValidationError } from './errors';

describe('AppError', () => {
  it('creates with default values', () => {
    const err = new AppError('test');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('test');
    expect(err.name).toBe('AppError');
  });

  it('creates with custom status and code', () => {
    const err = new AppError('custom', 418, 'TEAPOT');
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('TEAPOT');
    expect(err.message).toBe('custom');
  });
});

describe('NotFoundError', () => {
  it('has correct status and code', () => {
    const err = new NotFoundError('Trip');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Trip not found');
  });

  it('uses default resource name', () => {
    const err = new NotFoundError();
    expect(err.message).toBe('Resource not found');
  });
});

describe('UnauthorizedError', () => {
  it('has correct status and code', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Authentication required');
  });

  it('accepts custom message', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('has correct status and code', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });
});

describe('ShareLinkExpiredError', () => {
  it('has correct status and code', () => {
    const err = new ShareLinkExpiredError();
    expect(err.statusCode).toBe(410);
    expect(err.code).toBe('SHARE_LINK_EXPIRED');
    expect(err.message).toBe('Share link has expired');
  });
});

describe('RateLimitError', () => {
  it('has correct status and code', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMITED');
  });
});

describe('ValidationError', () => {
  it('has correct status and code', () => {
    const err = new ValidationError('invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('invalid input');
  });
});
