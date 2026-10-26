import { useEffect, useMemo, useState } from 'react';
import {
  FaUser, FaFloppyDisk, FaLock, FaEnvelope,
  FaShieldHalved, FaGoogle, FaPencil, FaTriangleExclamation,
} from 'react-icons/fa6';
import {
  database, ref, set,
  updateProfile, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider,
} from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { Toast } from '@/components/ui/Toast';
import {
  PasswordStrength, evaluatePassword, passwordScore, isPasswordValid,
} from '@/components/ui/PasswordStrength';

export default function Profile() {
  const { user } = useAuth();

  /* ============================================================
     PERSONAL DETAILS
     ============================================================ */
  const [displayName, setDisplayName] = useState('');
  const [editMode, setEditMode]       = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  /* ============================================================
     PASSWORD CHANGE
     ============================================================ */
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [savingPw, setSavingPw]     = useState(false);
  const [newPwFocused, setNewPwFocused] = useState(false);

  const [toast, setToast] = useState(null);

  const isGoogle = user?.providerData?.some((p) => p.providerId === 'google.com');

  /* ---- Sync display name from auth ---- */
  useEffect(() => {
    setDisplayName(user?.displayName || 'HydroTrack User');
  }, [user]);

  /* ============================================================
     REAL-TIME PASSWORD VALIDATION
     ============================================================ */
  const pwChecks  = useMemo(() => evaluatePassword(pw.next), [pw.next]);
  const pwScore   = useMemo(() => passwordScore(pwChecks), [pwChecks]);
  const pwIsValid = useMemo(() => isPasswordValid(pwChecks), [pwChecks]);

  /* Show the strength meter once the user starts typing */
  const showStrength = newPwFocused || pw.next.length > 0;

  /* Confirm mismatch — only after user typed something in confirm */
  const confirmError = useMemo(() => {
    if (!pw.confirm) return null;
    return pw.confirm === pw.next ? null : 'Passwords do not match.';
  }, [pw.next, pw.confirm]);

  /* Can we submit the password form? */
  const canChangePassword =
    pw.current.length > 0 &&
    pwIsValid &&
    pw.next === pw.confirm &&
    !savingPw;

  /* ============================================================
     SAVE PROFILE
     ============================================================ */
  async function saveProfile(e) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setSavingProfile(true);
    try {
      await updateProfile(user, { displayName: trimmed });
      await set(ref(database, `users/${user.uid}/displayName`), trimmed);
      setToast({ type: 'success', message: 'Profile updated.' });
      setEditMode(false);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSavingProfile(false);
    }
  }

  /* ============================================================
     CHANGE PASSWORD
     ============================================================ */
  async function changePassword(e) {
    e.preventDefault();

    /* Final safety checks (button should already be disabled otherwise) */
    if (!pwIsValid)                     return setToast({ type: 'error', message: 'Password does not meet all requirements.' });
    if (pw.next !== pw.confirm)         return setToast({ type: 'error', message: 'Passwords do not match.' });

    setSavingPw(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, pw.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, pw.next);
      setToast({ type: 'success', message: 'Password changed successfully.' });
      setPw({ current: '', next: '', confirm: '' });
    } catch (err) {
      const msg = ['auth/wrong-password', 'auth/invalid-credential'].includes(err.code)
        ? 'Incorrect current password.'
        : err.message.replace('Firebase: ', '');
      setToast({ type: 'error', message: msg });
    } finally {
      setSavingPw(false);
    }
  }

  function cancelEdit() {
    setDisplayName(user?.displayName || '');
    setEditMode(false);
  }

  return (
    <>
      <TopBar title="User Profile" icon={FaUser} />

      {/* ============================================================
          HERO
          ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl bg-hydro-gradient p-6 text-white shadow-hydro-lg sm:p-8">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-10">
          <defs>
            <pattern id="profile-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#profile-grid)" />
        </svg>

        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-aqua/30 blur-3xl"
        />

        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 border-white/30 bg-white/15 backdrop-blur-md text-white shadow-xl">
            <FaUser size={34} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-bold tracking-tight">
              {user?.displayName || 'HydroTrack User'}
            </h2>
            <p className="mt-1 truncate text-sm text-white/70">
              {user?.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                Active
              </span>
              {isGoogle && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md">
                  <FaGoogle size={10} /> Google Account
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          GRID
          ============================================================ */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">

        {/* ---------- Personal Details ---------- */}
        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800">Personal Details</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Your name and contact info.
              </p>
            </div>
            {!editMode && (
              <GlassButton
                variant="ghost"
                size="sm"
                leftIcon={<FaPencil size={12} />}
                onClick={() => setEditMode(true)}
              >
                Edit
              </GlassButton>
            )}
          </div>

          <form onSubmit={saveProfile} className="mt-5 space-y-4">
            <FloatingInput
              id="profile-name"
              label="Full Name"
              icon={FaUser}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!editMode}
              required
              minLength={2}
              maxLength={60}
            />

            <FloatingInput
              id="profile-email"
              label="Email"
              type="email"
              icon={FaEnvelope}
              value={user?.email || ''}
              disabled
              readOnly
            />

            <p className="text-xs text-slate-500">
              Email is managed by your authentication provider and cannot be changed here.
            </p>

            {editMode && (
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:text-hydro"
                >
                  Cancel
                </button>
                <GlassButton
                  type="submit"
                  loading={savingProfile}
                  leftIcon={<FaFloppyDisk size={14} />}
                >
                  {savingProfile ? 'Saving…' : 'Save Changes'}
                </GlassButton>
              </div>
            )}
          </form>
        </GlassCard>

        {/* ---------- Security & Password ---------- */}
        <GlassCard>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-hydro/10 text-hydro">
              <FaShieldHalved size={17} />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-800">Security &amp; Password</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Keep your account protected.
              </p>
            </div>
          </div>

          {isGoogle ? (
            /* ---- Google account notice ---- */
            <div className="mt-5 rounded-2xl border border-aqua-200 bg-aqua-50/70 p-5 text-sm">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-red-500 shadow-sm">
                  <FaGoogle size={18} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-hydro-800">Signed in with Google</p>
                  <p className="mt-1 text-slate-600">
                    Password and two-factor authentication are managed directly by your Google account.
                  </p>
                </div>
              </div>
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glass mt-4 w-full !py-2.5 text-sm"
              >
                Manage Google Security
              </a>
            </div>
          ) : (
            /* ---- Email/password change form ---- */
            <form onSubmit={changePassword} className="mt-5 space-y-4" noValidate>

              {/* Current password */}
              <FloatingInput
                id="profile-current-pw"
                label="Current Password"
                type="password"
                icon={FaLock}
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                required
                autoComplete="current-password"
              />

              {/* New password + strength meter */}
              <div>
                <FloatingInput
                  id="profile-new-pw"
                  label="New Password"
                  type="password"
                  icon={FaLock}
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  onFocus={() => setNewPwFocused(true)}
                  onBlur={() => setNewPwFocused(false)}
                  required
                  autoComplete="new-password"
                />
                {showStrength && (
                  <div className="mt-2">
                    <PasswordStrength checks={pwChecks} score={pwScore} />
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <FloatingInput
                  id="profile-confirm-pw"
                  label="Confirm New Password"
                  type="password"
                  icon={FaLock}
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  required
                  autoComplete="new-password"
                  error={Boolean(confirmError)}
                />
                {confirmError && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                    <FaTriangleExclamation size={10} />
                    {confirmError}
                  </p>
                )}
              </div>

              {/* Submit */}
              <GlassButton
                type="submit"
                loading={savingPw}
                disabled={!canChangePassword}
                leftIcon={<FaLock size={13} />}
                fullWidth
              >
                {savingPw ? 'Updating…' : 'Update Password'}
              </GlassButton>

              <p className="text-xs text-slate-500">
                You'll need to enter your current password to make changes.
              </p>
            </form>
          )}
        </GlassCard>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}