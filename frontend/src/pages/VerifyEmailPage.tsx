import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Utensils, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import * as authService from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

// lands here from the "verify your email" link.
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    authService.verifyEmail(token)
      .then(() => {
        setStatus('success');
        refreshUser().catch(() => {});
      })
      .catch(() => setStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="container-app flex min-h-[calc(100vh-72px)] items-center justify-center py-10">
      <div className="card w-full max-w-md p-8 text-center">
        <Link to="/" className="mb-5 inline-flex items-center gap-2.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-btn-3d text-white shadow-raised-3d"><Utensils size={24} /></span>
        </Link>
        {status === 'verifying' && (
          <>
            <Loader2 size={36} className="mx-auto mb-3 animate-spin text-brand-500" />
            <p className="font-semibold text-charcoal-800">Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 size={40} className="mx-auto mb-3 text-success-500" />
            <p className="font-semibold text-charcoal-800">Your email is verified!</p>
            <Link to="/" className="btn-primary mt-4 inline-flex">Continue to StreetSide</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={40} className="mx-auto mb-3 text-danger-500" />
            <p className="font-semibold text-charcoal-800">That verification link is invalid or has expired.</p>
            <p className="mt-1 text-sm text-charcoal-500">You can request a new one from your profile page.</p>
            <Link to="/profile" className="btn-secondary mt-4 inline-flex">Go to profile</Link>
          </>
        )}
      </div>
    </div>
  );
}
