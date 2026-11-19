import { useEffect, useState } from 'react';
import { subscribeApi } from '@/services/api';

export function ApiStatus() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only tracks the in-flight request spinner here. Errors are surfaced
    // once, globally, by <GlobalApiErrorBanner /> — subscribing to them
    // again here would show every failed request twice (a banner AND a
    // toast) for the same underlying error.
    const unsubLoading = subscribeApi('loading', (d) => {
      const detail = d as { count?: number };
      setLoading((detail.count ?? 0) > 0);
    });
    return unsubLoading;
  }, []);

  if (!loading) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/25 backdrop-blur-[2px]">
      <div className="flex items-center gap-3 rounded-2xl border border-charcoal-200 bg-white px-5 py-4 shadow-card-hover">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <span className="text-sm font-semibold text-charcoal-800">Loading…</span>
      </div>
    </div>
  );
}
