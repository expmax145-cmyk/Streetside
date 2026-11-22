import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Clock, MapPin, Loader2 } from 'lucide-react';
import { VendorCard, VendorCardSkeleton } from '@/components/VendorCard';
import { CategoryPills } from '@/components/CategoryPills';
import { Modal } from '@/components/Modal';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useInfiniteVendors, type VendorFilters } from '@/hooks/useInfiniteVendors';
import type { Vendor } from '@/types';

type SortBy = 'popularity' | 'rating' | 'distance' | 'price-low' | 'price-high';

// this page now paginates and filters server-side via
// useInfiniteVendors (see that hook's docstring for why SearchPage keeps
// its own, separately-sourced full-list fuzzy search instead).
export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCat, setActiveCat] = useState(searchParams.get('cat') || 'All');
  const [sortBy, setSortBy] = useState<SortBy>('popularity');
  const [showFilters, setShowFilters] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [maxDistance, setMaxDistance] = useState(10);

  const { location: userLocation, status: locationStatus, requestLocation } = useUserLocation();
  const hasLocation = locationStatus === 'granted' && userLocation !== null;

  const filters: VendorFilters = useMemo(() => ({
    category: activeCat,
    veg: vegOnly,
    openNow: openOnly,
    sort: sortBy,
    userLat: hasLocation ? userLocation!.lat : undefined,
    userLng: hasLocation ? userLocation!.lng : undefined,
    // Only sent once we actually know the distance — see the note on
    // 's ExplorePage history: filtering by an unknown distance
    // must never silently exclude every vendor.
    maxDistanceKm: hasLocation && maxDistance < 10 ? maxDistance : undefined,
  }), [activeCat, vegOnly, openOnly, sortBy, hasLocation, userLocation, maxDistance]);

  const { vendors, total, loading, loadingMore, hasMore, error, sentinelRef, retry } = useInfiniteVendors(filters);

  const handleCatSelect = (cat: string) => {
    setActiveCat(cat);
    if (cat === 'All') setSearchParams({});
    else setSearchParams({ cat });
  };

  const handleSortChange = (value: SortBy) => {
    setSortBy(value);
    if (value === 'distance' && !hasLocation && locationStatus !== 'denied') {
      requestLocation();
    }
  };

  /**
   * Vendor profile photos represent each vendor's own signature dish,
   * not whichever category the person is currently browsing — so
   * filtering by "Dosa" could show a vendor's filter-coffee photo even
   * though they do serve dosa. While browsing a specific category,
   * swap in a photo of a menu item that actually matches it.
   */
  const categoryImage = (vendor: Vendor): string | undefined => {
    if (activeCat === 'All') return undefined;
    return vendor.menu.find((item) => item.category === activeCat)?.image;
  };

  return (
    <div className="container-app py-6 md:py-10">
      <div className="page-header">
        <h1 className="page-title">Explore vendors</h1>
        <p className="page-subtitle">{loading ? 'Loading vendors…' : `${total} street food vendors in your area`}</p>
      </div>

      <div className="mb-6 space-y-4">
        {error && (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-danger-100 bg-danger-50 p-2.5 text-sm text-danger-700">
            <div>Unable to load vendors.</div>
            <button onClick={retry} className="btn-sm btn-primary">Retry</button>
          </div>
        )}
        <CategoryPills active={activeCat} onSelect={handleCatSelect} />
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setShowFilters(true)} className="btn-secondary shrink-0">
            <SlidersHorizontal size={16} /> Filters
            {(vegOnly || openOnly || (hasLocation && maxDistance < 10)) && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">{(vegOnly ? 1 : 0) + (openOnly ? 1 : 0) + (hasLocation && maxDistance < 10 ? 1 : 0)}</span>}
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden text-sm text-charcoal-500 sm:inline">Sort by</span>
            <select value={sortBy} onChange={(e) => handleSortChange(e.target.value as SortBy)} className="min-w-0 max-w-full rounded-xl border border-charcoal-200 bg-white px-3 py-2 text-sm font-semibold text-charcoal-700 shadow-soft focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
              <option value="popularity">Popularity</option>
              <option value="rating">Rating</option>
              <option value="distance">Distance{!hasLocation ? ' (needs location)' : ''}</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <VendorCardSkeleton key={i} />)}
        </div>
      ) : vendors.length === 0 ? (
        <div className="empty-state">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-charcoal-100"><X size={28} className="text-charcoal-400" /></div>
          <h3 className="mb-1 text-lg font-bold text-charcoal-900">No vendors found</h3>
          <p className="mb-4 text-sm text-charcoal-500">Try adjusting your filters or search area</p>
          <button onClick={() => { setActiveCat('All'); setVegOnly(false); setOpenOnly(false); setMaxDistance(10); }} className="btn-primary">Clear filters</button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-charcoal-500">{total} {total === 1 ? 'vendor' : 'vendors'} found</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {vendors.map((v, i) => <VendorCard key={v.id} vendor={v} index={i} imageOverride={categoryImage(v)} />)}
          </div>
          {/* sentinel div — scrolling this into view loads
              the next page automatically (see useInfiniteVendors). */}
          <div ref={sentinelRef} className="mt-6 flex items-center justify-center py-4">
            {loadingMore && <span className="flex items-center gap-2 text-sm text-charcoal-500"><Loader2 size={16} className="animate-spin" /> Loading more…</span>}
            {!hasMore && vendors.length > 0 && <span className="text-sm text-charcoal-400">You've reached the end</span>}
          </div>
        </>
      )}

      <Modal open={showFilters} onClose={() => setShowFilters(false)} title="Filters">
        <div className="space-y-5">
          <div>
            <h4 className="mb-3 font-semibold text-charcoal-800">Dietary</h4>
            <label className="flex items-center justify-between rounded-xl border border-charcoal-200 p-3 cursor-pointer hover:bg-cream-100">
              <span className="flex items-center gap-2 text-sm font-medium"><span className="h-4 w-4 rounded border-2 border-success-500 flex items-center justify-center"><span className="h-2 w-2 rounded-sm bg-success-500" /></span> Vegetarian only</span>
              <input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} className="h-5 w-5 accent-brand-500" />
            </label>
          </div>
          <div>
            <label className="flex items-center justify-between rounded-xl border border-charcoal-200 p-3 cursor-pointer hover:bg-cream-100">
              <span className="flex items-center gap-2 text-sm font-medium"><Clock size={16} className="text-success-500" /> Open now</span>
              <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="h-5 w-5 accent-brand-500" />
            </label>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-charcoal-800">Max distance: {maxDistance} km</h4>
            {hasLocation ? (
              <>
                <input type="range" min="1" max="10" value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))} className="w-full accent-brand-500" />
                <div className="flex justify-between text-xs text-charcoal-400"><span>1 km</span><span>10 km</span></div>
              </>
            ) : (
              <button
                onClick={requestLocation}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-charcoal-300 p-3 text-sm font-medium text-charcoal-500 hover:border-brand-400 hover:text-brand-600"
              >
                <MapPin size={16} />
                {locationStatus === 'denied' ? 'Location access denied — enable it in your browser settings' : 'Enable location to filter by distance'}
              </button>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setVegOnly(false); setOpenOnly(false); setMaxDistance(10); }} className="btn-secondary flex-1">Reset</button>
            <button onClick={() => setShowFilters(false)} className="btn-primary flex-1">Apply filters</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
