import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User.model';
import { ACCESS_COOKIE_NAME } from '../utils/cookies';
import type { UserRole } from '../types/enums';

/**
 * reads the access token from the httpOnly cookie first
 * (the primary path now that the frontend no longer holds it in
 * localStorage), falling back to a Bearer header for non-browser API
 * clients. Verifies the JWT, then RE-LOADS the user's current status and
 * role from the database before attaching to req.user.
 */
function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  return null;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next(ApiError.unauthorized('Not authenticated'));
  }

  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(ApiError.unauthorized('Invalid or expired access token'));
  }

  try {
    // Load current role and status from DB — never trust token claims alone
    const dbUser = await User.findById(payload.sub).select('status role vendor').lean();
    if (!dbUser) {
      return next(ApiError.unauthorized('User no longer exists'));
    }
    // immediate 403 for suspended accounts
    if (dbUser.status === 'suspended') {
      return next(ApiError.forbidden('This account has been suspended. Contact support for help.'));
    }
    req.user = {
      id: String(dbUser._id),
      role: dbUser.role as UserRole,
      vendorId: dbUser.vendor ? String(dbUser.vendor) : undefined,
    };
    next();
  } catch {
    next(ApiError.internal('Could not verify session'));
  }
}

export function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      // For optional-auth routes we skip the DB call for performance;
      // these routes never make privileged mutations so stale role is OK.
      req.user = { id: payload.sub, role: payload.role, vendorId: payload.vendorId };
    } catch {
      // Invalid/expired — treat as anonymous
    }
  }
  next();
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}
