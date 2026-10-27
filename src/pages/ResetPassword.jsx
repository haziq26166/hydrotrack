// File: src/pages/ResetPassword.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FaEnvelope, FaLock, FaKey, FaCircleCheck, FaLinkSlash, FaArrowRight,
} from 'react-icons/fa6';
import { auth, verifyPasswordResetCode, confirmPasswordReset } from '@/services/firebase';
import { AuthShell, authLinkCls } from '@/components/layout/AuthShell';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { Spinner } from '@/components/ui/Spinner';
import { Notice, FieldError } from '@/components/ui/Notice';
import {
  PasswordStrength, evaluatePassword, passwordScore, isPasswordValid,
} from '@/components/ui/PasswordStrength';

/* ============================================================
   HELPERS
   ============================================================ */

/** Friendly explanation for a link that can't be used. */
function invalidReason(err) {
  switch (err?.code) {
    case 'auth/expired-action-code':
      return 'This reset link has expired. Reset links are only valid for a short time.';
    case 'auth/invalid-action-code':
      return 'This reset link is invalid or has already been used.';
    case 'auth/user-disabled':
      return 'The account for this link has been disabled.';
    case 'auth/user-not-found':
      return 'We could not find the account for this link.';
    case undefined:
      return 'This reset link is incomplete. Please use the full link from your email.';
    default:
      return (err.message || 'We could not verify this link.').replace('Firebase: ', '');
  }
}

const LINK_ERRORS = ['auth/expired-action-code', 'auth/invalid-action-code'];

/** What the page is doing right now. */
function initialPhase(mode, oobCode) {
  if (mode && mode !== 'resetPassword') return 'unsupported';
  if (!oobCode) return 'invalid';
  return 'verifying';
}

const COPY = {
  verifying:   { title: 'Reset your password',     subtitle: 'Checking your reset link…' },
  ready:       { title: 'Choose a new password',   subtitle: 'Create a strong password for your HydroTrack account.' },
  success:     { title: 'Password updated',        subtitle: 'You can now sign in with your new password.' },
  invalid:     { title: 'Link not valid',          subtitle: "We couldn't use this reset link." },
  unsupported: { title: 'Unsupported link',        subtitle: 'This link is for a different action.' },
};

