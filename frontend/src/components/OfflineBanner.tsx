import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

// (PWA/offline): a small, unmissable-but-not-blocking banner so
// the person knows why data might be stale, rather than silently
// serving cached (potentially outdated) vendor info with no explanation.
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-charcoal-800 px-4 py-2 text-sm font-medium text-cream-100">
      <WifiOff size={15} /> You're offline — showing saved data, which may be out of date.
    </div>
  );
}
