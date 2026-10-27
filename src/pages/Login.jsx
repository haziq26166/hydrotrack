// File: src/pages/Login.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaEnvelope, FaLock } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
import {
  auth, database, ref, get, set, googleProvider,
  signInWithEmailAndPassword, signInWithPopup,
} from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { AuthShell, authLinkCls } from '@/components/layout/AuthShell';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { Notice } from '@/components/ui/Notice';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [notice, setNotice]     = useState('');
  const [busy, setBusy]         = useState(false);

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

  useEffect(() => {
    if (params.get('reason') === 'inactivity') {
      setNotice('You were signed out due to inactivity.');
    }
  }, [params]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await ensureUserMirror(cred.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(pretty(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(''); setNotice(''); setBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await ensureUserMirror(cred.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(pretty(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your HydroTrack account."
      width="sm"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className={authLinkCls}>Create one</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {notice && <Notice tone="warning">{notice}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}

        <FloatingInput
          id="login-email"
          label="Email"
          type="email"
          icon={FaEnvelope}
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <FloatingInput
          id="login-password"
          label="Password"
          type="password"
          icon={FaLock}
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="rounded-md text-xs font-semibold text-ink-500 transition-colors hover:text-hydro focus-visible:outline-none focus-visible:underline"
          >
            Forgot password?
          </Link>
        </div>

        <GlassButton type="submit" loading={busy} fullWidth>
          {busy ? 'Signing in…' : 'Sign In'}
        </GlassButton>

        <div className="flex items-center gap-4 py-1">
          <div className="h-px flex-1 bg-ink-200/70" />
          <span className="text-xs font-semibold text-ink-400">or</span>
          <div className="h-px flex-1 bg-ink-200/70" />
        </div>

        <GlassButton
          type="button"
          variant="google"
          disabled={busy}
          leftIcon={<FcGoogle size={18} />}
          onClick={handleGoogle}
          fullWidth
        >
          Continue with Google
        </GlassButton>
      </form>
    </AuthShell>
  );
}

/* ---------- Helpers ---------- */
function pretty(err) {
  return (err?.message || 'Something went wrong.').replace('Firebase: ', '');
}

export async function ensureUserMirror(user) {
  if (!user) return;
  const emailSnap = await get(ref(database, `users/${user.uid}/email`));
  if (!emailSnap.exists() && user.email) {
    await set(ref(database, `users/${user.uid}/email`), user.email);
  }
  const nameSnap = await get(ref(database, `users/${user.uid}/displayName`));
  if (!nameSnap.exists() && user.displayName) {
    await set(ref(database, `users/${user.uid}/displayName`), user.displayName);
  }
  const settingsSnap = await get(ref(database, `users/${user.uid}/settings`));
  if (!settingsSnap.exists()) {
    await set(ref(database, `users/${user.uid}/settings`), { email_notifications: true });
  }
}