import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaPaperPlane, FaCircleCheck } from 'react-icons/fa6';
import { auth, sendPasswordResetEmail } from '@/services/firebase';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { GlassButton } from '@/components/ui/GlassButton';

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
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-12">
      <div className="w-full max-w-sm">

        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Forgot password
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-sm text-emerald-700">
              <FaCircleCheck className="mt-0.5 shrink-0" size={14} />
              <span>{success}</span>
            </div>
          )}

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

          <p className="pt-2 text-center text-sm text-slate-500">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-hydro hover:text-hydro-light transition">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}