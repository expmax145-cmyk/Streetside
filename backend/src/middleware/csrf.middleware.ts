import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { CSRF_COOKIE_NAME, ACCESS_COOKIE_NAME } from '../utils/cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Endpoints reachable before any session exists (no CSRF cookie has been
// issued yet), or that are already protected by their own single-use
// token in the request body (password reset, email verification).
const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
]);

/**
 * Double-submit CSRF check.
 *
 * Now that the access token lives in an httpOnly cookie, the browser
 * attaches it automatically to ANY request to this origin -- including
 * one triggered by a malicious third-party page. Without this check, that
 * third-party page could silently issue authenticated POST/PUT/DELETE
 * requests on the logged-in user's behalf (classic CSRF).
 *
 * Defense: the CSRF cookie is NOT httpOnly, so only JS running on our own
 * origin can read it (browser same-origin policy blocks a third-party
 * page from reading our cookies). Genuine frontend requests read the
 * cookie and echo it in the X-CSRF-Token header; a forged cross-site
 * request has the auth cookies but can't produce a matching header.
 *
 * IMPORTANT scope note: this check only applies when the request is
 * actually authenticated via the access-token COOKIE. A request
 * authenticated via a manually-attached `Authorization: Bearer` header
 * (API clients, mobile apps, and this project's own test suite, which
 * synthesizes tokens directly rather than going through the cookie-based
 * browser login flow) is not vulnerable to CSRF in the first place --
 * a malicious page cannot make the victim's browser attach a header it
 * never automatically attaches, only cookies. Enforcing CSRF on
 * Bearer-authenticated requests would protect against a threat that
 * doesn't exist for that auth method while breaking every non-browser
 * client, so it's correctly out of scope here, not an oversight.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method) || CSRF_EXEMPT_PATHS.has(req.path)) return next();

  // Only cookie-authenticated requests are in CSRF's threat model (see
  // docstring above) — a Bearer-header request never reaches this branch.
  const usesCookieAuth = Boolean(req.cookies?.[ACCESS_COOKIE_NAME]);
  if (!usesCookieAuth) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(ApiError.forbidden('Missing or invalid CSRF token'));
  }
  next();
}
