import type { Response } from 'express';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Sends the app's standard success envelope: { success: true, data, ...}.
 * Errors use the matching { success: false, message } shape — see
 * middleware/errorHandler.ts — so every response from the API has a
 * predictable, documented shape for the frontend to rely on.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: { pagination?: Pagination; message?: string },
) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta?.pagination ? { pagination: meta.pagination } : {}),
    ...(meta?.message ? { message: meta.message } : {}),
  });
}
