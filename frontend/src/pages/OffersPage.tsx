import { Link } from 'react-router-dom';
import { Tag, Clock, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';

export function OffersPage() {
  const { offers, getVendorById, remoteLoading, remoteError, reloadVendors } = useData();
  const { showToast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(code);
      showToast('Coupon code copied', 'coupon');
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {
      showToast('Unable to copy code', 'error');
    });
  };

  return (
    <div className="container-app py-6 md:py-10">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Tag size={26} className="text-brand-600" /> Today's offers</h1>
        <p className="page-subtitle">Exclusive deals and discounts from your favorite vendors</p>
      </div>

      {remoteLoading && <div className="mb-4 rounded-xl border border-charcoal-200 bg-white p-3 text-sm text-charcoal-600 shadow-soft">Refreshing offers & vendors…</div>}
      {remoteError && <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">Unable to load latest offers. <button onClick={() => reloadVendors()} className="btn-sm btn-primary">Retry</button></div>}
      {offers.length === 0 && !remoteLoading ? (
        <div className="empty-state">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 ring-1 ring-brand-100"><Tag size={28} className="text-brand-600" /></div>
          <h3 className="mb-1 text-lg font-bold text-charcoal-900">No offers right now</h3>
          <p className="text-sm text-charcoal-500">Check back later for fresh deals from local vendors</p>
        </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => {
          const vendor = getVendorById(offer.vendorId);
          return (
            <div key={offer.id} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${offer.color} p-5 text-white shadow-card transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-card-hover animate-fade-in-up`}>
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
              <div className="relative">
                <p className="mb-1 text-3xl font-extrabold">{offer.discount}</p>
                <h3 className="mb-1 text-lg font-bold text-white">{offer.title}</h3>
                <p className="mb-4 text-sm text-white/85">{offer.description}</p>
                <div className="mb-3 flex items-center gap-1.5 text-xs text-white/75">
                  <Clock size={12} /> Expires: {offer.expiry}
                </div>
                <p className="mb-4 text-xs text-white/65">{offer.conditions}</p>
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => copyCode(offer.code)}
                    className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 font-mono text-sm font-bold tracking-wider backdrop-blur transition hover:bg-white/30"
                  >
                    {copied === offer.code ? <Check size={16} /> : <Copy size={16} />}
                    {offer.code}
                  </button>
                  {vendor && <Link to={`/vendor/${vendor.id}`} className="text-sm font-semibold text-white/90 underline hover:text-white">{vendor.name}</Link>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
