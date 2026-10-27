// File: src/pages/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaPaperPlane } from 'react-icons/fa6';
import { auth, sendPasswordResetEmail } from '@/services/firebase';
import { AuthShell, authLinkCls } from '@/components/layout/AuthShell';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { Notice } from '@/components/ui/Notice';

/**
 * If VITE_RESET_API_URL is set (e.g. http://localhost:8787), the request goes to
 * your own mail server, which sends the email from your SMTP sender and links
 * straight to this app (recommended — delivers oobCode to localhost).
 *
 * If it is NOT set, we fall back to Firebase's built-in email. In that mode the
 * link opens Firebase's hosted page; continueUrl only brings the user back to
 * /login AFTER they finish resetting there.
 */
const RESET_API_URL = import.meta.env.VITE_RESET_API_URL;

const GENERIC_SUCCESS =
  'If an account exists for that email, a reset link has been sent. Please check your inbox.';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setBusy(true);

    const cleanEmail = email.trim();

    try {
      if (RESET_API_URL) {
        const res = await fetch(`${RESET_API_URL.replace(/\/+$/, '')}/api/password-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });

        if (res.status === 429) {
          throw Object.assign(new Error('Too many requests. Please wait a few minutes and try again.'), { custom: true });
        }
        if (!res.ok) {
          throw Object.assign(new Error('Please enter a valid email address.'), { custom: true });
        }
      } else {
        const actionCodeSettings = {
          url: `${window.location.origin}/login`, // continueUrl (localhost is an authorized domain by default)
          handleCodeInApp: false,
        };
        await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
      }

      // Same message whether or not the account exists (prevents email enumeration).
      setSuccess(GENERIC_SUCCESS);
    } catch (err) {
      if (err?.code === 'auth/user-not-found') {
        setSuccess(GENERIC_SUCCESS);
      } else if (err?.custom) {
        setError(err.message);
      } else if (err?.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes and try again.');
      } else {
        setError('Could not send the reset email. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link."
      width="sm"
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className={authLinkCls}>Back to sign in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        {success && <Notice tone="success">{success}</Notice>}

        <FloatingInput
          id="forgot-email"
          label="Email"
          type="email"
          icon={FaEnvelope}
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <GlassButton
          type="submit"
          loading={busy}
          leftIcon={<FaPaperPlane size={13} />}
          fullWidth
        >
          {busy ? 'Sending…' : 'Send reset link'}
        </GlassButton>
      </form>
    </AuthShell>
  );
}