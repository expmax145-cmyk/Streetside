import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Utensils, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import * as authService from '@/services/authService';

// password reset -- step 1, request the reset email.
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
    } finally {
      // The backend always returns 200 here regardless of whether the
      // email exists (prevents account enumeration) -- so the UI shows
      // the same "check your email" state either way, on success or
      // even if the request technically errors network-side, since
      // revealing the difference would leak the same information.
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="container-app flex min-h-[calc(100vh-72px)] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-btn-3d text-white shadow-raised-3d"><Utensils size={24} /></span>
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold text-charcoal-900">Reset your password</h1>
          <p className="mt-1.5 text-charcoal-500">We'll email you a link to set a new one</p>
        </div>

        <div className="card p-6 md:p-7">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 size={40} className="text-success-500" />
              <p className="font-semibold text-charcoal-800">If that email is registered, a reset link is on its way.</p>
              <p className="text-sm text-charcoal-500">Check your inbox (and spam folder) — the link expires in 1 hour.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-charcoal-700">Email</label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="input pl-11" aria-label="Email" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Sending…' : <>Send reset link <ArrowRight size={18} /></>}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-charcoal-500">
          Remembered it? <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
