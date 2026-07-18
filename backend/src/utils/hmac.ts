import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../utils/config';

/**
 * Derive a per-trip HMAC key from the share token.
 * Used by both trips.service.ts (creation) and trip.socket.ts (verification).
 */
export function deriveTripHmacKey(shareToken: string): string {
  return createHmac('sha256', env.HMAC_SECRET)
    .update(shareToken)
    .digest('hex');
}

/**
 * Sign a location payload with the given HMAC key.
 * The payload is JSON.stringify'd before signing.
 */
export function signLocationPayload(
  payload: { tripId: string; lat: number; lng: number; accuracy?: number },
  hmacKey: string,
): string {
  return createHmac('sha256', hmacKey)
    .update(JSON.stringify(payload))
    .digest('hex');
}

/**
 * Verify a location payload signature with timing-safe comparison.
 */
export function verifyLocationSignature(
  payload: { tripId: string; lat: number; lng: number; accuracy?: number },
  signature: string,
  hmacKey: string,
): boolean {
  const expected = signLocationPayload(payload, hmacKey);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}
