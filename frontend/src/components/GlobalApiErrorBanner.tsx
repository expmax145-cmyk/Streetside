import { useEffect, useState } from 'react';
import { subscribeApi } from '@/services/api';

type ValidationDetail = { field?: string; message?: string };
type ApiError = { message?: string; status?: number; body?: { message?: string; details?: ValidationDetail[] } };

export function GlobalApiErrorBanner() {
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const unsub = subscribeApi('error', (e) => {
      const detail = (e && typeof e === 'object' ? e : null) as ApiError | null;
      if (detail?.status === 401) return;
      setError(detail);
    });
    return unsub;
  }, []);

  if (!error) return null;

  // express-validator failures come back as one generic top-level message
  // ("Validation failed") plus a `details` array with the actual
  // per-field reasons — show those instead so the person knows what to
  // fix, rather than a message that doesn't say anything actionable.
  const details = error?.body?.details?.map((d) => d.message).filter(Boolean) as string[] | undefined;
  const message = details?.length ? details.join(' ') : error?.message || error?.body?.message || 'A network error occurred';
  // A validation error (400) means the request reached the server and was
  // rejected because of what's in the form — reloading the page would
  // just wipe out everything the person typed, without fixing anything.
  // Reload is only a sensible recovery for network/server failures.
  const isRetryable = error?.status === undefined || error.status >= 500;

  return (
    <div className="fixed left-1/2 top-16 z-50 w-[min(900px,calc(100%-32px))] -translate-x-1/2 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>{message}</div>
        <div className="flex items-center gap-2">
          {isRetryable && (
            <button onClick={() => window.location.reload()} className="btn-sm btn-secondary">
              Retry
            </button>
          )}
          <button onClick={() => setError(null)} className="btn-sm btn-ghost">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
