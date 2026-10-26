import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Star, TrendingUp, Utensils, Plus, Edit2, Trash2, Clock, MapPin, Phone, DollarSign, BarChart3, Tag, Globe, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useData } from '@/contexts/DataContext';
import { Modal } from '@/components/Modal';
import { RatingStars } from '@/components/ToastContainer';
import ImageUploadField from '@/components/ImageUploadField';
import { formatPrice } from '@/lib/format';
import * as reviewService from '@/services/reviewService';
import * as offerService from '@/services/offerService';
import * as vendorService from '@/services/vendorService';
import type { MenuItem, FoodCategory, CuisineType, VegStatus, Review, Offer, Vendor } from '@/types';

type Tab = 'overview' | 'menu' | 'offers' | 'reviews' | 'settings';

const emptyMenuForm = { name: '', description: '', price: '', category: '' as FoodCategory | '', veg: 'veg' as VegStatus };

const CUISINE_OPTIONS: CuisineType[] = [
  'Biryani', 'South Indian', 'Street Food', 'Chinese', 'Fast Food',
  'Desserts', 'Beverages', 'North Indian', 'Continental',
];

export function VendorDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { addMenuItem, updateMenuItem, deleteMenuItem, updateVendorSettings, remoteLoading: dataLoading, fetchVendor } = useData();
  const [tab, setTab] = useState<Tab>('overview');
  const [menuModal, setMenuModal] = useState(false);
  const [offerModal, setOfferModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState(emptyMenuForm);
  const [offerForm, setOfferForm] = useState({ title: '', description: '', discount: '', code: '', expiry: '', conditions: '' });
  const [savingOffer, setSavingOffer] = useState(false);
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);
  // moved to top level -- must not be declared inside saveMenuItem
  const [savingMenuItem, setSavingMenuItem] = useState(false);

  const [settingsForm, setSettingsForm] = useState<{
    name: string; description: string; phone: string; secondaryPhone: string; website: string;
    instagram: string; facebook: string; whatsapp: string;
    open: string; close: string; address: string; area: string; cuisine: CuisineType;
    logo: string; image: string; manualClosed: boolean; fssaiLicenseNumber: string;
  } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const vendorId = user?.vendorId;
  // Fetch this vendor directly by id (via user.vendorId, exactly as the
  // login → vendorId → GET vendor flow should work) instead of searching
  // for it inside a possibly-truncated bulk vendor list — that mismatch
  // is what used to cause a valid vendor seeing "No vendor profile
  // found".
  const [vendor, setVendor] = useState<Vendor | undefined>(undefined);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [vendorError, setVendorError] = useState(false);
  const remoteLoading = vendorLoading || dataLoading;
  const remoteError = vendorError;

  const loadVendor = () => {
    if (!vendorId) { setVendorLoading(false); return; }
    setVendorLoading(true);
    setVendorError(false);
    fetchVendor(vendorId)
      .then((found) => {
        if (found) setVendor(found);
        else setVendorError(true);
      })
      .finally(() => setVendorLoading(false));
  };

  useEffect(() => {
    loadVendor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  // This vendor's own reviews and offers — fetched directly rather than
  // filtering the app-wide public `offers`/`reviews` data, and (for
  // offers) including inactive/expired ones so the owner can actually
  // see and manage everything they've created, not just what's
  // currently live to customers.
  const [reviews, setReviews] = useState<Review[]>([]);
  const [vendorOffers, setVendorOffers] = useState<Offer[]>([]);

  const loadReviews = (id: string) => {
    reviewService.listVendorReviews(id).then(({ reviews }) => setReviews(reviews)).catch(() => setReviews([]));
  };
  const loadOffers = (id: string) => {
    offerService.listVendorOffers(id, { includeInactive: true }).then(setVendorOffers).catch(() => setVendorOffers([]));
  };

  useEffect(() => {
    if (!vendor) return;
    loadReviews(vendor.id);
    loadOffers(vendor.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor?.id]);

  useEffect(() => {
    if (vendor && !settingsForm) {
      setSettingsForm({
        name: vendor.name,
        description: vendor.description,
        phone: vendor.phone,
        secondaryPhone: vendor.secondaryPhone || '',
        website: vendor.website || '',
        instagram: vendor.socialLinks?.instagram || '',
        facebook: vendor.socialLinks?.facebook || '',
        whatsapp: vendor.socialLinks?.whatsapp || '',
        open: vendor.hours.open,
        close: vendor.hours.close,
        address: vendor.location.address,
        area: vendor.location.area,
        cuisine: vendor.cuisine,
        logo: vendor.logo || '',
        image: vendor.image || '',
        manualClosed: vendor.manualClosed ?? false,
        fssaiLicenseNumber: vendor.fssaiLicenseNumber || '',
      });
    }
  }, [vendor, settingsForm]);

  if (!vendor && remoteLoading) {
    return (
      <div className="container-app py-20 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
        <p className="text-charcoal-500">Loading your dashboard…</p>
      </div>
    );
  }

  if (!vendor && remoteError) {
    return (
      <div className="container-app py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-charcoal-900">Couldn't load your dashboard</h1>
        <p className="mb-4 text-charcoal-500">There was a problem reaching StreetSide's servers.</p>
        <button onClick={() => loadVendor()} className="btn-primary">Try again</button>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container-app py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-charcoal-900">No vendor profile found</h1>
        <p className="mb-4 text-charcoal-500">This account isn't linked to a business yet.</p>
        <Link to="/vendor-register" className="btn-primary">List your business</Link>
      </div>
    );
  }

  const openMenuModal = (item: MenuItem | null) => {
    setEditingItem(item);
    setMenuForm(item
      ? { name: item.name, description: item.description, price: String(item.price), category: item.category, veg: item.veg }
      : emptyMenuForm);
    setMenuModal(true);
  };

  const refreshVendor = () => {
    vendorService.getVendor(vendor.id).then(setVendor).catch(() => {});
  };

  // Editing is now an atomic PUT via updateMenuItem (which calls
  // the existing PUT /menu/:id endpoint) instead of delete-then-create.
  // This preserves the item's id and, on failure, leaves the original
  // item untouched -- the old approach deleted the item first, so a
  // failed create meant total data loss with no way to recover.
  const saveMenuItem = async () => {
    if (!menuForm.name.trim() || !menuForm.price || !menuForm.category) {
      showToast('Please fill in name, price, and category', 'error');
      return;
    }
    setSavingMenuItem(true);
    try {
      if (editingItem) {
        await updateMenuItem(vendor.id, editingItem.id, {
          name: menuForm.name.trim(),
          description: menuForm.description.trim(),
          price: Number(menuForm.price),
          category: menuForm.category as FoodCategory,
          veg: menuForm.veg,
        });
      } else {
        await addMenuItem(vendor.id, {
          name: menuForm.name.trim(),
          description: menuForm.description.trim(),
          price: Number(menuForm.price),
          category: menuForm.category as FoodCategory,
          veg: menuForm.veg,
          image: vendor.image,
          popular: false,
          available: true,
        });
      }
      refreshVendor();
      showToast(editingItem ? 'Item updated' : 'Item added to menu', 'success');
      setMenuModal(false);
    } catch {
      // keep the modal open and the original item intact on failure
      showToast('Could not save that menu item. Please try again.', 'error');
    } finally {
      setSavingMenuItem(false);
    }
  };

  const removeMenuItem = async (item: MenuItem) => {
    await deleteMenuItem(vendor.id, item.id);
    showToast('Item deleted', 'info');
    refreshVendor();
  };

  const saveOffer = async () => {
    setSavingOffer(true);
    if (!offerForm.title.trim() || !offerForm.discount.trim() || !offerForm.code.trim() || !offerForm.expiry) {
      showToast('Please fill in title, discount, coupon code, and expiry date', 'error');
      setSavingOffer(false);
      return;
    }
    try {
      await offerService.createOffer({
        vendorId: vendor.id,
        title: offerForm.title.trim(),
        description: offerForm.description.trim() || offerForm.title.trim(),
        discount: offerForm.discount.trim(),
        code: offerForm.code.trim().toUpperCase(),
        expiry: offerForm.expiry,
        conditions: offerForm.conditions.trim() || 'No conditions',
      });
      showToast('Offer created', 'success');
      setOfferForm({ title: '', description: '', discount: '', code: '', expiry: '', conditions: '' });
      setOfferModal(false);
      loadOffers(vendor.id);
    } catch {
      showToast('Could not create offer', 'error');
    }
    setSavingOffer(false);
  };

  const removeOffer = async (offerId: string) => {
    setDeletingOfferId(offerId);
    try {
      await offerService.deleteOffer(offerId);
      showToast('Offer deleted', 'info');
      loadOffers(vendor.id);
    } catch {
      showToast('Could not delete offer', 'error');
    } finally {
      setDeletingOfferId(null);
    }
  };

  const saveSettings = async () => {
    if (!settingsForm) return;
    setSavingSettings(true);
    try {
      await updateVendorSettings(vendor.id, {
        name: settingsForm.name.trim() || vendor.name,
        description: settingsForm.description.trim() || vendor.description,
        phone: settingsForm.phone.trim(),
        secondaryPhone: settingsForm.secondaryPhone.trim(),
        website: settingsForm.website.trim(),
        socialLinks: {
          instagram: settingsForm.instagram.trim(),
          facebook: settingsForm.facebook.trim(),
          whatsapp: settingsForm.whatsapp.trim(),
        },
        hours: { ...vendor.hours, open: settingsForm.open, close: settingsForm.close },
        location: { ...vendor.location, address: settingsForm.address.trim(), area: settingsForm.area.trim() },
        cuisine: settingsForm.cuisine,
        logo: settingsForm.logo,
        image: settingsForm.image || vendor.image, // banner is required server-side — never send it empty
        manualClosed: settingsForm.manualClosed,
        // self-reported FSSAI number -- hygieneRating/hygieneVerified
        // are admin-only and never sent from this form.
        fssaiLicenseNumber: settingsForm.fssaiLicenseNumber.trim(),
      });
      showToast('Settings saved', 'success');
      refreshVendor();
    } catch {
      showToast('Could not save settings', 'error');
    }
    setSavingSettings(false);
  };

  const stats: { icon: typeof Eye; label: string; value: string; change?: string; color: string; bg: string }[] = [
    { icon: Eye, label: 'Total views', value: vendor.views.toLocaleString(), color: 'text-brand-500', bg: 'bg-brand-50' },
    { icon: Star, label: 'Avg rating', value: vendor.rating ? vendor.rating.toFixed(1) : '—', change: `${vendor.reviewCount} reviews`, color: 'text-gold-500', bg: 'bg-gold-50' },
    { icon: TrendingUp, label: 'Popularity', value: `${vendor.popularity}%`, color: 'text-success-500', bg: 'bg-success-50' },
  ];

  const tabs: { id: Tab; label: string; icon: typeof Eye }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'offers', label: 'Offers', icon: Tag },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'settings', label: 'Settings', icon: Edit2 },
  ];

  return (
    <div className="container-app py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img src={vendor.logo} alt="" className="h-14 w-14 rounded-2xl object-cover" />
          <div>
            <h1 className="text-xl font-bold text-charcoal-900 md:text-2xl">{vendor.name}</h1>
            <p className="text-sm text-charcoal-500">Vendor dashboard</p>
          </div>
        </div>
        <Link to={`/vendor/${vendor.id}`} className="btn-secondary">View public page</Link>
      </div>

      {/* approval-status banner — a pending/rejected listing is
          only ever visible to its owner (and admins), so the vendor
          needs a clear signal here about why it isn't public yet. */}
      {vendor.approvalStatus === 'pending' && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-gold-200 bg-gold-50 p-4 text-sm text-gold-900">
          <Clock size={18} className="shrink-0" />
          <div>
            <p className="font-semibold">Awaiting approval</p>
            <p className="text-gold-800">Your listing is pending review by our team and isn't visible to customers yet. You can still edit everything below in the meantime.</p>
          </div>
        </div>
      )}
      {vendor.approvalStatus === 'rejected' && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-800">
          <Trash2 size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Listing rejected</p>
            <p>{vendor.rejectionReason || 'No reason was given.'}</p>
            <p className="mt-1 text-danger-700">Update your details below to address the issue — an admin will need to re-review before this goes live.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                  <Icon size={20} className={stat.color} />
                </div>
                {stat.change && <span className="text-xs font-semibold text-charcoal-400">{stat.change}</span>}
              </div>
              <p className="text-2xl font-extrabold text-charcoal-900">{stat.value}</p>
              <p className="text-xs text-charcoal-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-charcoal-200 no-scrollbar">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors ${tab === id ? 'text-brand-600' : 'text-charcoal-500 hover:text-charcoal-700'}`}
          >
            <Icon size={16} /> {label}
            {tab === id && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-brand-500" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <h3 className="mb-3 font-bold text-charcoal-900">Popular dishes</h3>
              <div className="space-y-3">
                {vendor.menu.filter((m) => m.popular).length === 0 && (
                  <p className="text-sm text-charcoal-400">Mark a menu item as popular to feature it here.</p>
                )}
                {vendor.menu.filter((m) => m.popular).slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img src={item.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-charcoal-800">{item.name}</p>
                    </div>
                    <span className="text-sm font-bold text-charcoal-700">{formatPrice(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="mb-3 font-bold text-charcoal-900">Recent reviews</h3>
              <div className="space-y-3">
                {reviews.length === 0 && <p className="text-sm text-charcoal-400">No reviews yet.</p>}
                {reviews.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-start gap-2">
                    <img src={r.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-charcoal-800">{r.author}</p>
                      <p className="line-clamp-1 text-xs text-charcoal-500">{r.text}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-gold-600"><Star size={11} fill="currentColor" />{r.rating}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'menu' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-charcoal-900">Menu items ({vendor.menu.length})</h3>
            <button onClick={() => openMenuModal(null)} className="btn-primary"><Plus size={16} /> Add item</button>
          </div>
          <div className="space-y-3">
            {vendor.menu.map((item) => (
              <div key={item.id} className="card flex items-center gap-4 p-4">
                <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-charcoal-900">{item.name}</h4>
                    {item.popular && <span className="badge bg-gold-100 text-gold-700">Popular</span>}
                    {!item.available && <span className="badge bg-danger-100 text-danger-600">Out of stock</span>}
                  </div>
                  <p className="line-clamp-1 text-sm text-charcoal-500">{item.description}</p>
                  <p className="text-xs text-charcoal-400">{item.category} · {item.veg}</p>
                </div>
                <span className="shrink-0 font-bold text-charcoal-900">{formatPrice(item.price)}</span>
                <div className="flex gap-1">
                  <button onClick={() => openMenuModal(item)} aria-label="Edit item" className="rounded-lg p-2 text-charcoal-400 hover:bg-charcoal-100 hover:text-charcoal-700"><Edit2 size={16} /></button>
                  <button onClick={() => removeMenuItem(item)} aria-label="Delete item" className="rounded-lg p-2 text-charcoal-400 hover:bg-danger-50 hover:text-danger-500"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'offers' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-charcoal-900">Your offers ({vendorOffers.length})</h3>
            <button onClick={() => setOfferModal(true)} className="btn-primary" disabled={savingOffer}><Plus size={16} /> {savingOffer ? 'Please wait…' : 'Create offer'}</button>
          </div>
          <div className="space-y-3">
            {vendorOffers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-charcoal-200 py-12 text-center">
                <Tag size={32} className="mx-auto mb-3 text-charcoal-300" />
                <p className="text-charcoal-500">No offers yet. Create one to attract more customers!</p>
              </div>
            ) : vendorOffers.map((offer) => (
              <div key={offer.id} className={`flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r ${offer.color} p-4 text-white ${offer.isActive ? '' : 'opacity-60'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-extrabold">{offer.discount}</p>
                    {!offer.isActive && <span className="badge bg-white/20 text-white">Expired</span>}
                  </div>
                  <p className="text-sm text-white/90">{offer.title}</p>
                  <p className="mt-1 text-xs text-white/70">Code: {offer.code} · Exp: {offer.expiry}</p>
                </div>
                <button onClick={() => removeOffer(offer.id)} aria-label="Delete offer" className="rounded-lg bg-white/20 p-2 hover:bg-white/30" disabled={deletingOfferId === offer.id}>{deletingOfferId === offer.id ? '…' : <Trash2 size={16} />}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'reviews' && (
        <div>
          <div className="mb-4 flex items-center gap-4">
            <div>
              <p className="text-4xl font-extrabold text-charcoal-900">{vendor.rating.toFixed(1)}</p>
              <RatingStars rating={vendor.rating} size={18} />
              <p className="mt-1 text-sm text-charcoal-500">{vendor.reviewCount} reviews</p>
            </div>
          </div>
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="mb-2 flex items-center gap-3">
                  <img src={r.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                  <div className="flex-1">
                    <p className="font-semibold text-charcoal-800">{r.author}</p>
                    <div className="flex items-center gap-2">
                      <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} fill={i < r.rating ? 'currentColor' : 'none'} className={i < r.rating ? 'text-gold-500' : 'text-charcoal-200'} />)}</span>
                      <span className="text-xs text-charcoal-400">{r.date}</span>
                    </div>
                  </div>
                  <button onClick={() => showToast('Reply sent', 'success')} className="btn-secondary text-xs">Reply</button>
                </div>
                <p className="text-sm leading-relaxed text-charcoal-600">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && settingsForm && (
        <div className="max-w-2xl space-y-6">
          <div className="card p-5">
            <h3 className="mb-4 font-bold text-charcoal-900">Photos</h3>
            <div className="grid gap-5 sm:grid-cols-[112px_1fr]">
              <ImageUploadField
                label="Logo"
                shape="circle"
                value={settingsForm.logo}
                onChange={(logo) => setSettingsForm({ ...settingsForm, logo })}
                onError={(msg) => showToast(msg, 'error')}
                maxDimension={400}
              />
              <ImageUploadField
                label="Cover photo"
                shape="banner"
                value={settingsForm.image}
                onChange={(image) => setSettingsForm({ ...settingsForm, image })}
                onError={(msg) => showToast(msg, 'error')}
                maxDimension={1200}
                hint="Shown on your vendor card and profile page."
              />
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-charcoal-900">Business information</h3>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-charcoal-700">
                <span className={settingsForm.manualClosed ? 'text-danger-600' : 'text-success-600'}>
                  {settingsForm.manualClosed ? 'Temporarily closed' : 'Open as usual'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!settingsForm.manualClosed}
                  onClick={() => setSettingsForm({ ...settingsForm, manualClosed: !settingsForm.manualClosed })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${settingsForm.manualClosed ? 'bg-charcoal-200' : 'bg-success-500'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settingsForm.manualClosed ? 'translate-x-0.5' : 'translate-x-5'}`} />
                </button>
              </label>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Business name</label>
                <input value={settingsForm.name} onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })} className="input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Description</label>
                <textarea value={settingsForm.description} onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })} rows={3} className="input resize-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Cuisine type</label>
                <select value={settingsForm.cuisine} onChange={(e) => setSettingsForm({ ...settingsForm, cuisine: e.target.value as CuisineType })} className="input">
                  {CUISINE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Phone</label>
                  <div className="relative">
                    <Phone size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                    <input value={settingsForm.phone} onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })} className="input pl-11" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Secondary contact <span className="font-normal text-charcoal-400">(optional)</span></label>
                  <div className="relative">
                    <Phone size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                    <input value={settingsForm.secondaryPhone} onChange={(e) => setSettingsForm({ ...settingsForm, secondaryPhone: e.target.value })} placeholder="Manager / delivery number" className="input pl-11" />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Hours</label>
                <div className="relative flex items-center gap-2">
                  <Clock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                  <input type="time" value={settingsForm.open} onChange={(e) => setSettingsForm({ ...settingsForm, open: e.target.value })} className="input pl-11" aria-label="Opening time" />
                  <input type="time" value={settingsForm.close} onChange={(e) => setSettingsForm({ ...settingsForm, close: e.target.value })} className="input" aria-label="Closing time" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Address</label>
                  <div className="relative">
                    <MapPin size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                    <input value={settingsForm.address} onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })} className="input pl-11" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Area</label>
                  <input value={settingsForm.area} onChange={(e) => setSettingsForm({ ...settingsForm, area: e.target.value })} className="input" />
                </div>
              </div>
            </div>
          </div>

          {/* FSSAI/hygiene display */}
          <div className="card p-5">
            <h3 className="mb-1 font-bold text-charcoal-900">Food safety</h3>
            <p className="mb-4 text-xs text-charcoal-500">Your FSSAI number is shown on your public page. Hygiene rating and verification badge are set by our team after a review — you can't edit those here.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">FSSAI license number</label>
                <input
                  value={settingsForm.fssaiLicenseNumber}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fssaiLicenseNumber: e.target.value })}
                  placeholder="14-digit FSSAI number"
                  className="input"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Hygiene verification</label>
                {vendor.hygieneVerified ? (
                  <div className="flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-3 py-2.5 text-sm font-semibold text-success-700">
                    <Star size={15} className="fill-success-500 text-success-500" /> Verified{vendor.hygieneRating ? ` · ${vendor.hygieneRating}/5` : ''}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-charcoal-300 px-3 py-2.5 text-sm text-charcoal-500">Not yet verified</div>
                )}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 font-bold text-charcoal-900">Website & social</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Website</label>
                <div className="relative">
                  <Globe size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                  <input value={settingsForm.website} onChange={(e) => setSettingsForm({ ...settingsForm, website: e.target.value })} placeholder="https://…" className="input pl-11" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Instagram</label>
                  <input value={settingsForm.instagram} onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })} placeholder="@handle" className="input" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Facebook</label>
                  <input value={settingsForm.facebook} onChange={(e) => setSettingsForm({ ...settingsForm, facebook: e.target.value })} placeholder="Page URL or name" className="input" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">WhatsApp</label>
                  <input value={settingsForm.whatsapp} onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })} placeholder="Number" className="input" />
                </div>
              </div>
            </div>
          </div>

          <button onClick={saveSettings} disabled={savingSettings} className="btn-primary disabled:opacity-60">
            {savingSettings ? <Loader2 size={16} className="animate-spin" /> : null} Save changes
          </button>
        </div>
      )}

      {/* Menu modal */}
      <Modal open={menuModal} onClose={() => setMenuModal(false)} title={editingItem ? 'Edit menu item' : 'Add menu item'}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Item name</label>
            <input value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} placeholder="e.g. Chicken Biryani" className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Description</label>
            <textarea value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} rows={2} placeholder="Describe the dish..." className="input resize-none" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Price (₹)</label>
              <div className="relative">
                <DollarSign size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input type="number" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} placeholder="220" className="input pl-11" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Category</label>
              <select value={menuForm.category} onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value as FoodCategory })} className="input">
                <option value="">Select category</option>
                <option value="Biryani">Biryani</option>
                <option value="Dosa">Dosa</option>
                <option value="Momos">Momos</option>
                <option value="Chaat">Chaat</option>
                <option value="Shawarma">Shawarma</option>
                <option value="Burgers">Burgers</option>
                <option value="Desserts">Desserts</option>
                <option value="Tea & Coffee">Tea & Coffee</option>
                <option value="Chinese">Chinese</option>
                <option value="Andhra Meals">Andhra Meals</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Veg status</label>
            <select value={menuForm.veg} onChange={(e) => setMenuForm({ ...menuForm, veg: e.target.value as VegStatus })} className="input">
              <option value="veg">Veg</option>
              <option value="non-veg">Non-veg</option>
              <option value="egg">Egg</option>
            </select>
          </div>
          <button onClick={saveMenuItem} disabled={savingMenuItem} className="btn-primary w-full disabled:opacity-60">{savingMenuItem ? 'Saving…' : editingItem ? 'Save changes' : 'Add item'}</button>
        </div>
      </Modal>

      {/* Offer modal */}
      <Modal open={offerModal} onClose={() => setOfferModal(false)} title="Create offer">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Offer title</label>
            <input value={offerForm.title} onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })} placeholder="e.g. 20% off on Biryani" className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Short description</label>
            <input value={offerForm.description} onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })} placeholder="e.g. Valid on all biryani orders above ₹150" className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Discount</label>
            <input value={offerForm.discount} onChange={(e) => setOfferForm({ ...offerForm, discount: e.target.value })} placeholder="e.g. 20% OFF" className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Coupon code</label>
            <input value={offerForm.code} onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value })} placeholder="e.g. SPICE20" className="input font-mono" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Expiry date</label>
            <input type="date" value={offerForm.expiry} onChange={(e) => setOfferForm({ ...offerForm, expiry: e.target.value })} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Conditions</label>
            <textarea value={offerForm.conditions} onChange={(e) => setOfferForm({ ...offerForm, conditions: e.target.value })} rows={2} placeholder="Terms and conditions..." className="input resize-none" />
          </div>
          <button onClick={saveOffer} className="btn-primary w-full">Create offer</button>
        </div>
      </Modal>
    </div>
  );
}