/**
 * In-app password reset.
 *
 * Firebase's reset email links here when the "Password reset" template's
 * action URL is set to  https://<your-domain>/reset-password  and arrives as:
 *   /reset-password?mode=resetPassword&oobCode=XXXX&apiKey=…&lang=en
 *
 * Flow: verify the code (shows which account) → new password with the same
 * live strength rules as Register → confirmPasswordReset → success.
 */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const mode    = params.get('mode');
  const oobCode = params.get('oobCode');

  const [phase, setPhase]       = useState(() => initialPhase(mode, oobCode));
  const [email, setEmail]       = useState('');
  const [reason, setReason]     = useState(() => (oobCode ? '' : invalidReason(undefined)));
  const [pw, setPw]             = useState({ next: '', confirm: '' });
  const [pwFocused, setPwFocused] = useState(false);
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);

  /* ---- 1. Verify the code (does not consume it) ---- */
  useEffect(() => {
    const start = initialPhase(mode, oobCode);
    if (start !== 'verifying') {
      setPhase(start);
      if (start === 'invalid') setReason(invalidReason(undefined));
      return undefined;
    }

    let cancelled = false;
    setPhase('verifying');

    verifyPasswordResetCode(auth, oobCode)
      .then((address) => {
        if (cancelled) return;
        setEmail(address);
        setPhase('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setReason(invalidReason(err));
        setPhase('invalid');
      });

    return () => { cancelled = true; };
  }, [mode, oobCode]);

  /* ---- 2. Live password validation — identical rules to Register ---- */
  const pwChecks  = useMemo(() => evaluatePassword(pw.next), [pw.next]);
  const pwScore   = useMemo(() => passwordScore(pwChecks), [pwChecks]);
  const pwIsValid = useMemo(() => isPasswordValid(pwChecks), [pwChecks]);

  const confirmError = useMemo(() => {
    if (!pw.confirm) return null;
    return pw.confirm === pw.next ? null : 'Passwords do not match.';
  }, [pw.next, pw.confirm]);

  const showStrength = pwFocused || pw.next.length > 0;
  const canSubmit = pwIsValid && pw.next === pw.confirm && !busy;

  /* ---- 3. Apply the new password ---- */
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!pwIsValid)             return setError('Password does not meet all requirements.');
    if (pw.next !== pw.confirm) return setError('Passwords do not match.');

    setBusy(true);
    try {
      await confirmPasswordReset(auth, oobCode, pw.next);
      setPw({ next: '', confirm: '' });
      setPhase('success');
    } catch (err) {
      if (LINK_ERRORS.includes(err?.code)) {
        /* Link was used or expired while the form was open */
        setReason(invalidReason(err));
        setPhase('invalid');
      } else if (err?.code === 'auth/weak-password') {
        setError('That password is too weak. Please choose a stronger one.');
      } else {
        setError((err?.message || 'Something went wrong.').replace('Firebase: ', ''));
      }
    } finally {
      setBusy(false);
    }
  }

  const { title, subtitle } = COPY[phase];

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        phase === 'ready' || phase === 'verifying' ? (
          <>
            Remembered it?{' '}
            <Link to="/login" className={authLinkCls}>Back to sign in</Link>
          </>
        ) : null
      }
    >
      {/* ---------------- VERIFYING ---------------- */}
      {phase === 'verifying' && (
        <div className="grid place-items-center gap-4 py-8">
          <Spinner label="Checking your reset link" />
          <p className="text-sm text-ink-500">One moment…</p>
        </div>
      )}

      {/* ---------------- FORM ---------------- */}
      {phase === 'ready' && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}

          {/* Which account is being reset */}
          <div className="glass-soft flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-hydro-50 text-hydro">
              <FaEnvelope size={13} />
            </span>
            <div className="min-w-0">
              <p className="kpi-label">Resetting password for</p>
              <p className="truncate text-sm font-semibold text-ink-800">{email}</p>
            </div>
          </div>

          {/* Lets password managers file the new password under this account */}
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />

          {/* New password + live strength meter */}
          <div>
            <FloatingInput
              id="reset-new-password"
              label="New password"
              type="password"
              icon={FaLock}
              required
              autoComplete="new-password"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
            />
            {showStrength && (
              <div className="mt-2 animate-fade-in">
                <PasswordStrength checks={pwChecks} score={pwScore} />
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <FloatingInput
              id="reset-confirm-password"
              label="Confirm new password"
              type="password"
              icon={FaLock}
              required
              autoComplete="new-password"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              error={Boolean(confirmError)}
            />
            {confirmError && <FieldError>{confirmError}</FieldError>}
          </div>

          <GlassButton
            type="submit"
            loading={busy}
            disabled={!canSubmit}
            leftIcon={<FaKey size={13} />}
            fullWidth
          >
            {busy ? 'Updating…' : 'Reset password'}
          </GlassButton>
        </form>
      )}

      {/* ---------------- SUCCESS ---------------- */}
      {phase === 'success' && (
        <div className="py-2 text-center" role="status">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-sea-50 text-sea-500">
            <FaCircleCheck size={28} />
          </span>
          <p className="mx-auto mt-5 max-w-xs text-sm leading-relaxed text-ink-600">
            Your password has been changed. For your security, use the new password the
            next time you sign in.
          </p>
          <Link to="/login" className="btn-hydro mt-6 w-full">
            Continue to sign in <FaArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* ---------------- INVALID LINK ---------------- */}
      {phase === 'invalid' && (
        <div className="space-y-5 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-coral-50 text-coral-500">
            <FaLinkSlash size={26} />
          </span>
          <Notice tone="error" className="text-left">{reason}</Notice>
          <div className="space-y-3">
            <Link to="/forgot-password" className="btn-hydro w-full">
              Request a new link
            </Link>
            <Link to="/login" className="btn-glass w-full">
              Back to sign in
            </Link>
          </div>
        </div>
      )}

      {/* ---------------- OTHER LINK TYPES ---------------- */}
      {phase === 'unsupported' && (
        <div className="space-y-5 text-center">
          <Notice tone="warning" className="text-left">
            This page only handles password reset links. If you were trying to verify an
            email address or change your account details, open HydroTrack and sign in instead.
          </Notice>
          <Link to="/login" className="btn-hydro w-full">Go to sign in</Link>
        </div>
      )}
    </AuthShell>
  );
}