import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { VendorCard, VendorCardSkeleton } from '@/components/VendorCard';
import { SearchBar } from '@/components/SearchBar';
import { loadFromStorage, saveToStorage } from '@/lib/storage';
import { searchVendors } from '@/lib/searchVendors';

const MAX_RECENT_SEARCHES = 6;

export function SearchPage() {
  const { vendors, remoteLoading, remoteError, reloadVendors } = useData();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadFromStorage<string[]>('recent_searches', []));

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT_SEARCHES);
      saveToStorage('recent_searches', next);
      return next;
    });
  }, [query, vendors]);

  // Ranked, multi-field search (name, cuisine, description, specialties,
  // menu item names) — see src/lib/searchVendors.ts for how matching and
  // ranking work.
  const results = useMemo(() => searchVendors(vendors, query), [query, vendors]);

  const suggestions = ['Biryani', 'Dosa', 'Momos', 'Chaat', 'Shawarma', 'Burgers', 'Desserts', 'Coffee'];

  return (
    <div className="container-app py-6 md:py-10">
      <div className="page-header">
        <h1 className="page-title mb-4">Search</h1>
        {remoteLoading && <div className="mb-2 rounded-xl border border-charcoal-200 bg-white p-2 text-sm text-charcoal-600 shadow-soft">Refreshing vendor data…</div>}
        {remoteError && <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-danger-100 bg-danger-50 p-2 text-sm text-danger-700">Unable to load latest vendors. <button onClick={() => reloadVendors()} className="btn-sm btn-primary">Retry</button></div>}
        <SearchBar initialQuery={query} />
      </div>

      {!query.trim() ? (
        <div>
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-sm font-bold text-charcoal-700">Recent searches</h2>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((s) => (
                  <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className="btn-secondary py-2 text-sm">
                    <SearchIcon size={14} /> {s}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div>
            <h2 className="mb-3 text-sm font-bold text-charcoal-700">Popular searches</h2>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className="rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 hover:border-brand-200">
                  {s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : remoteLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <VendorCardSkeleton key={i} />)}
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-charcoal-100"><X size={28} className="text-charcoal-400" /></div>
          <h3 className="mb-1 text-lg font-bold text-charcoal-800">No results for "{query}"</h3>
          <p className="mb-4 text-sm text-charcoal-500">Try a different keyword or browse categories</p>
          <Link to="/explore" className="btn-primary">Browse all vendors</Link>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-charcoal-500">{results.length} results for "{query}"</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((r, i) => <VendorCard key={r.vendor.id} vendor={r.vendor} index={i} matchedMenuItem={r.matchedMenuItem ?? undefined} />)}
          </div>
        </>
      )}
    </div>
  );
}
