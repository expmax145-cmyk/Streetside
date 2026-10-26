import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, MapPin, Phone, Heart, Star, Share2, Navigation, Leaf, Drumstick, Egg, X, Send } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { VendorCard } from '@/components/VendorCard';
import { SmartMap } from '@/components/SmartMap';
import { Modal } from '@/components/Modal';
import { RatingStars } from '@/components/ToastContainer';
import { formatPrice, formatDistance, formatReviewCount, vendorIsOpenNow, copyToClipboard } from '@/lib/format';
import * as reviewService from '@/services/reviewService';
import * as vendorService from '@/services/vendorService';
import { ApiError } from '@/services/api';
import type { Review, VegStatus } from '@/types';

const vegIcon: Record<VegStatus, typeof Leaf> = { veg: Leaf, 'non-veg': Drumstick, egg: Egg };
const vegColor: Record<VegStatus, string> = { veg: 'text-success-600', 'non-veg': 'text-danger-500', egg: 'text-gold-500' };

export function VendorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVendorById, getSimilarVendors, offers, fetchVendor, remoteLoading: vendorsLoading, remoteError: vendorsError, reloadVendors } = useData();
  // Prefer whatever's already cached (from the bulk list) so the page can
  // render immediately, but always confirm/fetch this specific vendor
  // directly by id below — the bulk list is capped (see VENDOR_FETCH_LIMIT
  // in DataContext) and paginated in spirit, so relying on it alone for a
  // direct vendor link risks a false "vendor not found" for a vendor that
  // genuinely exists but didn't happen to be in that page of results.
  const [vendor, setVendor] = useState(() => (id ? getVendorById(id) : undefined));
  const [vendorLoading, setVendorLoading] = useState(!vendor);
  const [vendorError, setVendorError] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'about'>('menu');
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setVendorLoading(true);
    setVendorError(false);
    fetchVendor(id).then((found) => {
      if (cancelled) return;
      if (found) setVendor(found);
      else setVendorError(true);
      setVendorLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadReviews = () => {
    if (!id) return;
    setReviewsLoading(true);
    reviewService.listVendorReviews(id)
      .then(({ reviews }) => setReviews(reviews))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const remoteLoading = vendorLoading || vendorsLoading;
  const remoteError = vendorError || vendorsError;

  // Data is still on its way from the server (e.g. a direct link or a hard
  // refresh landed straight on this page before DataContext's initial load
  // finished) — show a loading state instead of a false "not found".
  if (!vendor && remoteLoading) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
        <p className="text-charcoal-500">Loading vendor…</p>
      </div>
    );
  }

  if (!vendor && remoteError) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-charcoal-900">Couldn't load this vendor</h1>
        <p className="mb-4 text-charcoal-500">There was a problem reaching StreetSide's servers.</p>
        <button onClick={() => { reloadVendors(); if (id) fetchVendor(id).then((found) => found && setVendor(found)); }} className="btn-primary">Try again</button>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-charcoal-900">Vendor not found</h1>
        <p className="mb-4 text-charcoal-500">This vendor may have moved or is no longer listed.</p>
        <Link to="/explore" className="btn-primary">Browse vendors</Link>
      </div>
    );
  }

  const similar = getSimilarVendors(vendor);
  const vendorOffers = offers.filter((o) => o.vendorId === vendor.id);
  const fav = isFavorite(vendor.id);
  const openNow = vendorIsOpenNow(vendor);

  const handleShare = async () => {
    const url = `${window.location.origin}/vendor/${vendor.id}`;
    const copied = await copyToClipboard(url);
    showToast(copied ? 'Link copied to clipboard' : 'Could not copy link — please copy it manually', copied ? 'success' : 'error');
  };

  const submitReview = async () => {
    if (!user) { navigate('/login'); return; }
    if (!reviewText.trim()) { showToast('Please write a review', 'error'); return; }
    setReviewSubmitting(true);
    try {
      await reviewService.createReview(vendor.id, { rating: reviewRating, comment: reviewText.trim() });
      showToast('Review submitted! Points earned.', 'success');
      refreshUser().catch(() => {});
      setReviewText('');
      setReviewRating(5);
      setReviewModal(false);
      // The backend recomputes the vendor's rating/reviewCount as part of
      // creating the review — refresh both so this page reflects the new
      // average immediately instead of showing stale numbers until the
      // next full data reload.
      loadReviews();
      const updated = await vendorService.getVendor(vendor.id).catch(() => undefined);
      if (updated) setVendor(updated);
    } catch (err) {
      const message = err instanceof ApiError && err.status === 409 ? err.message : 'Could not submit review';
      showToast(message, 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div>
      {/* Hero image */}
      <div className="relative h-56 overflow-hidden md:h-72">
        <img src={vendor.image} alt={vendor.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/85 via-charcoal-900/35 to-charcoal-900/10" />
        <div className="absolute top-4 left-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 rounded-xl border border-brand-900/10 bg-gradient-to-b from-white to-cream-200 px-3 py-2 text-sm font-semibold text-charcoal-800 shadow-raised-3d transition-colors hover:from-cream-50 hover:to-cream-100">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      <div className="container-app -mt-16 relative">
        {/* Header card */}
        <div className="card p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <img src={vendor.logo} alt="" className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white object-cover shadow-card ring-1 ring-charcoal-200 md:h-20 md:w-20" />
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold text-charcoal-900 md:text-2xl">{vendor.name}</h1>
                  <span className={`badge ${openNow ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-600'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${openNow ? 'bg-success-500' : 'bg-danger-500'}`} />
                    {openNow ? 'Open now' : 'Closed'}
                  </span>
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
                  <RatingStars rating={vendor.rating} />
                  <span className="text-charcoal-400">({formatReviewCount(vendor.reviewCount)} reviews)</span>
                  <span className="text-charcoal-300">·</span>
                  <span className="font-semibold text-charcoal-700">{vendor.cuisine}</span>
                  <span className="text-charcoal-300">·</span>
                  <span className="font-semibold text-charcoal-700">₹{vendor.priceRange[0]}–₹{vendor.priceRange[1]}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-charcoal-500">
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-brand-600" /> {vendor.location.address}, {vendor.location.area}</span>
                  {vendor.distance !== undefined && <span className="flex items-center gap-1.5"><Navigation size={14} className="text-brand-600" /> {formatDistance(vendor.distance)} away</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleFavorite(vendor.id, vendor.name)} className={`btn-secondary min-w-[104px] ${fav ? '!border-danger-200 !bg-danger-100 !text-danger-600 hover:!text-danger-600' : ''}`}>
                <Heart size={18} fill={fav ? 'currentColor' : 'none'} className={fav ? 'animate-heart-pop' : ''} /> {fav ? 'Saved' : 'Save'}
              </button>
              <button onClick={handleShare} className="btn-secondary"><Share2 size={18} /></button>
            </div>
          </div>

          {/* Specialties */}
          <div className="mt-4 flex flex-wrap gap-2">
            {vendor.specialties.map((s) => (
              <span key={s} className="badge border border-brand-100 bg-brand-50 text-brand-700"><Star size={11} fill="currentColor" /> {s}</span>
            ))}
          </div>
        </div>

        {/* Offers */}
        {vendorOffers.length > 0 && (
          <div className="mt-4 space-y-3">
            {vendorOffers.map((offer) => (
              <div key={offer.id} className={`flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r ${offer.color} p-4 text-white`}>
                <div>
                  <p className="text-lg font-extrabold">{offer.discount}</p>
                  <p className="text-sm text-white/90">{offer.title}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-lg bg-white/20 px-3 py-1 font-mono text-sm font-bold tracking-wider">{offer.code}</span>
                  <p className="mt-1 text-xs text-white/70">Exp: {offer.expiry}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="mt-6 flex gap-1 border-b border-charcoal-200">
          {(['menu', 'reviews', 'about'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-3 text-sm font-semibold capitalize transition-colors ${activeTab === tab ? 'text-brand-700' : 'text-charcoal-500 hover:text-charcoal-800'}`}
            >
              {tab} {tab === 'reviews' && `(${reviews.length})`}
              {activeTab === tab && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-brand-600" />}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="py-6">
          {activeTab === 'menu' && (
            <div className="space-y-3">
              {vendor.menu.map((item) => {
                const VegIcon = vegIcon[item.veg];
                return (
                  <div key={item.id} className="card flex gap-4 p-4 transition-shadow hover:shadow-card-hover">
                    <img src={item.image} alt={item.name} loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover ring-1 ring-charcoal-100 sm:h-24 sm:w-24" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <VegIcon size={16} className={vegColor[item.veg]} />
                          <h3 className="font-bold text-charcoal-900">{item.name}</h3>
                          {item.popular && <span className="badge bg-gold-100 text-gold-700"><Star size={10} fill="currentColor" /> Popular</span>}
                        </div>
                        <span className="shrink-0 font-extrabold text-charcoal-900">{formatPrice(item.price)}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-charcoal-500">{item.description}</p>
                      {!item.available && <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-danger-600"><X size={12} /> Out of stock</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-extrabold text-charcoal-900">{vendor.rating.toFixed(1)}</span>
                    <RatingStars rating={vendor.rating} size={18} />
                  </div>
                  <p className="text-sm text-charcoal-500">{formatReviewCount(vendor.reviewCount)} reviews</p>
                </div>
                <button onClick={() => user ? setReviewModal(true) : navigate('/login')} className="btn-primary">
                  <Send size={16} /> Write a review
                </button>
              </div>
              <div className="space-y-4">
                {reviewsLoading && (
                  <p className="text-sm text-charcoal-400">Loading reviews…</p>
                )}
                {!reviewsLoading && reviews.length === 0 && (
                  <p className="text-sm text-charcoal-400">No reviews yet — be the first to share your experience.</p>
                )}
                {reviews.map((review) => (
                  <div key={review.id} className="card p-4">
                    <div className="mb-2 flex items-center gap-3">
                      <img src={review.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                      <div className="flex-1">
                        <p className="font-semibold text-charcoal-800">{review.author}</p>
                        <div className="flex items-center gap-2">
                          <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} fill={i < review.rating ? 'currentColor' : 'none'} className={i < review.rating ? 'text-gold-500' : 'text-charcoal-200'} />)}</span>
                          <span className="text-xs text-charcoal-400">{review.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-charcoal-600">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-5">
              <div className="card p-5">
                <h3 className="mb-2 font-bold text-charcoal-900">About {vendor.name}</h3>
                <p className="text-sm leading-relaxed text-charcoal-600">{vendor.longDescription}</p>
              </div>
              {/* FSSAI/hygiene display — only shown when there's
                  something to show; an unlicensed/unverified vendor
                  simply doesn't get this card, rather than a card full
                  of "not provided" placeholders. */}
              {(vendor.fssaiLicenseNumber || vendor.hygieneVerified) && (
                <div className="card p-5">
                  <h3 className="mb-3 font-bold text-charcoal-900">Food safety</h3>
                  <div className="flex flex-wrap gap-3">
                    {vendor.fssaiLicenseNumber && (
                      <span className="rounded-xl border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-700">
                        <span className="font-semibold">FSSAI:</span> {vendor.fssaiLicenseNumber}
                      </span>
                    )}
                    {vendor.hygieneVerified ? (
                      <span className="flex items-center gap-1.5 rounded-xl border border-success-200 bg-success-50 px-3 py-2 text-sm font-semibold text-success-700">
                        <Star size={14} className="fill-success-500 text-success-500" /> Hygiene verified{vendor.hygieneRating ? ` · ${vendor.hygieneRating}/5` : ''}
                      </span>
                    ) : (
                      <span className="rounded-xl border border-dashed border-charcoal-300 px-3 py-2 text-sm text-charcoal-500">Hygiene rating not yet verified</span>
                    )}
                  </div>
                </div>
              )}
              <div className="card p-5">
                <h3 className="mb-3 font-bold text-charcoal-900">Location & hours</h3>
                <div className="mb-4 space-y-2 text-sm text-charcoal-600">
                  <p className="flex items-center gap-2"><MapPin size={16} className="text-brand-500" /> {vendor.location.address}, {vendor.location.area}, {vendor.location.city}</p>
                  <p className="flex items-center gap-2"><Clock size={16} className="text-brand-500" /> {vendor.hours.days}: {vendor.hours.open} – {vendor.hours.close}</p>
                  <p className="flex items-center gap-2"><Phone size={16} className="text-brand-500" /> {vendor.phone}</p>
                </div>
                <SmartMap vendors={[vendor]} />
              </div>
            </div>
          )}
        </div>

        {/* Similar vendors */}
        {similar.length > 0 && (
          <div className="py-8">
            <h2 className="mb-4 text-xl font-bold text-charcoal-900">Similar vendors</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((v, i) => <VendorCard key={v.id} vendor={v} index={i} />)}
            </div>
          </div>
        )}
      </div>

      {/* Review modal */}
      <Modal open={reviewModal} onClose={() => setReviewModal(false)} title="Write a review">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-charcoal-700">Your rating</label>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setReviewRating(i + 1)} aria-label={`${i + 1} stars`}>
                  <Star size={28} fill={i < reviewRating ? 'currentColor' : 'none'} className={i < reviewRating ? 'text-gold-500' : 'text-charcoal-200'} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-charcoal-700">Your review</label>
            <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={4} placeholder="Share your experience..." className="input resize-none" />
          </div>
          <button onClick={submitReview} className="btn-primary w-full" disabled={reviewSubmitting}>{reviewSubmitting ? 'Submitting…' : 'Submit review'}</button>
        </div>
      </Modal>
    </div>
  );
}
