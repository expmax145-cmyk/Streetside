import { useState } from 'react';
import { Mail, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import * as authService from '@/services/authService';

// a slim, dismissible banner -- never blocks any action, just
// nudges the user to verify. Dismissal is per-session (component state),
// not persisted, so it reappears next visit until the user actually
// verifies -- deliberately, since an unverified email is worth
// resurfacing rather than silently forgetting forever.
export function EmailVerificationBanner() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerified !== false || dismissed) return null;

  const resend = async () => {
    setSending(true);
    try {
      await authService.resendVerification();
      showToast('Verification email sent — check your inbox.', 'success');
    } catch {
      showToast('Could not send the verification email. Try again shortly.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-gold-100 px-4 py-2 text-sm text-gold-900">
      <span className="flex items-center gap-2"><Mail size={15} /> Please verify your email address.</span>
      <div className="flex items-center gap-3">
        <button onClick={resend} disabled={sending} className="font-semibold underline decoration-dotted underline-offset-2 hover:no-underline disabled:opacity-60">
          {sending ? 'Sending…' : 'Resend link'}
        </button>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="text-gold-700 hover:text-gold-900"><X size={16} /></button>
      </div>
    </div>
  );
}
