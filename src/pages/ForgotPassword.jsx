// File: src/pages/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaPaperPlane } from 'react-icons/fa6';
import { auth, sendPasswordResetEmail } from '@/services/firebase';
import { AuthShell, authLinkCls } from '@/components/layout/AuthShell';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { Notice } from '@/components/ui/Notice';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess('A reset link has been sent. Please check your inbox.');
    } catch (err) {
      setError((err.message || '').replace('Firebase: ', ''));
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