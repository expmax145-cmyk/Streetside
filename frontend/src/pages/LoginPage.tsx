import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Utensils, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => () => setLoading(false), []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.ok) {
        showToast('Welcome back!', 'success');
        navigate(from);
      } else {
        setError(result.error || 'Incorrect email or password.');
      }
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
          <h1 className="mt-4 text-2xl font-extrabold text-charcoal-900">Welcome back</h1>
          <p className="mt-1.5 text-charcoal-500">Sign in to access your favorites and rewards</p>
        </div>

        <div className="card p-6 md:p-7">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Email</label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="input pl-11" aria-label="Email" />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-semibold text-charcoal-700">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand-700 hover:text-brand-800">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="input px-11" aria-label="Password" />
                <button type="button" onClick={() => setShowPass(!showPass)} aria-label="Toggle password visibility" className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : <>Sign in <ArrowRight size={18} /></>}
            </button>
          </form>

        </div>

        <p className="mt-4 text-center text-sm text-charcoal-500">
          New to StreetSide? <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
