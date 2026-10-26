import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Heart, Gift, Utensils, Map, LogOut, Phone, Mail, Calendar, Edit2, Check, X, LayoutDashboard, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { VendorCard } from '@/components/VendorCard';
import ImageUploadField from '@/components/ImageUploadField';
import * as reviewService from '@/services/reviewService';

export function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const { favoriteVendorIds } = useFavorites();
  const { vendors, remoteLoading, remoteError, reloadVendors } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  // Genuinely calculated from the backend (GET /api/reviews/mine) rather
  // than filtering a client-side review cache by matching the person's
  // display name — name-matching would double-count anyone who shares a
  // name with another reviewer, and undercount if they ever change it.
  const [reviewCount, setReviewCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    reviewService.listMyReviews()
      .then((reviews) => { if (!cancelled) setReviewCount(reviews.length); })
      .catch(() => { if (!cancelled) setReviewCount(null); });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-charcoal-900">Sign in to view your profile</h1>
        <Link to="/login" className="btn-primary">Sign in</Link>
      </div>
    );
  }

  const favVendors = vendors.filter((v) => favoriteVendorIds.includes(v.id));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name, phone, avatar });
      setEditing(false);
      showToast('Profile updated', 'success');
    } catch {
      // The global API banner reports the server error.
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const stats = [
    { icon: Heart, label: 'Favorites', value: favoriteVendorIds.length, color: 'text-danger-600', bg: 'bg-danger-50' },
    { icon: Gift, label: 'Reward points', value: user.points, color: 'text-brand-600', bg: 'bg-brand-50' },
    { icon: Utensils, label: 'Reviews', value: reviewCount ?? '—', color: 'text-gold-600', bg: 'bg-gold-50' },
  ];

  return (
    <div className="container-app py-6 md:py-10">
      {remoteLoading && <div className="mb-4 rounded-xl border border-charcoal-200 bg-white p-3 text-sm text-charcoal-600 shadow-soft">Refreshing vendor data…</div>}
      {remoteError && <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">Unable to load latest vendors. <button onClick={() => reloadVendors()} className="btn-sm btn-primary">Retry</button></div>}
      {/* Profile header */}
      <div className="card mb-6 p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {editing ? (
              <ImageUploadField
                value={avatar}
                onChange={setAvatar}
                onError={(msg) => showToast(msg, 'error')}
                shape="circle"
                maxDimension={400}
              />
            ) : (
              <img src={user.avatar} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-brand-100 md:h-20 md:w-20" />
            )}
            <div>
              {editing ? (
                <input value={name} onChange={(e) => setName(e.target.value)} className="input mb-1 max-w-xs" aria-label="Name" />
              ) : (
                <h1 className="text-xl font-extrabold text-charcoal-900 md:text-2xl">{user.name}</h1>
              )}
              <div className="mt-1 space-y-1 text-sm text-charcoal-500">
                <p className="flex items-center gap-1.5"><Mail size={13} /> {user.email}</p>
                {editing ? (
                  <p className="flex items-center gap-1.5"><Phone size={13} /> <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input h-8 max-w-[180px] py-1 text-sm" aria-label="Phone" placeholder="Phone number" /></p>
                ) : (
                  user.phone && <p className="flex items-center gap-1.5"><Phone size={13} /> {user.phone}</p>
                )}
                <p className="flex items-center gap-1.5"><Calendar size={13} /> Joined {user.joinedDate}</p>
              </div>
              <span className="badge mt-2 border border-brand-100 bg-brand-50 text-brand-700 capitalize">{user.role}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save
                </button>
                <button onClick={() => { setEditing(false); setName(user.name); setPhone(user.phone || ''); setAvatar(user.avatar || ''); }} className="btn-secondary"><X size={16} /></button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="btn-secondary"><Edit2 size={16} /> Edit profile</button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                <Icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-charcoal-900">{stat.value}</p>
                <p className="text-xs text-charcoal-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/rewards" className="card card-hover flex items-center gap-3 p-4">
          <Gift size={22} className="text-brand-500" />
          <div><p className="font-bold text-charcoal-900">Rewards & badges</p><p className="text-xs text-charcoal-500">View your points and badges</p></div>
        </Link>
        <Link to="/favorites" className="card card-hover flex items-center gap-3 p-4">
          <Heart size={22} className="text-danger-500" />
          <div><p className="font-bold text-charcoal-900">My favorites</p><p className="text-xs text-charcoal-500">{favVendors.length} saved vendors</p></div>
        </Link>
        <Link to="/map" className="card card-hover flex items-center gap-3 p-4">
          <Map size={22} className="text-brand-500" />
          <div><p className="font-bold text-charcoal-900">Food map</p><p className="text-xs text-charcoal-500">Explore vendors on map</p></div>
        </Link>
        {user.role !== 'customer' && (
          <Link to={user.role === 'admin' ? '/admin' : '/vendor-dashboard'} className="card card-hover flex items-center gap-3 p-4">
            <LayoutDashboard size={22} className="text-brand-500" />
            <div><p className="font-bold text-charcoal-900">{user.role === 'admin' ? 'Admin dashboard' : 'Vendor dashboard'}</p><p className="text-xs text-charcoal-500">Manage your account</p></div>
          </Link>
        )}
      </div>

      {/* Favorite vendors preview */}
      {favVendors.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-bold text-charcoal-800">Your favorite vendors</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {favVendors.slice(0, 4).map((v, i) => <VendorCard key={v.id} vendor={v} index={i} />)}
          </div>
        </div>
      )}

      {/* Sign out */}
      <div className="mt-8">
        <button onClick={handleLogout} className="btn-danger"><LogOut size={18} /> Sign out</button>
      </div>
    </div>
  );
}
