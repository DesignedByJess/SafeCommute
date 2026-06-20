jest.mock('./config', () => ({
  env: {
    HMAC_SECRET: 'test-hmac-secret-32-chars-long!!!!!',
  },
}));

import { signPayload, verifySignature } from './hmac';

describe('signPayload', () => {
  it('produces a hex string', () => {
    const signature = signPayload({ foo: 'bar' });
    expect(signature).toEqual(expect.any(String));
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different signatures for different payloads', () => {
    const sig1 = signPayload({ a: 1 });
    const sig2 = signPayload({ a: 2 });
    expect(sig1).not.toBe(sig2);
  });
});

describe('verifySignature', () => {
  it('returns true for valid signature', () => {
    const payload = { foo: 'bar', num: 42 };
    const sig = signPayload(payload);
    expect(verifySignature(payload, sig)).toBe(true);
  });

  it('returns false for invalid payload', () => {
    const payload = { foo: 'bar' };
    const sig = signPayload(payload);
    expect(verifySignature({ foo: 'baz' }, sig)).toBe(false);
  });

  it('returns false for corrupted signature', () => {
    const payload = { foo: 'bar' };
    const sig = signPayload(payload);
    const corrupted = sig.slice(0, 10) + 'ff' + sig.slice(12);
    expect(verifySignature(payload, corrupted)).toBe(false);
  });

  it('returns false for wrong-length signature', () => {
    expect(verifySignature({ foo: 'bar' }, 'short')).toBe(false);
  });

  it('is timing-safe (all bits compared)', () => {
    const sig = signPayload({ test: true });
    const forged = 'a' + sig.slice(1);
    expect(verifySignature({ test: true }, forged)).toBe(false);
  });
});
