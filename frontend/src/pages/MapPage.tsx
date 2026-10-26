import { useState, useMemo } from 'react';
import { Map as MapIcon, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { SmartMap } from '@/components/SmartMap';
import { CategoryPills } from '@/components/CategoryPills';
import { RatingStars } from '@/components/ToastContainer';
import { formatDistance, vendorIsOpenNow } from '@/lib/format';

export function MapPage() {
  const { vendors, remoteLoading, remoteError, reloadVendors } = useData();
  const [activeCat, setActiveCat] = useState('All');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const filtered = useMemo(() => {
    if (activeCat === 'All') return vendors;
    return vendors.filter((v) => v.categories.includes(activeCat as typeof v.categories[number]));
  }, [activeCat, vendors]);

  return (
    <div className="container-app py-6 md:py-10">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><MapIcon size={26} className="text-brand-600" /> Food map</h1>
        <p className="page-subtitle">Explore all vendors on the map. Click a marker for details.</p>
      </div>

      <div className="mb-4">
        {remoteLoading && <div className="mb-3 rounded-xl border border-charcoal-200 bg-white p-2 text-sm text-charcoal-600 shadow-soft">Refreshing vendor data…</div>}
        {remoteError && <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-danger-100 bg-danger-50 p-2 text-sm text-danger-700">Unable to load latest vendors. <button onClick={() => reloadVendors()} className="btn-sm btn-primary">Retry</button></div>}
        <CategoryPills active={activeCat} onSelect={setActiveCat} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <SmartMap vendors={filtered} selectedId={selectedId} onSelect={setSelectedId} />
        <div className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto lg:scrollbar-thin">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-charcoal-800"><List size={16} /> {filtered.length} vendors</p>
          {filtered.map((v) => (
            <div
              key={v.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(v.id === selectedId ? undefined : v.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(v.id === selectedId ? undefined : v.id); } }}
              className={`w-full cursor-pointer rounded-xl border p-3 text-left transition-all ${selectedId === v.id ? 'border-brand-500 bg-brand-50 shadow-card' : 'border-charcoal-200 bg-white shadow-soft hover:border-brand-300'}`}
            >
              <div className="flex gap-3">
                <img src={v.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate font-bold text-charcoal-900">{v.name}</h4>
                    <RatingStars rating={v.rating} size={12} />
                  </div>
                  <p className="truncate text-xs text-charcoal-500">{v.cuisine} · {v.location.area}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className={vendorIsOpenNow(v) ? 'text-success-600 font-semibold' : 'text-danger-500 font-semibold'}>{vendorIsOpenNow(v) ? 'Open' : 'Closed'}</span>
                    <span className="text-charcoal-400">·</span>
                    {v.distance !== undefined && <span className="text-charcoal-400">{formatDistance(v.distance)}</span>}
                  </div>
                </div>
              </div>
              {/* A real <Link> nested inside the card's own clickable role
                  (previously a <button>) is invalid HTML — two nested
                  interactive elements confuse keyboard/screen-reader
                  navigation. The outer container is now a div with its
                  own role="button" for select-on-map, and this remains
                  the one real interactive anchor for navigation. */}
              <Link to={`/vendor/${v.id}`} onClick={(e) => e.stopPropagation()} className="mt-2 block text-center text-xs font-semibold text-brand-600 hover:text-brand-700">View details</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
