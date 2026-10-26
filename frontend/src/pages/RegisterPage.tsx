import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Utensils, UserRound, Mail, Lock, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => () => setLoading(false), []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await register(name, email, password, 'customer');
      if (result && result.ok) {
        showToast('Account created! +100 welcome points', 'success');
        navigate('/');
      }
      // On failure, the specific reason (e.g. a password/email rule that
      // wasn't met) is already surfaced by the global API error banner —
      // stay on this page so the person can see it and fix the form
      // instead of being bounced to the homepage.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-app flex min-h-[calc(100vh-72px)] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-btn-3d text-white shadow-raised-3d"><Utensils size={24} /></span>
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold text-charcoal-900">Create your account</h1>
          <p className="mt-1.5 text-charcoal-500">Join StreetSide and start exploring</p>
        </div>

        <div className="card p-6 md:p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Full name</label>
              <div className="relative">
                <UserRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" className="input pl-11" aria-label="Full name" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Email</label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="input pl-11" aria-label="Email" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Password</label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} pattern="(?=.*\d).{8,}" title="At least 8 characters, including a number" placeholder="At least 8 characters, with a number" className="input px-11" aria-label="Password" />
                <button type="button" onClick={() => setShowPass(!showPass)} aria-label="Toggle password visibility" className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-charcoal-200 bg-cream-200/60 p-3.5 text-xs text-charcoal-600">
              <p className="flex items-center gap-2"><Check size={14} className="text-success-600" /> Earn 100 welcome points</p>
              <p className="flex items-center gap-2"><Check size={14} className="text-success-600" /> Save your favorite vendors</p>
              <p className="flex items-center gap-2"><Check size={14} className="text-success-600" /> Unlock badges and rewards</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : <>Create account <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-charcoal-500">
          Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">Sign in</Link>
        </p>
        <p className="mt-2 text-center text-sm text-charcoal-500">
          Are you a vendor? <Link to="/vendor-register" className="font-semibold text-brand-700 hover:text-brand-800">List your business</Link>
        </p>
      </div>
    </div>
  );
}
