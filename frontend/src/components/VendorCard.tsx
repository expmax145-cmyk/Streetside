import { Link } from 'react-router-dom';
import { Heart, MapPin, Star, Clock, UtensilsCrossed } from 'lucide-react';
import type { MenuItem, Vendor } from '@/types';
import { useFavorites } from '@/contexts/FavoritesContext';
import { formatDistance, formatPriceRange, formatReviewCount, vendorIsOpenNow } from '@/lib/format';

export function VendorCard({
  vendor,
  index = 0,
  matchedMenuItem,
  imageOverride,
}: {
  vendor: Vendor;
  index?: number;
  /**
   * Search-only: the specific menu item that explains why this vendor
   * showed up (e.g. a dosa vendor matched a "tea" search because tea is
   * one item on their menu, not because they're a tea specialist). Only
   * SearchPage passes this — every other place VendorCard is used
   * (Home, Explore, Favorites, Map, similar-vendors) omits it, so the
   * card looks exactly as it always has everywhere else.
   */
  matchedMenuItem?: MenuItem;
  /**
   * Explore-page-only: swaps the card photo for a category-relevant menu
   * item photo instead of the vendor's own profile image. Temporary fix
   * for vendor profile photos that don't reflect the category being
   * browsed (e.g. a "Dosa" filter showing a vendor's filter-coffee photo).
   * Only ExplorePage passes this — everywhere else renders vendor.image
   * exactly as before.
   */
  imageOverride?: string;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(vendor.id);
  const openNow = vendorIsOpenNow(vendor);

  return (
    <Link
      to={`/vendor/${vendor.id}`}
      className="card card-hover group flex flex-col overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-charcoal-100">
        <img src={imageOverride ?? vendor.image} alt={vendor.name} loading="lazy" className="img-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/75 via-charcoal-900/15 to-transparent" />
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(vendor.id, vendor.name);
          }}
          aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={fav}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-charcoal-700 shadow-card transition-all hover:scale-105 hover:text-rose-500 active:scale-95"
        >
          <Heart size={17} fill={fav ? '#d9491c' : 'none'} className={fav ? 'text-rose-500 animate-heart-pop' : ''} />
        </button>
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
          <span className="badge bg-white text-charcoal-900 shadow-soft"><Star size={12} fill="currentColor" className="text-gold-500" />{vendor.rating.toFixed(1)}</span>
          <span className="badge bg-btn-3d text-white shadow-raised-3d">{vendor.cuisine}</span>
        </div>
        {!openNow && <div className="absolute inset-0 flex items-center justify-center bg-charcoal-900/45 backdrop-blur-[1px]"><span className="rounded-lg bg-charcoal-900/85 px-3 py-1.5 text-sm font-bold text-white">Closed</span></div>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 font-bold leading-tight text-charcoal-900 transition-colors group-hover:text-brand-700">{vendor.name}</h3>
        <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-charcoal-500">{vendor.description}</p>
        {matchedMenuItem && (
          <p className="-mt-1 mb-3 flex items-center gap-1.5 text-xs font-medium text-brand-700">
            <UtensilsCrossed size={12} className="shrink-0" />
            Found on the menu: {matchedMenuItem.name}
          </p>
        )}
        <div className="mt-auto space-y-2 border-t border-charcoal-100 pt-3 text-xs text-charcoal-500">
          {/* distance label hidden entirely when unknown -- never show a fake "0.0 km" */}
          <div className="flex items-center gap-1.5"><MapPin size={13} className="shrink-0 text-brand-600" /><span className="truncate">{vendor.location.area}{vendor.distance !== undefined ? ` · ${formatDistance(vendor.distance)}` : ''}</span></div>
          <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><Clock size={13} className={openNow ? 'text-success-600' : 'text-danger-500'} /><span className={`font-semibold ${openNow ? 'text-success-700' : 'text-danger-600'}`}>{openNow ? 'Open now' : 'Closed'}</span></span><span className="font-bold text-charcoal-800">{formatPriceRange(vendor.priceRange)}</span></div>
          <div className="text-charcoal-400">{formatReviewCount(vendor.reviewCount)} reviews</div>
        </div>
      </div>
    </Link>
  );
}

export function VendorCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
        <div className="flex justify-between border-t border-charcoal-100 pt-3">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-3 w-16" />
        </div>
      </div>
    </div>
  );
}
