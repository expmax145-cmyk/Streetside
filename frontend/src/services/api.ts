const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5001/api';

type RequestOpts = RequestInit & { retry?: boolean };
type ApiPayload = Record<string, unknown>;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

// the access token is no longer readable by JS at all -- it
// lives in an httpOnly cookie set by the backend (see
// backend/src/utils/cookies.ts) and the browser attaches it to every
// request automatically via `credentials: 'include'`. There is nothing
// here to get/set/store: no localStorage, no Authorization header. This
// closes the XSS-can-steal-the-token gap the old localStorage scheme had.
//
// The one thing this frontend DOES read is the CSRF cookie -- which is
// deliberately NOT httpOnly, so it can be echoed back as a header on
// every mutating request (double-submit pattern; see
// backend/src/middleware/csrf.middleware.ts for the full explanation).
const CSRF_COOKIE_NAME = 'streetside_csrf_token';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Single in-flight refresh promise — concurrent 401s share one refresh
let refreshInFlight: Promise<boolean> | null = null;

// Auth routes that should NEVER trigger a refresh-and-retry loop
const SKIP_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function shouldSkipRefresh(path: string): boolean {
  return SKIP_REFRESH_PATHS.some((p) => path.startsWith(p));
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      // no CSRF header on /auth/refresh -- it's in the
      // backend's CSRF_EXEMPT_PATHS list (see csrf.middleware.ts) because
      // it can legitimately fire before the frontend has read a fresh
      // CSRF cookie value in this tab.
      const res = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
      return res.ok;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

const emitter = new EventTarget();
let loadingCount = 0;

function emitLoading() {
  emitter.dispatchEvent(new CustomEvent('loading', { detail: { count: loadingCount } }));
}

function emitError(err: unknown) {
  emitter.dispatchEvent(new CustomEvent('error', { detail: err }));
}

async function request(path: string, opts: RequestOpts = {}): Promise<ApiPayload> {
  loadingCount += 1;
  emitLoading();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const method = (opts.method || 'GET').toUpperCase();
  if (MUTATING_METHODS.has(method) && !shouldSkipRefresh(path)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }

  try {
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, { ...opts, headers, credentials: 'include' });
    } catch {
      throw new ApiError(0, 'Network error — please check your connection and try again.');
    }

    // Only attempt refresh for non-auth routes and only once
    if (res.status === 401 && !opts.retry && !shouldSkipRefresh(path)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request(path, { ...opts, retry: true });
      }
    }

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        (json as { message?: string } | null)?.message ||
        res.statusText ||
        `Request failed (${res.status})`;
      throw new ApiError(res.status, message, json);
    }
    return (json ?? {}) as ApiPayload;
  } catch (err) {
    emitError(err);
    throw err;
  } finally {
    loadingCount = Math.max(0, loadingCount - 1);
    emitLoading();
  }
}

export const api = {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body?: unknown) =>
    request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (path: string, body?: unknown) =>
    request(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: unknown) =>
    request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: (path: string) => request(path, { method: 'DELETE' }),
};

export default api;

export function subscribeApi(eventName: 'loading' | 'error', cb: (detail: unknown) => void) {
  const handler = (e: Event) => cb((e as CustomEvent).detail);
  emitter.addEventListener(eventName, handler as EventListener);
  return () => emitter.removeEventListener(eventName, handler as EventListener);
}
