import { useEffect, useState } from 'react';
import { subscribeApi } from '@/services/api';

export function ApiStatus() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only tracks in-flight requests. Errors are surfaced once, globally, by
    // <GlobalApiErrorBanner />.
    //
    // Loading is shown as a thin progress bar at the top and only if a request
    // takes longer than a moment, so quick requests show nothing at all and the
    // page is never blocked by a full-screen overlay.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubLoading = subscribeApi('loading', (d) => {
      const busy = ((d as { count?: number }).count ?? 0) > 0;
      clearTimeout(timer);
      if (busy) timer = setTimeout(() => setLoading(true), 400);
      else setLoading(false);
    });
    return () => {
      clearTimeout(timer);
      unsubLoading();
    };
  }, []);

  if (!loading) return null;
  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-1 overflow-hidden bg-brand-100" role="status" aria-label="Loading">
      <div className="h-full w-1/3 animate-pulse rounded-r-full bg-brand-600" />
    </div>
  );
}
