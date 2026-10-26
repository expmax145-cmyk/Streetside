import rateLimit from 'express-rate-limit';

/**
 * Auth routes (login, register, refresh) — tight limit to slow brute force.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});

/**
 * General API limiter — applied to all routes.
 * Default 300 requests/min/IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET', // reads are exempt from the write limiter
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

/**
 * Write limiter — applied to POST/PUT/PATCH/DELETE on
 * mutation routes (reviews, favorites, reports, menu, offers, vendors).
 * Keyed by user id when available, falls back to IP.
 * Default 30 writes/min.
 */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.WRITE_RATE_LIMIT) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Prefer user id (post-auth) to avoid penalising shared IPs
    return (req as Express.Request & { user?: { id: string } }).user?.id ?? req.ip ?? 'unknown';
  },
  skip: (req) => req.method === 'GET',
  message: { success: false, message: 'Too many write requests. Please slow down.' },
});
