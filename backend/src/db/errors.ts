/**
 * Database error types. These keep the shapes the rest of the API already
 * relies on (a numeric `code === 11000` for "duplicate key", a validation
 * error carrying per-field messages) so services and the central error
 * handler don't need to know which database sits underneath.
 */

export class ValidationError extends Error {
  errors: Record<string, { message: string; path: string }>;

  constructor(errors: Record<string, string>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = Object.fromEntries(
      Object.entries(errors).map(([path, message]) => [path, { message, path }]),
    );
  }
}

export class CastError extends Error {
  path: string;
  value: unknown;

  constructor(path: string, value: unknown) {
    super(`Invalid ${path}: ${String(value)}`);
    this.name = 'CastError';
    this.path = path;
    this.value = value;
  }
}

export class DuplicateKeyError extends Error {
  code = 11000;
  keyValue: Record<string, unknown>;

  constructor(keyValue: Record<string, unknown>) {
    super('Duplicate value');
    this.name = 'DuplicateKeyError';
    this.keyValue = keyValue;
  }
}

interface PgLikeError {
  code?: string;
  detail?: string;
  message?: string;
  column?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Maps Postgres error codes onto the error types above. Unknown errors pass through. */
export function translateDbError(err: unknown): unknown {
  const e = err as PgLikeError;
  if (!e || typeof e !== 'object' || typeof e.code !== 'string') return err;

  switch (e.code) {
    case '23505': {
      // detail: Key (user_id, vendor_id)=(a, b) already exists.
      const m = /Key \((.+?)\)=\((.+?)\) already exists/.exec(e.detail ?? '');
      const keyValue: Record<string, unknown> = {};
      if (m) {
        const cols = m[1].split(',').map((s) => s.trim());
        const vals = m[2].split(',').map((s) => s.trim());
        cols.forEach((c, i) => {
          keyValue[c] = vals[i];
        });
      }
      return new DuplicateKeyError(keyValue);
    }
    case '23503':
      return new ValidationError({ reference: 'A referenced record does not exist' });
    case '23502':
      return new ValidationError({ [e.column ?? 'field']: `Path \`${e.column ?? 'field'}\` is required.` });
    case '23514':
      return new ValidationError({ value: 'A value is out of the allowed range' });
    case '22P02':
      return new CastError('id', 'invalid value');
    default:
      return err;
  }
}
