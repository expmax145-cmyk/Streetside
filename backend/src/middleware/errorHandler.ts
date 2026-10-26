import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { isProduction } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Central error handler with correct 4xx status codes.
 * - Malformed JSON (body-parser SyntaxError) → 400
 * - Body too large → 413
 * - CORS origin rejected → 403
 * - Any error with a numeric 4xx status → preserve that status
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (isMongoDuplicateKeyError(err)) {
    statusCode = 409;
    const field = Object.keys((err as { keyValue?: Record<string, unknown> }).keyValue || {})[0];
    message = field ? `${field} already in use` : 'Duplicate value';
  } else if (isJwtError(err)) {
    statusCode = 401;
    message = 'Invalid or expired token';
  } else if (err instanceof SyntaxError && 'body' in err) {
    // express body-parser sends SyntaxError with a 'body' property
    // for malformed JSON — must be caught before the generic Error branch
    statusCode = 400;
    message = 'Malformed JSON body';
  } else if (isBodyParserError(err)) {
    // body-parser sets err.status/err.statusCode for known errors
    // (413 for body-too-large, 400 for bad encoding, etc.)
    const code = (err as { status?: number; statusCode?: number }).status
      ?? (err as { status?: number; statusCode?: number }).statusCode
      ?? 500;
    statusCode = code >= 400 && code < 600 ? code : 500;
    message = statusCode === 413
      ? 'Request body too large'
      : statusCode === 400
        ? 'Bad request'
        : 'Internal server error';
  } else if (isCorsError(err)) {
    // CORS rejection should be 403, not 500
    statusCode = 403;
    message = 'Origin not allowed';
  } else if (err instanceof Error) {
    message = isProduction ? 'Internal server error' : err.message;
  }

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details !== undefined ? { details } : {}),
    ...(!isProduction && err instanceof Error && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}

function isMongoDuplicateKeyError(err: unknown): err is { code: number; keyValue?: Record<string, unknown> } {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

function isJwtError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError')
  );
}

function isBodyParserError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { status?: number; statusCode?: number; type?: string };
  // body-parser sets a numeric status and a type like 'entity.too.large', 'entity.parse.failed'
  const hasNumericStatus = typeof e.status === 'number' || typeof e.statusCode === 'number';
  const hasBodyParserType = typeof e.type === 'string' && e.type.startsWith('entity.');
  return hasNumericStatus && hasBodyParserType;
}

function isCorsError(err: unknown): boolean {
  return err instanceof Error && err.message === 'Not allowed by CORS';
}
