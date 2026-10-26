import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Utensils, Store, Mail, Lock, Phone, MapPin, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import { MapView } from '@/components/MapView';

export function VendorRegisterPage() {
  const { register, refreshUser } = useAuth();
  const { addVendor } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => () => setLoading(false), []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!location) {
      showToast('Please mark your stall\'s location on the map', 'error');
      return;
    }
    setLoading(true);
    try {
      // Register FIRST — POST /api/vendors requires an authenticated
      // request (see backend vendor.routes.ts), so there must be an
      // access token before addVendor is called. The backend already
      // auto-links a freshly-created vendor listing to the current
      // 'vendor'-role account (vendor.service.ts:createVendor), so no
      // vendorId is passed at registration time — there's no vendor to
      // link to yet.
      const result = await register(name, email, password, 'vendor');
      if (!result.ok) {
        showToast('Registration failed. That email may already be in use.', 'error');
        return;
      }
      await addVendor({ name, phone, area, address, lat: location.lat, lng: location.lng });
      // Pull the freshly-linked vendorId onto the in-memory user so the
      // dashboard (which looks up the vendor via user.vendorId) finds it
      // immediately, without waiting for a page reload.
      await refreshUser();
      showToast('Vendor account created! Welcome to StreetSide.', 'success');
      navigate('/vendor-dashboard');
    } catch {
      showToast('Could not complete vendor sign-up. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-app flex min-h-[calc(100vh-72px)] items-center justify-center py-10">
      <div className="w-full max-w-lg">
        <div className="mb-7 text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-btn-3d text-white shadow-raised-3d"><Utensils size={24} /></span>
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold text-charcoal-900">List your business</h1>
          <p className="mt-1 text-charcoal-500">Reach thousands of food lovers in your city</p>
        </div>

        <div className="card p-6">
          {/* Benefits banner */}
          <div className="mb-5 grid grid-cols-3 gap-3 rounded-xl bg-gradient-to-br from-brand-50 to-gold-50 p-4">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-brand-600">15k+</p>
              <p className="text-xs text-charcoal-500">Active users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-brand-600">3x</p>
              <p className="text-xs text-charcoal-500">More visibility</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-brand-600">Free</p>
              <p className="text-xs text-charcoal-500">To get started</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Business name</label>
              <div className="relative">
                <Store size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Spice Hub" className="input pl-11" aria-label="Business name" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Email</label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="input pl-11" aria-label="Email" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Phone</label>
                <div className="relative">
                  <Phone size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98660..." className="input pl-11" aria-label="Phone" />
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Area / Location</label>
              <div className="relative">
                <MapPin size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Governorpet, Vijayawada" className="input pl-11" aria-label="Area" required />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Street address</label>
              <div className="relative">
                <MapPin size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12-3-45, MG Road" className="input pl-11" aria-label="Street address" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">
                Mark your stall on the map <span className="font-normal text-charcoal-400">— tap to place a pin</span>
              </label>
              <MapView vendors={[]} pickable pickedLocation={location} onPick={setLocation} />
              <p className="mt-1.5 text-xs text-charcoal-400">
                {location ? `Location set: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Required — this is what powers your map pin, nearby search, and distance sorting.'}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Password</label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} pattern="(?=.*\d).{8,}" title="At least 8 characters, including a number" placeholder="At least 8 characters, with a number" className="input pl-11" aria-label="Password" />
              </div>
            </div>
            <div className="space-y-2 rounded-xl bg-cream-100 p-3 text-xs text-charcoal-500">
              <p className="flex items-center gap-2"><Check size={14} className="text-success-500" /> Free listing with photos and menu</p>
              <p className="flex items-center gap-2"><Check size={14} className="text-success-500" /> Analytics dashboard to track views</p>
              <p className="flex items-center gap-2"><Check size={14} className="text-success-500" /> Create offers to attract customers</p>
            </div>
            <button type="submit" disabled={loading || !location} className="btn-primary w-full">
              {loading ? 'Setting up your account...' : <>Get listed <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-charcoal-500">
          Already have a vendor account? <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
