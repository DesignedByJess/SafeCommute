import { createHmac } from 'crypto';
import { env } from '../utils/config';

export function signPayload(payload: Record<string, unknown>): string {
  return createHmac('sha256', env.HMAC_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
}

export function verifySignature(payload: Record<string, unknown>, signature: string): boolean {
  const expected = signPayload(payload);
  if (expected.length !== signature.length) return false;
  return cryptoTimingSafeEqual(expected, signature);
}

function cryptoTimingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
