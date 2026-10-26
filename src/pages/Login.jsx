import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaEnvelope, FaLock, FaGoogle } from 'react-icons/fa6';
import {
  auth, database, ref, get, set, googleProvider,
  signInWithEmailAndPassword, signInWithPopup,
} from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { GlassButton } from '@/components/ui/GlassButton';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

  useEffect(() => {
    if (params.get('reason') === 'inactivity') {
      setError('You were signed out due to inactivity.');
    }
  }, [params]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
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
    setError(''); setBusy(true);
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
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-12">
      <div className="w-full max-w-sm">

        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Welcome back to HydroTrack.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

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

          <div className="flex justify-end pt-1">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-slate-500 hover:text-hydro transition"
            >
              Forgot password?
            </Link>
          </div>

          <GlassButton
            type="submit"
            loading={busy}
            fullWidth
          >
            {busy ? 'Signing in…' : 'Sign In'}
          </GlassButton>

          <div className="flex items-center gap-4 pt-1">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <GlassButton
            type="button"
            variant="google"
            disabled={busy}
            leftIcon={<FaGoogle className="text-red-500" size={15} />}
            onClick={handleGoogle}
            fullWidth
          >
            Continue with Google
          </GlassButton>

          <p className="pt-2 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-hydro hover:text-hydro-light transition"
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
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