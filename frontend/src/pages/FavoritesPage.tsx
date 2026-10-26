import { Link } from 'react-router-dom';
import { Heart, Trash2, Utensils } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { VendorCard } from '@/components/VendorCard';

export function FavoritesPage() {
  const { vendors, remoteLoading, remoteError, reloadVendors } = useData();
  const { favoriteVendorIds, removeFavorite } = useFavorites();
  const favVendors = vendors.filter((v) => favoriteVendorIds.includes(v.id));

  return (
    <div className="container-app py-6 md:py-10">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Heart size={26} className="text-brand-600" fill="currentColor" /> Your favorites</h1>
        <p className="page-subtitle">{favVendors.length} saved {favVendors.length === 1 ? 'vendor' : 'vendors'}</p>
      </div>

      {remoteLoading && <div className="mb-4 rounded-xl border border-charcoal-200 bg-white p-3 text-sm text-charcoal-600 shadow-soft">Refreshing vendor data…</div>}
      {remoteError && <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">Unable to load latest vendors. <button onClick={() => reloadVendors()} className="btn-sm btn-primary">Retry</button></div>}

      {favVendors.length === 0 ? (
        <div className="empty-state">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 ring-1 ring-brand-100"><Heart size={28} className="text-brand-600" /></div>
          <h3 className="mb-1 text-lg font-bold text-charcoal-900">No favorites yet</h3>
          <p className="mb-4 text-sm text-charcoal-500">Tap the heart icon on any vendor to save them here</p>
          <Link to="/explore" className="btn-primary"><Utensils size={16} /> Browse vendors</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {favVendors.map((v, i) => (
            <div key={v.id} className="relative">
              <VendorCard vendor={v} index={i} />
              <button
                onClick={() => removeFavorite(v.id)}
                aria-label={`Remove ${v.name} from favorites`}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-charcoal-400 backdrop-blur hover:text-danger-500"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
