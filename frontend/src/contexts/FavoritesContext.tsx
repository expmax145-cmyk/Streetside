import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { loadFromStorage, saveToStorage, removeFromStorage } from '@/lib/storage';
import * as favoriteService from '@/services/favoriteService';
import { ApiError } from '@/services/api';

interface FavoritesContextValue {
  favoriteVendorIds: string[];
  isFavorite: (vendorId: string) => boolean;
  toggleFavorite: (vendorId: string, vendorName?: string) => void;
  removeFavorite: (vendorId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

function extractVendorId(vendor: unknown): string {
  const v = vendor as { id?: unknown; _id?: unknown };
  return String(v?.id ?? v?._id ?? '');
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  // Seeded from the cache so the favorites icon/count can render instantly
  // on load without waiting on the network — the backend fetch below is
  // the source of truth and overwrites this as soon as it resolves.
  const [favoriteVendorIds, setFavoriteVendorIds] = useState<string[]>(() => loadFromStorage<string[]>('favoriteVendorIds', []));
  const { showToast } = useToast();
  const { user } = useAuth();
  // Tracks in-flight vendor ids so a fast double-click can't fire two
  // conflicting add/remove requests for the same vendor.
  const pending = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setFavoriteVendorIds([]);
      removeFromStorage('favoriteVendorIds');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const vendors = await favoriteService.listFavorites();
        if (cancelled) return;
        const ids = Array.isArray(vendors) ? vendors.map(extractVendorId).filter(Boolean) : [];
        setFavoriteVendorIds(ids);
        saveToStorage('favoriteVendorIds', ids);
      } catch {
        // Keep whatever was cached locally (from a previous session) rather
        // than wiping the list just because this fetch failed — e.g. a
        // transient network error shouldn't make favorites appear empty.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isFavorite = useCallback((vendorId: string) => favoriteVendorIds.includes(vendorId), [favoriteVendorIds]);

  const toggleFavorite = useCallback((vendorId: string, vendorName = 'Vendor') => {
    if (!user) {
      showToast('Log in to save favorites', 'info');
      return;
    }
    if (pending.current.has(vendorId)) return;
    pending.current.add(vendorId);

    const wasFav = favoriteVendorIds.includes(vendorId);
    // Optimistic update so the heart icon responds instantly.
    setFavoriteVendorIds((prev) => {
      const next = wasFav ? prev.filter((id) => id !== vendorId) : [...prev, vendorId];
      saveToStorage('favoriteVendorIds', next);
      return next;
    });
    showToast(wasFav ? `Removed ${vendorName} from favorites` : `${vendorName} added to favorites`, wasFav ? 'info' : 'favorite');

    const call = wasFav ? favoriteService.removeFavorite(vendorId) : favoriteService.addFavorite(vendorId);
    call
      .catch((err) => {
        // Roll back the optimistic change if the backend rejected it.
        setFavoriteVendorIds((prev) => {
          const next = wasFav ? [...prev, vendorId] : prev.filter((id) => id !== vendorId);
          saveToStorage('favoriteVendorIds', next);
          return next;
        });
        const message = err instanceof ApiError ? err.message : 'Could not update favorites — please try again.';
        showToast(message, 'error');
      })
      .finally(() => {
        pending.current.delete(vendorId);
      });
  }, [favoriteVendorIds, showToast, user]);

  const removeFavorite = useCallback((vendorId: string) => {
    if (!favoriteVendorIds.includes(vendorId)) return;
    toggleFavorite(vendorId);
  }, [favoriteVendorIds, toggleFavorite]);

  return (
    <FavoritesContext.Provider value={{ favoriteVendorIds, isFavorite, toggleFavorite, removeFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
