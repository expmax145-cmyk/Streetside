import type { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async route handler so a rejected promise (a thrown error
 * inside an `async` function) is forwarded to next(), instead of crashing
 * the process or hanging the request. Express doesn't do this
 * automatically for async handlers pre-Express-5.
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
