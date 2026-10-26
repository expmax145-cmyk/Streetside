import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../types/enums';

export interface AccessTokenPayload {
  sub: string; // user id
  role: UserRole;
  vendorId?: string;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  v: number; // refreshTokenVersion at the time this token was issued
}

export function signAccessToken(payload: AccessTokenPayload): string {
  // `as SignOptions['expiresIn']` — @types/jsonwebtoken's expiresIn type
  // has varied between a plain `string` and a narrower ms-style literal
  // type across versions. env.jwtAccessExpiresIn is a validated runtime
  // string ("15m", "7d", etc.) from env.ts; this cast avoids a brittle
  // compile-time coupling to whichever exact type that package version
  // ships, without weakening type-checking anywhere else in this file.
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
}

/**
 * Parses simple duration strings used in env vars ("15m", "7d", "1h",
 * "30s") into milliseconds, for setting the refresh cookie's maxAge to
 * match JWT_REFRESH_EXPIRES_IN. Deliberately not pulling in the `ms`
 * package for one small conversion.
 */
export function durationToMs(duration: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    // Fall back to a safe default (7 days) rather than throwing, since
    // this only affects cookie expiry, not token validity (the JWT's own
    // `exp` claim is still enforced by verifyRefreshToken regardless).
    return 7 * 24 * 60 * 60 * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * unitMs[unit];
}
