import { useCallback, useEffect, useRef, useState } from 'react';
import * as vendorService from '@/services/vendorService';
import type { Vendor } from '@/types';

export interface VendorFilters {
  search?: string;
  category?: string;
  veg?: boolean;
  openNow?: boolean;
  sort?: 'popularity' | 'rating' | 'distance' | 'price-low' | 'price-high';
  userLat?: number;
  userLng?: number;
  maxDistanceKm?: number;
}

const PAGE_SIZE = 20;

function buildQuery(filters: VendorFilters, page: number): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(PAGE_SIZE));
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.veg) params.set('vegOnly', 'true');
  if (filters.openNow) params.set('openNow', 'true');
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.userLat !== undefined) params.set('userLat', String(filters.userLat));
  if (filters.userLng !== undefined) params.set('userLng', String(filters.userLng));
  if (filters.maxDistanceKm !== undefined) params.set('maxDistanceKm', String(filters.maxDistanceKm));
  return params.toString();
}

/**
 * server-side pagination + infinite scroll for the Explore
 * page, replacing the "load every vendor page up front" approach in
 * DataContext (fine at the seed data's scale of ~20 vendors, but not
 * something that should still be true once there are hundreds).
 *
 * Filtering, sorting, and category/veg/open-now/distance queries are all
 * sent to the server (see backend/src/services/vendor.service.ts
 * listVendors, which already supported all of these params) instead of
 * being computed over a fully-loaded client-side array.
 *
 * DataContext.vendors is intentionally left as-is for the features that
 * genuinely need the full list client-side: the fuzzy search on
 * SearchPage (which ranks by matching menu items, something a DB query
 * can't replicate) and "similar vendors" lookups. This hook is scoped to
 * Explore's own browsing/filtering UI.
 */
export function useInfiniteVendors(filters: VendorFilters) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Guards against a slow, stale request landing after a newer one
  // (e.g. the user changes a filter while page 1 of the old filter set
  // is still in flight) from overwriting fresher results.
  const requestIdRef = useRef(0);

  const filterKey = JSON.stringify(filters);

  const loadPage = useCallback(async (pageToLoad: number, replace: boolean) => {
    const requestId = ++requestIdRef.current;
    if (replace) setLoading(true); else setLoadingMore(true);
    setError(null);

    try {
      const query = buildQuery(filters, pageToLoad);
      const result = await vendorService.listVendors(query);
      if (requestId !== requestIdRef.current) return; // superseded by a newer request

      setVendors((current) => (replace ? result.vendors : [...current, ...result.vendors]));
      setPage(pageToLoad);
      setTotalPages(result.pagination?.totalPages ?? 1);
      setTotal(result.pagination?.total ?? result.vendors.length);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err : new Error('Failed to load vendors'));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Reset to page 1 whenever the filter set changes
  useEffect(() => {
    loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const hasMore = page < totalPages;

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    loadPage(page + 1, false);
  }, [loading, loadingMore, hasMore, page, loadPage]);

  // IntersectionObserver-driven sentinel: attach `sentinelRef` to an
  // empty div at the bottom of the vendor grid; scrolling it into view
  // triggers the next page automatically.
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '400px' }, // start loading before the sentinel is actually visible
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const retry = useCallback(() => loadPage(page, page === 1), [loadPage, page]);

  return { vendors, total, loading, loadingMore, hasMore, error, sentinelRef, retry };
}
