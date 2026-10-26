/**
 * A known, intentional error with an HTTP status code attached — e.g.
 * "vendor not found" (404) or "email already in use" (409). Route
 * handlers throw this and the central error handler turns it into the
 * consistent { success: false, message } response shape.
 *
 * Errors that are NOT an ApiError (a bug, an unexpected exception from a
 * library, etc.) are treated as 500s and their details are not leaked to
 * the client — see middleware/errorHandler.ts.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}
