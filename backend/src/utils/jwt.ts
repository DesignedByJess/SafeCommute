import crypto from 'crypto';
import jwt, { JwtHeader, SigningKeyCallback, VerifyErrors } from 'jsonwebtoken';
import { env } from './config';
import { logger } from '../services/audit.service';

export interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  exp?: number;
  user_metadata?: {
    name?: string;
  };
}

interface JwksKey {
  kid: string;
  alg: string;
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  use?: string;
}

let cachedJwks: { keys: JwksKey[] } | null = null;
let jwksFetchPromise: Promise<{ keys: JwksKey[] }> | null = null;
let lastJwksFetch = 0;
const JWKS_TTL = 3600_000;

async function fetchJwks(): Promise<{ keys: JwksKey[] }> {
  const now = Date.now();
  if (cachedJwks && now - lastJwksFetch < JWKS_TTL) {
    return cachedJwks;
  }
  if (!jwksFetchPromise) {
    jwksFetchPromise = (async () => {
      try {
        const url = `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`JWKS fetch failed: ${res.status}`);
        }
        const jwks = await res.json() as { keys: JwksKey[] };
        cachedJwks = jwks;
        lastJwksFetch = now;
        return jwks;
      } finally {
        jwksFetchPromise = null;
      }
    })();
  }
  return jwksFetchPromise;
}

function verifyHS256(headerB64: string, payloadB64: string, signatureB64: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', env.SUPABASE_JWT_SECRET);
    hmac.update(`${headerB64}.${payloadB64}`);
    const computedSignatureB64 = hmac.digest('base64url');

    if (computedSignatureB64.length !== signatureB64.length) return false;
    let result = 0;
    for (let i = 0; i < computedSignatureB64.length; i++) {
      result |= computedSignatureB64.charCodeAt(i) ^ signatureB64.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

function verifyES256(token: string): Promise<boolean> {
  return new Promise((resolve) => {
    jwt.verify(
      token,
      (header: JwtHeader, callback: SigningKeyCallback) => {
        const kid = header.kid;
        if (!kid) {
          return callback(new Error('No kid in JWT header'));
        }

        fetchJwks()
          .then((jwks) => {
            const key = jwks.keys.find((k) => k.kid === kid);
            if (!key) {
              return callback(new Error(`Key not found for kid: ${kid}`));
            }

            if (key.kty !== 'EC' || !key.crv || !key.x || !key.y) {
              return callback(new Error(`Unsupported JWK key type: ${key.kty}`));
            }

            const publicKey = crypto.createPublicKey({
              key: { kty: key.kty, crv: key.crv, x: key.x, y: key.y },
              format: 'jwk',
            });

            callback(null, publicKey);
          })
          .catch((err) => callback(err));
      },
      { algorithms: ['ES256'] },
      (err: VerifyErrors | null, decoded: string | jwt.JwtPayload | undefined) => {
        resolve(!err && !!decoded);
      },
    );
  });
}

export async function verifyJwt(token: string): Promise<SupabaseJwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(
      Buffer.from(headerB64, 'base64url').toString('utf8'),
    ) as { alg?: string };

    const algorithm = header.alg;

    if (algorithm === 'HS256') {
      if (!verifyHS256(headerB64, payloadB64, signatureB64)) return null;
    } else if (algorithm === 'ES256') {
      if (!(await verifyES256(token))) return null;
    } else {
      logger.warn('Unsupported JWT algorithm', { algorithm });
      return null;
    }

    const payload: SupabaseJwtPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    );

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
