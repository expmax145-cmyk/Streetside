import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Star, TrendingUp, Utensils, Flame, Clock, Award, Sparkles, ChevronRight } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { categories } from '@/data/categories';
import { VendorCard } from '@/components/VendorCard';
import { SearchBar } from '@/components/SearchBar';
import { RatingStars } from '@/components/ToastContainer';
import * as reviewService from '@/services/reviewService';
import type { Review } from '@/types';

export function HomePage() {
  const { vendors, offers, events, foodTrails, remoteLoading, remoteError, reloadVendors } = useData();
  const topRated = [...vendors].sort((a, b) => b.rating - a.rating).slice(0, 8);
  const trending = [...vendors].sort((a, b) => b.popularity - a.popularity).slice(0, 4);
  const featuredTrails = foodTrails.slice(0, 3);
  const featuredOffers = offers.slice(0, 3);
  const featuredEvent = events.find((e) => e.featured);
  const avgRating = vendors.length ? vendors.reduce((sum, v) => sum + v.rating, 0) / vendors.length : 0;

  // One representative review from each of a few highly-rated vendors,
  // fetched live from the API instead of hardcoding local vendor ids
  // (which only ever matched the old static dataset and would silently
  // show nothing once vendors come from MongoDB).
  const [topReviews, setTopReviews] = useState<Review[]>([]);
  const reviewedVendorIds = useMemo(
    () => [...vendors].filter((v) => v.reviewCount > 0).sort((a, b) => b.rating - a.rating).slice(0, 3).map((v) => v.id),
    [vendors],
  );
  useEffect(() => {
    if (reviewedVendorIds.length === 0) {
      setTopReviews([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        reviewedVendorIds.map(async (id) => {
          try {
            const { reviews } = await reviewService.listVendorReviews(id, 1, 1);
            return reviews[0];
          } catch {
            return undefined;
          }
        }),
      );
      if (!cancelled) setTopReviews(results.filter((r): r is Review => Boolean(r)));
    })();
    return () => {
      cancelled = true;
    };
  }, [reviewedVendorIds]);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.name] = vendors.filter((v) => v.categories.includes(cat.name)).length;
    }
    return counts;
  }, [vendors]);

  return (
    <div>
      {/* Hero — light, elegant, brand-forward */}
      <section className="relative overflow-hidden border-b border-charcoal-200/80">
        <div className="absolute inset-0">
          <img
            src="/hero-banner.jpg"
            alt="Street food vendor cooking at a night market stall"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-cream-100 via-cream-100/95 to-cream-100/85 md:bg-gradient-to-r md:via-cream-100/35 md:to-transparent" />
          <div className="absolute inset-0 bg-hero-mesh" />
        </div>

        <div className="container-app relative py-14 md:py-24">
          <div className="max-w-2xl">
            <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-brand-700 animate-fade-in-up">
              StreetSide
            </p>
            <h1
              className="mb-5 text-4xl font-extrabold leading-[1.1] text-charcoal-900 md:text-6xl text-balance animate-fade-in-up"
              style={{ animationDelay: '60ms' }}
            >
              Discover the best <span className="text-brand-600">street food</span> around you
            </h1>
            <p
              className="mb-8 max-w-lg text-base leading-relaxed text-charcoal-600 md:text-lg animate-fade-in-up"
              style={{ animationDelay: '120ms' }}
            >
              Find hidden food gems, local vendors, and unforgettable flavors — curated for your city.
            </p>
            <div className="max-w-xl animate-fade-in-up" style={{ animationDelay: '180ms' }}>
              <SearchBar />
            </div>
            <div
              className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-charcoal-600 animate-fade-in-up"
              style={{ animationDelay: '240ms' }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-900/10 bg-gradient-to-b from-white to-cream-200 px-3 py-1.5 shadow-raised-3d">
                <Utensils size={14} className="text-brand-600" /> {vendors.length}+ vendors
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-900/10 bg-gradient-to-b from-white to-cream-200 px-3 py-1.5 shadow-raised-3d">
                <Star size={14} className="text-gold-500" /> {avgRating.toFixed(1)} avg rating
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-900/10 bg-gradient-to-b from-white to-cream-200 px-3 py-1.5 shadow-raised-3d">
                <MapPin size={14} className="text-brand-600" /> Live map
              </span>
            </div>
          </div>
        </div>
      </section>

      {remoteLoading && (
        <div className="container-app py-4">
          <div className="rounded-xl border border-charcoal-200 bg-white p-3 text-sm text-charcoal-600 shadow-soft">
            Refreshing vendor data…
          </div>
        </div>
      )}
      {remoteError && (
        <div className="container-app py-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">
            Unable to load latest vendors.
            <button onClick={() => reloadVendors()} className="btn-sm btn-primary">
              Retry
            </button>
          </div>
        </div>
      )}

      <section className="container-app py-12 md:py-16">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Browse by category</h2>
            <p className="section-subtitle">Explore your favorite food types</p>
          </div>
          <Link to="/explore" className="hidden items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:flex">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {categories.map((cat, i) => (
            <Link
              key={cat.id}
              to={`/explore?cat=${encodeURIComponent(cat.name)}`}
              className="group relative aspect-square w-32 shrink-0 snap-start overflow-hidden rounded-2xl border border-charcoal-200/60 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover animate-fade-in-up sm:w-36"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <img src={cat.image} alt={cat.name} className="img-cover transition-transform duration-500 group-hover:scale-110" />
              <div className={`absolute inset-0 bg-gradient-to-t ${cat.color} opacity-50 mix-blend-multiply`} />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/85 via-charcoal-900/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                <p className="text-sm font-bold text-white">{cat.name}</p>
                <p className="text-xs text-white/75">{categoryCounts[cat.name] ?? 0} spots</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-charcoal-200/70 bg-white py-12 md:py-16">
        <div className="container-app">
          <div className="mb-7">
            <h2 className="section-title flex items-center gap-2">
              <TrendingUp size={24} className="text-brand-600" /> Trending this week
            </h2>
            <p className="section-subtitle">Most popular vendors right now</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((v, i) => (
              <VendorCard key={v.id} vendor={v} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="container-app py-12 md:py-16">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Award size={24} className="text-gold-500" /> Top rated vendors
            </h2>
            <p className="section-subtitle">The highest-rated spots in the city</p>
          </div>
          <Link to="/explore" className="hidden items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:flex">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {topRated.slice(0, 4).map((v, i) => (
            <VendorCard key={v.id} vendor={v} index={i} />
          ))}
        </div>
      </section>

      {featuredEvent && (
        <section className="container-app pb-12 md:pb-16">
          <Link
            to={`/events/${featuredEvent.id}`}
            className="group relative block overflow-hidden rounded-3xl border border-charcoal-200 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <img
              src={featuredEvent.image}
              alt=""
              className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] md:h-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/55 to-charcoal-900/10" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <span className="badge mb-3 bg-btn-3d text-white shadow-raised-3d">
                <Flame size={12} /> Featured event
              </span>
              <h3 className="mb-2 text-2xl font-bold text-white md:text-3xl">{featuredEvent.name}</h3>
              <p className="mb-4 max-w-lg text-charcoal-200">{featuredEvent.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-charcoal-300">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> {featuredEvent.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {featuredEvent.location}
                </span>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold text-brand-300 transition-all group-hover:gap-2">
                Learn more <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        </section>
      )}

      <section className="border-y border-charcoal-200/70 bg-white py-12 md:py-16">
        <div className="container-app">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title flex items-center gap-2">
                <Utensils size={24} className="text-brand-600" /> Curated food trails
              </h2>
              <p className="section-subtitle">Multi-stop food adventures curated by locals</p>
            </div>
            <Link to="/trails" className="hidden items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:flex">
              All trails <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {featuredTrails.map((trail, i) => (
              <Link
                key={trail.id}
                to={`/trails/${trail.id}`}
                className="card card-hover group overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="relative aspect-video overflow-hidden bg-charcoal-100">
                  <img
                    src={trail.image}
                    alt={trail.name}
                    className="img-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/70 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="badge bg-white text-charcoal-800 shadow-soft">{trail.stops.length} stops</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="mb-1 font-bold text-charcoal-900 transition-colors group-hover:text-brand-700">{trail.name}</h3>
                  <p className="mb-3 line-clamp-2 text-sm text-charcoal-500">{trail.description}</p>
                  <div className="flex items-center justify-between text-xs text-charcoal-500">
                    <RatingStars rating={trail.rating} />
                    <span>
                      {trail.duration} · {trail.distance}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-app py-12 md:py-16">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Sparkles size={24} className="text-brand-600" /> Today's offers
            </h2>
            <p className="section-subtitle">Save on your favorite food</p>
          </div>
          <Link to="/offers" className="hidden items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:flex">
            All offers <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredOffers.map((offer, i) => (
            <Link
              key={offer.id}
              to={`/vendor/${offer.vendorId}`}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${offer.color} p-5 text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover animate-fade-in-up`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
              <div className="relative">
                <p className="mb-1 text-3xl font-extrabold">{offer.discount}</p>
                <h3 className="mb-1 font-bold">{offer.title}</h3>
                <p className="mb-4 text-sm text-white/85">{offer.description}</p>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-white/20 px-3 py-1 font-mono text-sm font-bold tracking-wider backdrop-blur-sm">
                    {offer.code}
                  </span>
                  <span className="text-xs text-white/75">Exp: {offer.expiry}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-charcoal-200/70 bg-white py-12 md:py-16">
        <div className="container-app">
          <div className="mb-7">
            <h2 className="section-title">What food lovers say</h2>
            <p className="section-subtitle">Real reviews from the StreetSide community</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {topReviews.map((review, i) => {
              const vendor = vendors.find((v) => v.id === review.vendorId);
              return (
                <div key={review.id} className="card p-5 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="mb-3 flex items-center gap-3">
                    <img src={review.avatar} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-brand-100" />
                    <div>
                      <p className="font-semibold text-charcoal-900">{review.author}</p>
                      <p className="text-xs text-charcoal-400">{review.date}</p>
                    </div>
                  </div>
                  <RatingStars rating={review.rating} />
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-600">"{review.text}"</p>
                  {vendor && (
                    <Link
                      to={`/vendor/${vendor.id}`}
                      className="mt-3 inline-flex items-center gap-0.5 text-xs font-semibold text-brand-700 transition-all hover:gap-1.5 hover:text-brand-800"
                    >
                      — {vendor.name} <ChevronRight size={12} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-app py-16">
        <div className="relative overflow-hidden rounded-3xl bg-warm-gradient p-8 text-center shadow-warm-lg md:p-16">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 animate-float" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/5 animate-float" style={{ animationDelay: '1.5s' }} />
          <div className="relative">
            <h2 className="mb-3 text-3xl font-bold text-white md:text-4xl">Are you a food vendor?</h2>
            <p className="mx-auto mb-6 max-w-md text-brand-50/95">
              List your business on StreetSide and reach thousands of hungry food lovers in your city.
            </p>
            <Link to="/vendor-register" className="btn bg-white px-6 py-3 text-brand-700 shadow-card hover:bg-cream-100 hover:shadow-card-hover">
              List your business <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
