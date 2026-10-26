import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Utensils, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as authService from '@/services/authService';
import { useToast } from '@/contexts/ToastContext';

// password reset -- step 2, the link the user clicked in their
// email lands here with ?token=... and they set a new password.
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8 || !/\d/.test(password)) {
      setError('Password must be at least 8 characters and include a number.');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      showToast('Password reset — please sign in again.', 'success');
      setTimeout(() => navigate('/login'), 1500);
    } catch {
      setError('That reset link is invalid or has expired. Request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="container-app flex min-h-[calc(100vh-72px)] items-center justify-center py-10">
        <div className="card w-full max-w-md p-6 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-danger-500" />
          <p className="font-semibold text-charcoal-800">This link is missing its reset token.</p>
          <Link to="/forgot-password" className="mt-3 inline-block font-semibold text-brand-700 hover:text-brand-800">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app flex min-h-[calc(100vh-72px)] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-btn-3d text-white shadow-raised-3d"><Utensils size={24} /></span>
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold text-charcoal-900">Set a new password</h1>
        </div>

        <div className="card p-6 md:p-7">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 size={40} className="text-success-500" />
              <p className="font-semibold text-charcoal-800">Password updated. Redirecting to sign in…</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">New password</label>
                  <div className="relative">
                    <Lock size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="input px-11" aria-label="New password" />
                    <button type="button" onClick={() => setShowPass(!showPass)} aria-label="Toggle password visibility" className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-charcoal-400">At least 8 characters, with a number.</p>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Resetting…' : <>Reset password <ArrowRight size={18} /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
