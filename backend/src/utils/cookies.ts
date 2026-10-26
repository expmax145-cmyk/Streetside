import type { Response } from 'express';
import crypto from 'node:crypto';
import { env, isProduction } from '../config/env';
import { durationToMs } from './jwt';

export const REFRESH_COOKIE_NAME = 'streetside_refresh_token';
// access token moved out of localStorage/response body into a
// second httpOnly cookie. It's no longer readable by JS at all (unlike the
// old scheme where the frontend held it in localStorage and attached it as
// an Authorization header) -- this closes the XSS-can-steal-the-token gap
// documented in SECURITY-AUDIT.md as "Decision 1".
export const ACCESS_COOKIE_NAME = 'streetside_access_token';
// Double-submit CSRF cookie: readable by JS (NOT httpOnly) on purpose --
// the frontend reads it and echoes it back as the X-CSRF-Token header on
// every mutating request. An attacker's cross-site form/script can't read
// this cookie (browser same-origin policy), so it can't forge the header,
// even though the browser will still attach the httpOnly auth cookies to
// a forged cross-site request. See middleware/csrf.middleware.ts.
export const CSRF_COOKIE_NAME = 'streetside_csrf_token';

const cookieBase = {
  secure: isProduction, // must be true if sameSite is 'none'
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
};

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...cookieBase,
    httpOnly: true,
    path: '/api/auth',
    maxAge: durationToMs(env.jwtRefreshExpiresIn),
  });
}

export function setAccessCookie(res: Response, token: string) {
  res.cookie(ACCESS_COOKIE_NAME, token, {
    ...cookieBase,
    httpOnly: true,
    path: '/',
    maxAge: durationToMs(env.jwtAccessExpiresIn),
  });
}

/**
 * Issues (or re-issues) the CSRF cookie. Called alongside the auth cookies
 * on login/register/refresh so the frontend always has a fresh token
 * to echo back. Not httpOnly -- the frontend JS must be able to read it.
 */
export function setCsrfCookie(res: Response): string {
  const csrfToken = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    ...cookieBase,
    httpOnly: false,
    path: '/',
    maxAge: durationToMs(env.jwtRefreshExpiresIn),
  });
  return csrfToken;
}

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  setRefreshCookie(res, tokens.refreshToken);
  setAccessCookie(res, tokens.accessToken);
  setCsrfCookie(res);
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...cookieBase, httpOnly: true, path: '/api/auth' });
  res.clearCookie(ACCESS_COOKIE_NAME, { ...cookieBase, httpOnly: true, path: '/' });
  res.clearCookie(CSRF_COOKIE_NAME, { ...cookieBase, httpOnly: false, path: '/' });
}

// Kept for any remaining direct callers/tests referencing the old name.
export const clearRefreshCookie = clearAuthCookies;
