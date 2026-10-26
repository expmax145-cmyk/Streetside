import { Check, Copy, Heart, Info, MapPin, Star, X, AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useToast, type ToastType } from '@/contexts/ToastContext';

const icons: Record<ToastType, typeof Check> = {
  success: Check,
  info: Info,
  error: AlertCircle,
  favorite: Heart,
  coupon: Copy,
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();
  return (
    <div className="fixed right-4 top-20 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className="animate-slide-in-right flex items-center gap-3 rounded-xl border border-charcoal-200 bg-white px-4 py-3 shadow-card-hover"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                toast.type === 'favorite'
                  ? 'bg-brand-100 text-brand-700'
                  : toast.type === 'error'
                    ? 'bg-danger-100 text-danger-600'
                    : 'bg-success-100 text-success-600'
              }`}
            >
              <Icon size={17} fill={toast.type === 'favorite' ? 'currentColor' : 'none'} />
            </span>
            <p className="flex-1 text-sm font-semibold text-charcoal-800">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-charcoal-400 transition-colors hover:text-charcoal-700"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-gold-500" aria-label={`${rating} out of 5 stars`}>
      <Star size={size} fill="currentColor" />
      <span className="ml-1 font-bold text-charcoal-800">{rating.toFixed(1)}</span>
    </span>
  );
}

export function LocationBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-charcoal-500">
      <MapPin size={13} className="text-brand-600" />
      {children}
    </span>
  );
}
