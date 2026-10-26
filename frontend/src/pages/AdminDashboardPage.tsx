import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Store, BarChart3, Flag, TrendingUp, Eye, Search, CheckCircle2, XCircle, AlertCircle, Utensils, Tag, Calendar, Plus, Edit2, Trash2, ShieldCheck, Clock } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useData } from '@/contexts/DataContext';
import * as adminService from '@/services/adminService';
import { RatingStars } from '@/components/ToastContainer';
import { Modal } from '@/components/Modal';
import { vendorIsOpenNow } from '@/lib/format';
import type { AdminUser, Report, EventItem, FoodTrail, TrailStop } from '@/types';
import type { AdminVendor } from '@/services/vendorService';

type Tab = 'overview' | 'vendors' | 'pending' | 'users' | 'reports' | 'content';

export function AdminDashboardPage() {
  const { showToast } = useToast();
  const { vendors, offers, events, foodTrails, remoteLoading: dataLoading, remoteError: dataError, reloadVendors, addEvent, updateEvent, deleteEvent, addFoodTrail, updateFoodTrail, deleteFoodTrail } = useData();
  // Users and reports are admin-only resources with their own endpoints
  // (GET /api/admin/users, /api/admin/reports) — fetched here directly
  // rather than from a local fixture, which is what this page used to
  // render regardless of what was actually in the database.
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reportsList, setReportsList] = useState<Report[]>([]);
  // admin's own vendor list, includes inactive vendors that the
  // public DataContext.vendors list (used everywhere else) never returns.
  const [adminVendors, setAdminVendors] = useState<AdminVendor[]>([]);
  const [togglingVendorId, setTogglingVendorId] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');

  const emptyEventForm = { name: '', description: '', longDescription: '', image: '', date: '', time: '', location: '', area: '', featured: false };
  const [eventModal, setEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const emptyTrailForm = { name: '', description: '', image: '', duration: '', distance: '', difficulty: 'Easy' as FoodTrail['difficulty'], stops: [{ order: 1, vendorId: '', note: '' }] as TrailStop[] };
  const [trailModal, setTrailModal] = useState(false);
  const [editingTrail, setEditingTrail] = useState<FoodTrail | null>(null);
  const [trailForm, setTrailForm] = useState(emptyTrailForm);
  const [savingTrail, setSavingTrail] = useState(false);
  const [deletingTrailId, setDeletingTrailId] = useState<string | null>(null);

  const loadAdminData = () => {
    setAdminLoading(true);
    setAdminError(false);
    // fetch the admin-only vendor list (all vendors) alongside
    // users/reports, instead of relying on the public 50-cap active list.
    Promise.all([adminService.listUsers(), adminService.listReports(), adminService.listVendors()])
      .then(([userList, reportList, vendorList]) => {
        setUsers(userList);
        setReportsList(reportList);
        setAdminVendors(vendorList);
      })
      .catch(() => setAdminError(true))
      .finally(() => setAdminLoading(false));
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // activate/deactivate a vendor from the admin dashboard
  const toggleVendorStatus = async (v: AdminVendor) => {
    setTogglingVendorId(v.id);
    try {
      const updated = await adminService.patchVendorStatus(v.id, !v.isActive);
      setAdminVendors((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      showToast(updated.isActive ? 'Vendor reactivated' : 'Vendor deactivated', 'info');
      // Public list (DataContext) may now be stale for this vendor — refresh it too
      reloadVendors();
    } catch {
      showToast('Could not update vendor status. Please try again.', 'error');
    } finally {
      setTogglingVendorId(null);
    }
  };

  // vendor approval gate
  const [decidingVendorId, setDecidingVendorId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<AdminVendor | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const approvePendingVendor = async (vendorId: string) => {
    setDecidingVendorId(vendorId);
    try {
      const updated = await adminService.approveVendor(vendorId);
      setAdminVendors((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      showToast('Vendor approved — now visible to customers', 'success');
      reloadVendors();
    } catch {
      showToast('Could not approve this vendor. Please try again.', 'error');
    } finally {
      setDecidingVendorId(null);
    }
  };

  const openRejectModal = (v: AdminVendor) => {
    setRejectReason('');
    setRejectModal(v);
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    setDecidingVendorId(rejectModal.id);
    try {
      const updated = await adminService.rejectVendor(rejectModal.id, rejectReason.trim());
      setAdminVendors((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      showToast('Vendor rejected', 'info');
      setRejectModal(null);
    } catch {
      showToast('Could not reject this vendor. Please try again.', 'error');
    } finally {
      setDecidingVendorId(null);
    }
  };

  // hygiene verification
  const [hygieneModal, setHygieneModal] = useState<AdminVendor | null>(null);
  const [hygieneRatingInput, setHygieneRatingInput] = useState(5);
  const [savingHygiene, setSavingHygiene] = useState(false);

  const openHygieneModal = (v: AdminVendor) => {
    setHygieneRatingInput(v.hygieneRating || 5);
    setHygieneModal(v);
  };

  const saveHygiene = async (verified: boolean) => {
    if (!hygieneModal) return;
    setSavingHygiene(true);
    try {
      const updated = await adminService.setVendorHygiene(hygieneModal.id, {
        hygieneVerified: verified,
        hygieneRating: verified ? hygieneRatingInput : undefined,
      });
      setAdminVendors((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      showToast(verified ? 'Hygiene verification saved' : 'Hygiene verification removed', 'success');
      reloadVendors();
      setHygieneModal(null);
    } catch {
      showToast('Could not save hygiene verification. Please try again.', 'error');
    } finally {
      setSavingHygiene(false);
    }
  };

  const remoteLoading = dataLoading || adminLoading;
  const remoteError = dataError || adminError;

  if (remoteLoading && users.length === 0 && vendors.length === 0) {
    return (
      <div className="container-app py-20 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
        <p className="text-charcoal-500">Loading admin dashboard…</p>
      </div>
    );
  }

  if (remoteError && users.length === 0 && vendors.length === 0) {
    return (
      <div className="container-app py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-charcoal-900">Couldn't load the admin dashboard</h1>
        <p className="mb-4 text-charcoal-500">There was a problem reaching StreetSide's servers.</p>
        <button onClick={() => { reloadVendors(); loadAdminData(); }} className="btn-primary">Try again</button>
      </div>
    );
  }

  // overview totals now come from adminVendors (all vendors, from
  // /admin/vendors) rather than the public, active-only capped list — so
  // counts are correct even when there are deactivated vendors or more
  // than 50 total.
  const totalViews = adminVendors.reduce((sum, v) => sum + v.views, 0);
  const activeVendorCount = adminVendors.filter((v) => v.isActive).length;
  const pendingReports = reportsList.filter((r) => r.status === 'pending').length;
  const usersByRole = (['customer', 'vendor', 'admin'] as const).map((role) => ({
    role, count: users.filter((u) => u.role === role).length,
  }));

  const stats = [
    { icon: Users, label: 'Total users', value: users.length, color: 'text-brand-500', bg: 'bg-brand-50' },
    { icon: Store, label: 'Vendors', value: `${activeVendorCount} / ${adminVendors.length}`, color: 'text-success-500', bg: 'bg-success-50' },
    { icon: Flag, label: 'Pending reports', value: pendingReports, color: 'text-danger-500', bg: 'bg-danger-50' },
    { icon: TrendingUp, label: 'Total vendor views', value: totalViews.toLocaleString(), color: 'text-gold-500', bg: 'bg-gold-50' },
  ];

  const pendingVendors = adminVendors.filter((v) => v.approvalStatus === 'pending');

  const tabs: { id: Tab; label: string; icon: typeof Eye; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'vendors', label: 'Vendors', icon: Store },
    { id: 'pending', label: 'Pending approval', icon: Clock, badge: pendingVendors.length || undefined },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reports', label: 'Reports', icon: Flag },
    { id: 'content', label: 'Content', icon: Tag },
  ];

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredReports = reportsList.filter((r) => reportFilter === 'all' || r.status === reportFilter);

  const handleReportAction = async (id: string, action: 'resolve' | 'dismiss') => {
    try {
      const status = action === 'resolve' ? 'resolved' : 'dismissed';
      await adminService.patchReport(id, status);
      // Only merge the status field from the response — the patch
      // endpoint doesn't re-populate the reporter's name, so overwriting
      // the whole row would blank that column out.
      setReportsList((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      showToast(action === 'resolve' ? 'Report resolved' : 'Report dismissed', action === 'resolve' ? 'success' : 'info');
    } catch {
      showToast('Could not update report', 'error');
    }
  };

  const openEventModal = (event?: EventItem) => {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        name: event.name, description: event.description, longDescription: event.longDescription,
        image: event.image, date: event.rawDate ? event.rawDate.slice(0, 10) : '', time: event.time,
        location: event.location, area: event.area, featured: event.featured,
      });
    } else {
      setEditingEvent(null);
      setEventForm(emptyEventForm);
    }
    setEventModal(true);
  };

  const saveEvent = async () => {
    if (!eventForm.name.trim() || !eventForm.date || !eventForm.location.trim()) {
      showToast('Name, date, and location are required', 'error');
      return;
    }
    setSavingEvent(true);
    try {
      const payload = { ...eventForm, date: new Date(eventForm.date).toISOString() };
      if (editingEvent) {
        await updateEvent(editingEvent.id, payload);
        showToast('Event updated', 'success');
      } else {
        await addEvent(payload);
        showToast('Event created', 'success');
      }
      setEventModal(false);
    } catch {
      showToast('Could not save event', 'error');
    } finally {
      setSavingEvent(false);
    }
  };

  const removeEvent = async (event: EventItem) => {
    if (!window.confirm(`Delete "${event.name}"? This can't be undone.`)) return;
    setDeletingEventId(event.id);
    try {
      await deleteEvent(event.id);
      showToast('Event deleted', 'info');
    } catch {
      showToast('Could not delete event', 'error');
    } finally {
      setDeletingEventId(null);
    }
  };

  const openTrailModal = (trail?: FoodTrail) => {
    if (trail) {
      setEditingTrail(trail);
      setTrailForm({
        name: trail.name, description: trail.description, image: trail.image,
        duration: trail.duration, distance: trail.distance, difficulty: trail.difficulty,
        stops: trail.stops.length > 0 ? trail.stops.map((s) => ({ ...s })) : [{ order: 1, vendorId: '', note: '' }],
      });
    } else {
      setEditingTrail(null);
      setTrailForm(emptyTrailForm);
    }
    setTrailModal(true);
  };

  const updateStop = (index: number, updates: Partial<TrailStop>) => {
    setTrailForm((prev) => ({ ...prev, stops: prev.stops.map((s, i) => (i === index ? { ...s, ...updates } : s)) }));
  };

  const addStop = () => {
    setTrailForm((prev) => ({ ...prev, stops: [...prev.stops, { order: prev.stops.length + 1, vendorId: '', note: '' }] }));
  };

  const removeStop = (index: number) => {
    setTrailForm((prev) => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 })),
    }));
  };

  const saveTrail = async () => {
    const validStops = trailForm.stops.filter((s) => s.vendorId);
    if (!trailForm.name.trim() || !trailForm.duration.trim() || !trailForm.distance.trim() || validStops.length === 0) {
      showToast('Name, duration, distance, and at least one stop with a vendor are required', 'error');
      return;
    }
    setSavingTrail(true);
    try {
      const payload = {
        name: trailForm.name, description: trailForm.description, image: trailForm.image,
        duration: trailForm.duration, distance: trailForm.distance, difficulty: trailForm.difficulty,
        stops: validStops.map((s, i) => ({ order: i + 1, vendor: s.vendorId, note: s.note })),
      };
      if (editingTrail) {
        await updateFoodTrail(editingTrail.id, payload);
        showToast('Food trail updated', 'success');
      } else {
        await addFoodTrail(payload);
        showToast('Food trail created', 'success');
      }
      setTrailModal(false);
    } catch {
      showToast('Could not save food trail', 'error');
    } finally {
      setSavingTrail(false);
    }
  };

  const removeTrail = async (trail: FoodTrail) => {
    if (!window.confirm(`Delete "${trail.name}"? This can't be undone.`)) return;
    setDeletingTrailId(trail.id);
    try {
      await deleteFoodTrail(trail.id);
      showToast('Food trail deleted', 'info');
    } catch {
      showToast('Could not delete food trail', 'error');
    } finally {
      setDeletingTrailId(null);
    }
  };

  return (
    <div className="container-app py-6 md:py-10">
      <div className="mb-6">
        <h1 className="page-title flex items-center gap-2"><BarChart3 size={26} className="text-brand-600" /> Admin dashboard</h1>
        <p className="text-charcoal-500">Manage vendors, users, reports, and platform content</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                  <Icon size={20} className={stat.color} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-charcoal-900">{stat.value}</p>
              <p className="text-xs text-charcoal-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-charcoal-200 no-scrollbar">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors ${tab === id ? 'text-brand-600' : 'text-charcoal-500 hover:text-charcoal-700'}`}
          >
            <Icon size={16} /> {label}
            {((id === 'reports' && pendingReports > 0) || (badge && badge > 0)) && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1 text-xs text-white">{id === 'reports' ? pendingReports : badge}</span>
            )}
            {tab === id && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-brand-500" />}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="mb-4 font-bold text-charcoal-900">Users by role</h3>
            <div className="flex items-end justify-center gap-8 py-2">
              {usersByRole.map(({ role, count }) => (
                <div key={role} className="flex flex-col items-center gap-1.5">
                  <div className="w-16 rounded-t-lg bg-gradient-to-t from-brand-400 to-brand-500" style={{ height: `${Math.max(count, 1) * 12 + 8}px` }} />
                  <span className="text-sm font-bold text-charcoal-700">{count}</span>
                  <span className="text-xs capitalize text-charcoal-400">{role}s</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <h3 className="mb-3 font-bold text-charcoal-900">Top vendors by views</h3>
              <div className="space-y-3">
                {[...adminVendors].filter((v) => v.isActive).sort((a, b) => b.views - a.views).slice(0, 5).map((v, i) => (
                  <Link key={v.id} to={`/vendor/${v.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-cream-100">
                    <span className="w-5 text-sm font-bold text-charcoal-400">{i + 1}</span>
                    <img src={v.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal-800">{v.name}</p>
                      <p className="text-xs text-charcoal-400">{v.views.toLocaleString()} views</p>
                    </div>
                    <RatingStars rating={v.rating} size={12} />
                  </Link>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="mb-3 font-bold text-charcoal-900">Recent reports</h3>
              <div className="space-y-3">
                {reportsList.slice(0, 4).map((r) => {
                  const status = r.status;
                  return (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg p-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${status === 'pending' ? 'bg-danger-50 text-danger-500' : status === 'resolved' ? 'bg-success-50 text-success-500' : 'bg-charcoal-100 text-charcoal-400'}`}>
                      {status === 'pending' ? <AlertCircle size={16} /> : status === 'resolved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal-800">{r.reason}</p>
                      <p className="text-xs text-charcoal-400 capitalize">{r.type} · {r.date}</p>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendors tab */}
      {tab === 'vendors' && (
        <div>
          {/* shows ALL vendors (active + inactive) — the admin can
              now see and restore listings that were deactivated, which
              the old public-list-backed view completely hid. */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-charcoal-900">All vendors ({adminVendors.length})</h3>
            <Link to="/vendor-register" className="btn-primary"><Store size={16} /> Add vendor</Link>
          </div>
          <div className="space-y-3">
            {adminVendors.map((v) => (
              <div key={v.id} className={`card flex items-center gap-4 p-4 ${!v.isActive ? 'opacity-60' : ''}`}>
                <img src={v.logo} alt="" className="h-12 w-12 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-bold text-charcoal-900">{v.name}</h4>
                  <p className="text-xs text-charcoal-500">{v.cuisine} · {v.location.area}</p>
                </div>
                <div className="hidden items-center gap-4 text-sm sm:flex">
                  <span className="flex items-center gap-1 text-charcoal-500"><Eye size={14} /> {v.views.toLocaleString()}</span>
                  <RatingStars rating={v.rating} size={12} />
                  {v.isActive ? (
                    <span className={`badge ${vendorIsOpenNow(v) ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-600'}`}>{vendorIsOpenNow(v) ? 'Open' : 'Closed'}</span>
                  ) : (
                    <span className="badge bg-charcoal-200 text-charcoal-600">Deactivated</span>
                  )}
                </div>
                <button
                  onClick={() => openHygieneModal(v)}
                  className="btn-secondary text-xs hover:border-gold-300 hover:text-gold-700"
                >
                  <ShieldCheck size={14} /> {v.hygieneVerified ? 'Verified' : 'Verify'}
                </button>
                <button
                  onClick={() => toggleVendorStatus(v)}
                  disabled={togglingVendorId === v.id}
                  className={`btn-secondary text-xs disabled:opacity-60 ${v.isActive ? 'hover:border-danger-300 hover:text-danger-600' : 'hover:border-success-300 hover:text-success-600'}`}
                >
                  {togglingVendorId === v.id ? '…' : v.isActive ? 'Deactivate' : 'Reactivate'}
                </button>
                <Link to={`/vendor/${v.id}`} className="btn-secondary text-xs">View</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* vendor approval gate — pending tab */}
      {tab === 'pending' && (
        <div>
          <h3 className="mb-4 font-bold text-charcoal-900">Pending approval ({pendingVendors.length})</h3>
          {pendingVendors.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={28} className="mb-3 text-success-500" />
              <p className="text-sm text-charcoal-500">No vendors waiting for review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingVendors.map((v) => (
                <div key={v.id} className="card p-4">
                  <div className="flex items-center gap-4">
                    <img src={v.logo} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-bold text-charcoal-900">{v.name}</h4>
                      <p className="text-xs text-charcoal-500">{v.cuisine} · {v.location.area} · {v.phone}</p>
                    </div>
                    <Link to={`/vendor/${v.id}`} className="btn-secondary text-xs">Preview</Link>
                    <button
                      onClick={() => approvePendingVendor(v.id)}
                      disabled={decidingVendorId === v.id}
                      className="btn-primary text-xs disabled:opacity-60"
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button
                      onClick={() => openRejectModal(v)}
                      disabled={decidingVendorId === v.id}
                      className="btn-secondary text-xs hover:border-danger-300 hover:text-danger-600 disabled:opacity-60"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === 'users' && (
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="font-bold text-charcoal-900">All users ({users.length})</h3>
            <div className="relative w-full max-w-xs">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="input pl-11 py-2 text-sm" aria-label="Search users" />
            </div>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-charcoal-100 text-left text-xs text-charcoal-400">
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Role</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Joined</th>
                  <th className="p-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-charcoal-100 last:border-0 hover:bg-cream-100">
                    <td className="p-3 font-semibold text-charcoal-800">{u.name}</td>
                    <td className="p-3 text-charcoal-500">{u.email}</td>
                    <td className="p-3"><span className={`badge capitalize ${u.role === 'admin' ? 'bg-brand-100 text-brand-700' : u.role === 'vendor' ? 'bg-gold-100 text-gold-700' : 'bg-charcoal-100 text-charcoal-600'}`}>{u.role}</span></td>
                    <td className="p-3"><span className={`badge ${u.status === 'active' ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-600'}`}>{u.status}</span></td>
                    <td className="p-3 text-charcoal-400">{u.joinedDate}</td>
                    <td className="p-3">
                      <button
                        onClick={async () => {
                          const nextStatus = u.status === 'active' ? 'suspended' : 'active';
                          try {
                            await adminService.patchUserStatus(u.id, nextStatus);
                            setUsers((current) => current.map((currentUser) => currentUser.id === u.id ? { ...currentUser, status: nextStatus } : currentUser));
                            showToast(nextStatus === 'suspended' ? 'User suspended' : 'User reactivated', 'info');
                          } catch {
                            showToast('Could not update user status', 'error');
                          }
                        }}
                        className={`text-xs font-semibold ${u.status === 'active' ? 'text-danger-500 hover:text-danger-600' : 'text-success-600 hover:text-success-700'}`}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports tab */}
      {tab === 'reports' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-charcoal-900">Reports</h3>
            <div className="flex gap-1">
              {(['all', 'pending', 'resolved', 'dismissed'] as const).map((f) => (
                <button key={f} onClick={() => setReportFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${reportFilter === f ? 'bg-brand-500 text-white' : 'bg-white text-charcoal-500 border border-charcoal-200 hover:text-brand-600'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-charcoal-200 py-12 text-center">
                <CheckCircle2 size={32} className="mx-auto mb-3 text-success-400" />
                <p className="text-charcoal-500">No reports in this category</p>
              </div>
            ) : filteredReports.map((r) => {
              const status = r.status;
              return (
              <div key={r.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${status === 'pending' ? 'bg-danger-50 text-danger-500' : status === 'resolved' ? 'bg-success-50 text-success-500' : 'bg-charcoal-100 text-charcoal-400'}`}>
                      {status === 'pending' ? <AlertCircle size={20} /> : status === 'resolved' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                    </div>
                    <div>
                      <p className="font-semibold text-charcoal-800">{r.reason}</p>
                      <p className="text-xs text-charcoal-400">Type: {r.type} · Target: {r.targetId} · {r.date}</p>
                    </div>
                  </div>
                  <span className={`badge capitalize ${status === 'pending' ? 'bg-danger-100 text-danger-600' : status === 'resolved' ? 'bg-success-100 text-success-700' : 'bg-charcoal-100 text-charcoal-500'}`}>{status}</span>
                </div>
                {status === 'pending' && (
                  <div className="mt-3 flex gap-2 border-t border-charcoal-50 pt-3">
                    <button onClick={() => handleReportAction(r.id, 'resolve')} className="btn-primary text-xs py-2"><CheckCircle2 size={14} /> Resolve</button>
                    <button onClick={() => handleReportAction(r.id, 'dismiss')} className="btn-secondary text-xs py-2"><XCircle size={14} /> Dismiss</button>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content tab */}
      {tab === 'content' && (
        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-charcoal-900">Food trails ({foodTrails.length})</h3>
              <button onClick={() => openTrailModal()} className="btn-secondary text-xs"><Plus size={14} /> Create trail</button>
            </div>
            <div className="space-y-2">
              {foodTrails.length === 0 && <p className="text-sm text-charcoal-400">No food trails yet.</p>}
              {foodTrails.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-charcoal-200 bg-cream-100 p-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-charcoal-700"><Utensils size={16} className="text-brand-600" /> {t.name}</span>
                  <div className="flex items-center gap-3">
                    <Link to={`/trails/${t.id}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">View</Link>
                    <button onClick={() => openTrailModal(t)} aria-label="Edit trail" className="rounded-lg p-1.5 text-charcoal-400 hover:bg-charcoal-100 hover:text-charcoal-700"><Edit2 size={14} /></button>
                    <button onClick={() => removeTrail(t)} aria-label="Delete trail" disabled={deletingTrailId === t.id} className="rounded-lg p-1.5 text-charcoal-400 hover:bg-danger-50 hover:text-danger-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-charcoal-900">Events ({events.length})</h3>
              <button onClick={() => openEventModal()} className="btn-secondary text-xs"><Plus size={14} /> Create event</button>
            </div>
            <div className="space-y-2">
              {events.length === 0 && <p className="text-sm text-charcoal-400">No events yet.</p>}
              {events.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-charcoal-200 bg-cream-100 p-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-charcoal-700"><Calendar size={16} className="text-brand-600" /> {e.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-charcoal-400">{e.date}</span>
                    <Link to={`/events/${e.id}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">View</Link>
                    <button onClick={() => openEventModal(e)} aria-label="Edit event" className="rounded-lg p-1.5 text-charcoal-400 hover:bg-charcoal-100 hover:text-charcoal-700"><Edit2 size={14} /></button>
                    <button onClick={() => removeEvent(e)} aria-label="Delete event" disabled={deletingEventId === e.id} className="rounded-lg p-1.5 text-charcoal-400 hover:bg-danger-50 hover:text-danger-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-charcoal-900">Offers ({offers.length})</h3>
              <Link to="/offers" className="btn-secondary text-xs">View all</Link>
            </div>
            <div className="space-y-2">
              {offers.slice(0, 4).map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border border-charcoal-200 bg-cream-100 p-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-charcoal-700"><Tag size={16} className="text-brand-600" /> {o.title}</span>
                  <span className="font-mono text-xs text-charcoal-400">{o.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Event create/edit modal */}
      <Modal open={eventModal} onClose={() => setEventModal(false)} title={editingEvent ? 'Edit event' : 'Create event'}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Name</label>
            <input value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} placeholder="e.g. Old City Food Festival" className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Description</label>
            <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} rows={2} className="input resize-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Long description</label>
            <textarea value={eventForm.longDescription} onChange={(e) => setEventForm({ ...eventForm, longDescription: e.target.value })} rows={3} className="input resize-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Image URL</label>
            <input value={eventForm.image} onChange={(e) => setEventForm({ ...eventForm, image: e.target.value })} placeholder="https://..." className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Date</label>
              <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Time</label>
              <input value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} placeholder="e.g. 6:00 PM" className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Location</label>
              <input value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Area</label>
              <input value={eventForm.area} onChange={(e) => setEventForm({ ...eventForm, area: e.target.value })} className="input" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-charcoal-700">
            <input type="checkbox" checked={eventForm.featured} onChange={(e) => setEventForm({ ...eventForm, featured: e.target.checked })} className="h-4 w-4 rounded border-charcoal-300" />
            Featured
          </label>
          <button onClick={saveEvent} disabled={savingEvent} className="btn-primary w-full justify-center">
            {savingEvent ? 'Saving...' : editingEvent ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </Modal>

      {/* Food trail create/edit modal */}
      <Modal open={trailModal} onClose={() => setTrailModal(false)} title={editingTrail ? 'Edit food trail' : 'Create food trail'}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Name</label>
            <input value={trailForm.name} onChange={(e) => setTrailForm({ ...trailForm, name: e.target.value })} placeholder="e.g. Old Town Evening Crawl" className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Description</label>
            <textarea value={trailForm.description} onChange={(e) => setTrailForm({ ...trailForm, description: e.target.value })} rows={2} className="input resize-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Image URL</label>
            <input value={trailForm.image} onChange={(e) => setTrailForm({ ...trailForm, image: e.target.value })} placeholder="https://..." className="input" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Duration</label>
              <input value={trailForm.duration} onChange={(e) => setTrailForm({ ...trailForm, duration: e.target.value })} placeholder="e.g. 2 hours" className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Distance</label>
              <input value={trailForm.distance} onChange={(e) => setTrailForm({ ...trailForm, distance: e.target.value })} placeholder="e.g. 1.5 km" className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Difficulty</label>
              <select value={trailForm.difficulty} onChange={(e) => setTrailForm({ ...trailForm, difficulty: e.target.value as FoodTrail['difficulty'] })} className="input">
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Foodie">Foodie</option>
              </select>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-charcoal-700">Stops</label>
              <button onClick={addStop} className="text-xs font-semibold text-brand-600 hover:text-brand-700">+ Add stop</button>
            </div>
            <div className="space-y-2">
              {trailForm.stops.map((stop, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 text-xs font-bold text-charcoal-400">{i + 1}</span>
                  <select value={stop.vendorId} onChange={(e) => updateStop(i, { vendorId: e.target.value })} className="input flex-1">
                    <option value="">Select vendor...</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <input value={stop.note} onChange={(e) => updateStop(i, { note: e.target.value })} placeholder="Note (optional)" className="input flex-1" />
                  {trailForm.stops.length > 1 && (
                    <button onClick={() => removeStop(i)} aria-label="Remove stop" className="rounded-lg p-2 text-charcoal-400 hover:bg-danger-50 hover:text-danger-500"><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button onClick={saveTrail} disabled={savingTrail} className="btn-primary w-full justify-center">
            {savingTrail ? 'Saving...' : editingTrail ? 'Save changes' : 'Create food trail'}
          </button>
        </div>
      </Modal>

      {/* reject-vendor reason modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title={`Reject ${rejectModal?.name ?? ''}`}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Reason (shown to the vendor)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Photos don't match the listed address"
              className="input resize-none"
              maxLength={300}
            />
          </div>
          <button
            onClick={confirmReject}
            disabled={decidingVendorId === rejectModal?.id}
            className="btn-primary w-full justify-center hover:bg-danger-600 disabled:opacity-60"
          >
            {decidingVendorId === rejectModal?.id ? 'Rejecting…' : 'Confirm rejection'}
          </button>
        </div>
      </Modal>

      {/* hygiene verification modal */}
      <Modal open={!!hygieneModal} onClose={() => setHygieneModal(null)} title={`Hygiene verification — ${hygieneModal?.name ?? ''}`}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Rating (1–5)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setHygieneRatingInput(n)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold transition-colors ${hygieneRatingInput === n ? 'border-success-500 bg-success-500 text-white' : 'border-charcoal-200 text-charcoal-600 hover:border-success-300'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => saveHygiene(true)} disabled={savingHygiene} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {savingHygiene ? 'Saving…' : 'Mark verified'}
            </button>
            {hygieneModal?.hygieneVerified && (
              <button onClick={() => saveHygiene(false)} disabled={savingHygiene} className="btn-secondary flex-1 justify-center hover:border-danger-300 hover:text-danger-600 disabled:opacity-60">
                Remove verification
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
