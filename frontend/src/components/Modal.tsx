import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-charcoal-900/55 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-t-3xl border border-brand-900/10 bg-gradient-to-b from-white to-cream-100 p-6 shadow-card-hover scrollbar-thin animate-scale-in sm:rounded-2xl`}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-charcoal-400 transition-colors hover:bg-charcoal-100 hover:text-charcoal-800"
        >
          <X size={20} />
        </button>
        {title && <h2 className="mb-4 pr-8 text-xl font-bold text-charcoal-900">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
