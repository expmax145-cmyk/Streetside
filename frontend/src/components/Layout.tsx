import { useState, type ReactNode } from 'react';
import { ApiStatus } from '@/components/ApiStatus';
import { GlobalApiErrorBanner } from '@/components/GlobalApiErrorBanner';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Compass, Heart, Home, Map, Menu, Search, UserRound, X, Utensils, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useFavorites } from '@/contexts/FavoritesContext';
import { ToastContainer } from '@/components/ToastContainer';

const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/trails', label: 'Food Trails', icon: Utensils },
  { to: '/offers', label: 'Offers', icon: Search },
];

export function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { favoriteVendorIds } = useFavorites();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-orange-deep pb-16 lg:pb-0">
      <ApiStatus />
      <GlobalApiErrorBanner />

      <header className="sticky top-0 z-40 bg-header-3d shadow-raised-3d">
        <div className="container-app flex h-20 items-center justify-between gap-6 lg:h-24">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setMobileOpen(false)}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-3d text-white shadow-raised-3d border border-brand-950/30">
              <Utensils size={21} />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight text-white drop-shadow-sm">
              Street<span className="text-cream-200">Side</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {nav.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors ${
                    isActive ? 'text-white' : 'text-cream-200/80 hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-1.5 lg:flex">
            <button
              onClick={() => navigate('/search')}
              className="rounded-xl p-2 text-cream-100 transition-colors hover:bg-white/15"
              aria-label="Search"
            >
              <Search size={19} />
            </button>
            <Link to="/favorites" className="relative rounded-xl p-2 text-cream-100 transition-colors hover:bg-white/15" aria-label="Favorites">
              <Heart size={19} />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-soft">
                {favoriteVendorIds.length}
              </span>
            </Link>
            {user ? (
              <div className="group relative ml-1">
                <button className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:bg-white/15">
                  <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/40" />
                  <span className="max-w-[100px] truncate text-sm font-semibold text-white">{user.name}</span>
                </button>
                <div className="invisible absolute right-0 top-12 w-52 translate-y-1 rounded-xl border border-brand-900/10 bg-gradient-to-b from-white to-cream-100 p-2 opacity-0 shadow-card-hover transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <Link to="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-cream-200 hover:text-brand-700">
                    <UserRound size={16} /> Profile
                  </Link>
                  {user.role !== 'customer' && (
                    <Link
                      to={user.role === 'admin' ? '/admin' : '/vendor-dashboard'}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-cream-200 hover:text-brand-700"
                    >
                      <LayoutDashboard size={16} /> Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="ml-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white shadow-inset-3d transition-all hover:bg-white/20"
              >
                Get Started
              </Link>
            )}
          </div>

          <button
            className="rounded-xl border border-white/25 bg-white/10 p-2 text-white shadow-inset-3d lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Open menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="animate-fade-in border-t border-white/15 bg-surface-3d-deep px-4 pb-5 pt-3 lg:hidden">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-cream-100 hover:bg-white/10"
              >
                <Icon size={18} className="text-brand-300" /> {label}
              </NavLink>
            ))}
            <Link
              to="/favorites"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-cream-100 hover:bg-white/10"
            >
              <Heart size={18} className="text-brand-300" /> Favorites
              <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold text-cream-100">
                {favoriteVendorIds.length}
              </span>
            </Link>
            {user ? (
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-cream-100 hover:bg-white/10"
              >
                <UserRound size={18} className="text-brand-300" /> {user.name}
              </Link>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-primary mt-2 w-full">
                Sign in
              </Link>
            )}
          </div>
        )}
      </header>

      <OfflineBanner />
      <EmailVerificationBanner />

      <main className="relative mx-2 my-3 min-h-[calc(100dvh-10.5rem)] overflow-hidden rounded-2xl bg-cream-100 shadow-raised-3d md:mx-4 md:my-6 md:min-h-[calc(100dvh-12rem)] md:rounded-3xl lg:min-h-[calc(100dvh-9rem)]">{children}</main>

      <footer className="mt-20 hidden bg-surface-3d-deep text-cream-200 shadow-[inset_0_1px_0_rgba(255,224,194,0.08)] lg:block">
        <div className="container-app grid gap-10 py-14 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-3d text-white shadow-raised-3d">
                <Utensils size={18} />
              </span>
              <span className="font-display text-xl font-bold text-white">
                Street<span className="text-brand-300">Side</span>
              </span>
            </div>
            <p className="max-w-sm text-sm leading-6 text-cream-200/70">
              Discover the best local food around you. Find hidden gems, support local vendors, and make every meal an adventure.
            </p>
          </div>
          <div>
            <h3 className="mb-4 font-bold text-white">Explore</h3>
            <div className="space-y-2.5 text-sm">
              <Link className="block transition-colors hover:text-brand-300" to="/explore">Browse vendors</Link>
              <Link className="block transition-colors hover:text-brand-300" to="/trails">Food trails</Link>
              <Link className="block transition-colors hover:text-brand-300" to="/offers">Today's offers</Link>
              <Link className="block transition-colors hover:text-brand-300" to="/events">Events</Link>
            </div>
          </div>
          <div>
            <h3 className="mb-4 font-bold text-white">For vendors</h3>
            <div className="space-y-2.5 text-sm">
              <Link className="block transition-colors hover:text-brand-300" to="/vendor-register">List your business</Link>
              {user && user.role !== 'customer' ? (
                <Link
                  className="block transition-colors hover:text-brand-300"
                  to={user.role === 'admin' ? '/admin' : '/vendor-dashboard'}
                >
                  {user.role === 'admin' ? 'Admin dashboard' : 'Vendor dashboard'}
                </Link>
              ) : null}
              <Link className="block transition-colors hover:text-brand-300" to="/login">Sign in</Link>
            </div>
          </div>
        </div>
        <div className="container-app flex justify-between border-t border-white/10 py-5 text-xs text-cream-200/60">
          <span>© 2026 StreetSide. Made for food lovers.</span>
          <span>Terms · Privacy</span>
        </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-900/10 bg-gradient-to-t from-cream-100 to-white px-2 py-2 shadow-[0_-8px_24px_-12px_rgba(58,20,5,0.25)] backdrop-blur-lg lg:hidden">
        <div className="grid grid-cols-5">
          {[
            { to: '/', label: 'Home', Icon: Home },
            { to: '/explore', label: 'Explore', Icon: Compass },
            { to: '/map', label: 'Map', Icon: Map },
            { to: '/favorites', label: 'Favorites', Icon: Heart },
            { to: '/profile', label: 'Profile', Icon: UserRound },
          ].map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-brand-700' : 'text-charcoal-400'
                }`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
