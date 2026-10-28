import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaUser, FaUserPlus } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
import {
  auth, database, ref, set, get,
  createUserWithEmailAndPassword, updateProfile,
  googleProvider, signInWithPopup,
} from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { AuthShell, authLinkCls } from '@/components/layout/AuthShell';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { Notice, FieldError } from '@/components/ui/Notice';
import {
  PasswordStrength, evaluatePassword, passwordScore, isPasswordValid,
} from '@/components/ui/PasswordStrength';

/* ============================================================
   EMAIL VALIDATION
   ============================================================ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(raw) {
  const v = raw.trim();
  if (!v) return null;
  if (v.includes('..')) return 'Email cannot contain consecutive dots.';
  if (!v.includes('@')) return 'Email must contain an @ sign.';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address (name@example.com).';
  return null;
}

/* ============================================================
   RTDB MIRROR — idempotent, safe to call for both auth methods
   ============================================================ */
async function ensureUserMirror(user) {
  if (!user) return;

  const emailSnap = await get(ref(database, `users/${user.uid}/email`));
  if (!emailSnap.exists() && user.email) {
    await set(ref(database, `users/${user.uid}/email`), user.email);
  }

  const nameSnap = await get(ref(database, `users/${user.uid}/displayName`));
  if (!nameSnap.exists() && user.displayName) {
    await set(ref(database, `users/${user.uid}/displayName`), user.displayName);
  }

  const createdSnap = await get(ref(database, `users/${user.uid}/createdAt`));
  if (!createdSnap.exists()) {
    await set(ref(database, `users/${user.uid}/createdAt`), Date.now());
  }

  const settingsSnap = await get(ref(database, `users/${user.uid}/settings`));
  if (!settingsSnap.exists()) {
    await set(ref(database, `users/${user.uid}/settings`), { email_notifications: true });
  }
}

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirm: '',
  });
  const [error, setError]               = useState('');
  const [busy, setBusy]                 = useState(false);
  const [googleBusy, setGoogleBusy]     = useState(false);
  const [pwFocused, setPwFocused]       = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* ============================================================
     REAL-TIME VALIDATION STATE
     ============================================================ */
  const pwChecks  = useMemo(() => evaluatePassword(form.password), [form.password]);
  const pwScore   = useMemo(() => passwordScore(pwChecks), [pwChecks]);
  const pwIsValid = useMemo(() => isPasswordValid(pwChecks), [pwChecks]);

  const emailError = useMemo(() => {
    if (!emailTouched && form.email.length < 5) return null;
    return validateEmail(form.email);
  }, [form.email, emailTouched]);

  const confirmError = useMemo(() => {
    if (!form.confirm) return null;
    return form.confirm === form.password ? null : 'Passwords do not match.';
  }, [form.password, form.confirm]);

  const showStrength = pwFocused || form.password.length > 0;

  const canSubmit =
    form.fullName.trim().length >= 2 &&
    !emailError && form.email.length > 0 &&
    pwIsValid &&
    form.password === form.confirm &&
    !busy && !googleBusy;

  /* ============================================================
     EMAIL/PASSWORD SUBMIT
     ============================================================ */
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.fullName.trim().length < 2) return setError('Please enter your full name.');
    if (!EMAIL_RE.test(form.email.trim())) return setError('Enter a valid email address.');
    if (!pwIsValid)                        return setError('Password does not meet all requirements.');
    if (form.password !== form.confirm)    return setError('Passwords do not match.');

    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const displayName = form.fullName.trim();

      await updateProfile(cred.user, { displayName });
      await ensureUserMirror(cred.user);

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError((err.message || '').replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  }

  /* ============================================================
     GOOGLE SIGN-UP
     ============================================================ */
  async function handleGoogle() {
    setError('');
    setGoogleBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await ensureUserMirror(cred.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError((err.message || '').replace('Firebase: ', ''));
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start monitoring in under two minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className={authLinkCls}>Sign in</Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        noValidate
        className="space-y-4"
      >
        {error && <Notice tone="error">{error}</Notice>}

        {/* ---------- Full Name ---------- */}
        <FloatingInput
          id="reg-full-name"
          label="Full name"
          icon={FaUser}
          required
          autoComplete="off"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="words"
          value={form.fullName}
          onChange={update('fullName')}
          minLength={2}
          maxLength={60}
        />

        {/* ---------- Email ---------- */}
        <div>
          <FloatingInput
            id="reg-email"
            label="Email"
            type="email"
            icon={FaEnvelope}
            required
            autoComplete="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            value={form.email}
            onChange={update('email')}
            onBlur={() => setEmailTouched(true)}
            error={Boolean(emailError)}
          />
          {emailError && <FieldError>{emailError}</FieldError>}
        </div>

        {/* ---------- Password ---------- */}
        <div>
          <FloatingInput
            id="reg-password"
            label="Password"
            type="password"
            icon={FaLock}
            required
            autoComplete="new-password"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            value={form.password}
            onChange={update('password')}
            onFocus={() => setPwFocused(true)}
            onBlur={() => setPwFocused(false)}
          />
          {showStrength && (
            <div className="mt-2 animate-fade-in">
              <PasswordStrength checks={pwChecks} score={pwScore} />
            </div>
          )}
        </div>

        {/* ---------- Confirm Password ---------- */}
        <div>
          <FloatingInput
            id="reg-confirm"
            label="Confirm password"
            type="password"
            icon={FaLock}
            required
            autoComplete="new-password"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            value={form.confirm}
            onChange={update('confirm')}
            error={Boolean(confirmError)}
          />
          {confirmError && <FieldError>{confirmError}</FieldError>}
        </div>

        {/* ---------- Submit ---------- */}
        <GlassButton
          type="submit"
          loading={busy}
          disabled={!canSubmit || googleBusy}
          leftIcon={<FaUserPlus size={14} />}
          fullWidth
        >
          {busy ? 'Creating account…' : 'Sign Up'}
        </GlassButton>

        {/* ---------- Divider ---------- */}
        <div className="flex items-center gap-4 py-1">
          <div className="h-px flex-1 bg-ink-200/70" />
          <span className="text-xs font-semibold text-ink-400">or</span>
          <div className="h-px flex-1 bg-ink-200/70" />
        </div>

        {/* ---------- Google ---------- */}
        <GlassButton
          type="button"
          variant="google"
          disabled={busy || googleBusy}
          leftIcon={<FcGoogle size={18} />}
          onClick={handleGoogle}
          fullWidth
        >
          {googleBusy ? 'Signing up…' : 'Continue with Google'}
        </GlassButton>
      </form>
    </AuthShell>
  );
}