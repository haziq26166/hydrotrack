import { useEffect, useMemo, useState } from 'react';
import {
  FaUser, FaFloppyDisk, FaLock, FaEnvelope,
  FaShieldHalved, FaPencil,
} from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
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
import { StatusChip } from '@/components/ui/StatusChip';
import { Notice, FieldError } from '@/components/ui/Notice';
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
  const [savingPw, setSavingPw]        = useState(false);
  const [newPwFocused, setNewPwFocused] = useState(false);

  const [toast, setToast] = useState(null);

  const isGoogle = user?.providerData?.some((p) => p.providerId === 'google.com');
  const shownName = user?.displayName || 'HydroTrack User';

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
    if (!pwIsValid)             return setToast({ type: 'error', message: 'Password does not meet all requirements.' });
    if (pw.next !== pw.confirm) return setToast({ type: 'error', message: 'Passwords do not match.' });

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
      <TopBar title="Profile" icon={FaUser} subtitle="Your account and security" />

      {/* ============================================================
          IDENTITY CARD
          ============================================================ */}
      <GlassCard variant="strong" padded={false} className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-aqua/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-mint/30 blur-3xl"
        />

        <div className="relative flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-hydro-gradient text-3xl font-extrabold text-white shadow-brand">
            {shownName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-extrabold tracking-tight text-ink-900">
              {shownName}
            </h2>
            <p className="mt-1 truncate text-sm text-ink-500">{user?.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusChip status="ok" label="Active" pulse />
              {isGoogle && (
                <span className="chip chip-info">
                  <FcGoogle size={12} /> Google account
                </span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ============================================================
          GRID
          ============================================================ */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">

        {/* ---------- Personal Details ---------- */}
        <GlassCard>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-hydro-50 text-hydro">
                <FaUser size={15} />
              </span>
              <div>
                <h3 className="section-title">Personal details</h3>
                <p className="mt-0.5 text-xs text-ink-500">Your name and contact info.</p>
              </div>
            </div>

            {!editMode && (
              <GlassButton
                variant="ghost"
                size="sm"
                leftIcon={<FaPencil size={11} />}
                onClick={() => setEditMode(true)}
              >
                Edit
              </GlassButton>
            )}
          </div>

          <form onSubmit={saveProfile} className="mt-5 space-y-4">
            <FloatingInput
              id="profile-name"
              label="Full name"
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

            <p className="text-xs leading-relaxed text-ink-500">
              Email is managed by your authentication provider and cannot be changed here.
            </p>

            {editMode && (
              <div className="flex justify-end gap-3 pt-1">
                <GlassButton variant="ghost" onClick={cancelEdit} disabled={savingProfile}>
                  Cancel
                </GlassButton>
                <GlassButton
                  type="submit"
                  loading={savingProfile}
                  leftIcon={<FaFloppyDisk size={13} />}
                >
                  {savingProfile ? 'Saving…' : 'Save changes'}
                </GlassButton>
              </div>
            )}
          </form>
        </GlassCard>

        {/* ---------- Security & Password ---------- */}
        <GlassCard>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-hydro-50 text-hydro">
              <FaShieldHalved size={15} />
            </span>
            <div>
              <h3 className="section-title">Security &amp; password</h3>
              <p className="mt-0.5 text-xs text-ink-500">Keep your account protected.</p>
            </div>
          </div>

          {isGoogle ? (
            /* ---- Google account notice ---- */
            <div className="mt-5 rounded-2xl border border-aqua-200 bg-aqua-50/70 p-5 text-sm">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-glass-sm">
                  <FcGoogle size={20} />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-aqua-900">Signed in with Google</p>
                  <p className="mt-1 leading-relaxed text-ink-600">
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
                Manage Google security
              </a>
            </div>
          ) : (
            /* ---- Email/password change form ---- */
            <form onSubmit={changePassword} className="mt-5 space-y-4" noValidate>

              {/* Current password */}
              <FloatingInput
                id="profile-current-pw"
                label="Current password"
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
                  label="New password"
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
                  <div className="mt-2 animate-fade-in">
                    <PasswordStrength checks={pwChecks} score={pwScore} />
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <FloatingInput
                  id="profile-confirm-pw"
                  label="Confirm new password"
                  type="password"
                  icon={FaLock}
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  required
                  autoComplete="new-password"
                  error={Boolean(confirmError)}
                />
                {confirmError && <FieldError>{confirmError}</FieldError>}
              </div>

              {/* Submit */}
              <GlassButton
                type="submit"
                loading={savingPw}
                disabled={!canChangePassword}
                leftIcon={<FaLock size={13} />}
                fullWidth
              >
                {savingPw ? 'Updating…' : 'Update password'}
              </GlassButton>

              <p className="text-xs text-ink-500">
                You&apos;ll need to enter your current password to make changes.
              </p>
            </form>
          )}
        </GlassCard>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}