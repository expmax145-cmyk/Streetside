import type { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError';

/**
 * Runs after a route's express-validator chains. If any of them failed,
 * throws a single 400 with all validation messages collected — so every
 * validated route gets the same consistent error shape without repeating
 * this check in every controller.
 */
export function validate(req: Request, _res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ('path' in e ? { field: e.path, message: e.msg } : { message: e.msg }));
    return next(ApiError.badRequest('Validation failed', details));
  }
  next();
}
