import { useEffect, useMemo, useState } from 'react';
import { FaLock } from 'react-icons/fa6';
import {
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
} from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { GlassButton } from '@/components/ui/GlassButton';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { Notice, FieldError } from '@/components/ui/Notice';
import {
  PasswordStrength, evaluatePassword, passwordScore, isPasswordValid,
} from '@/components/ui/PasswordStrength';

const EMPTY = { current: '', next: '', confirm: '' };

/**
 * Modal for changing the account password (email / password accounts).
 *   open, onClose
 *   onSaved()  called after the password has been changed
 */
export function ChangePasswordModal({ open, onClose, onSaved }) {
  const { user } = useAuth();
  const [pw, setPw]           = useState(EMPTY);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [newPwFocused, setNewPwFocused] = useState(false);

  /* Fresh form every time the modal opens */
  useEffect(() => {
    if (open) {
      setPw(EMPTY);
      setError('');
      setNewPwFocused(false);
    }
  }, [open]);

  /* ---- Real-time validation ---- */
  const checks  = useMemo(() => evaluatePassword(pw.next), [pw.next]);
  const score   = useMemo(() => passwordScore(checks), [checks]);
  const isValid = useMemo(() => isPasswordValid(checks), [checks]);

  const showStrength = newPwFocused || pw.next.length > 0;

  const confirmError = useMemo(() => {
    if (!pw.confirm) return null;
    return pw.confirm === pw.next ? null : 'Passwords do not match.';
  }, [pw.next, pw.confirm]);

  const canSubmit =
    pw.current.length > 0 && isValid && pw.next === pw.confirm && !busy;

  async function handleSubmit(e) {
    e.preventDefault();

    /* Final safety checks (button should already be disabled otherwise) */
    if (!isValid)             return setError('Password does not meet all requirements.');
    if (pw.next !== pw.confirm) return setError('Passwords do not match.');

    setBusy(true);
    setError('');
    try {
      const cred = EmailAuthProvider.credential(user.email, pw.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, pw.next);
      onSaved?.();
      onClose?.();
    } catch (err) {
      const msg = ['auth/wrong-password', 'auth/invalid-credential'].includes(err.code)
        ? 'Incorrect current password.'
        : (err.message || 'Could not change your password.').replace('Firebase: ', '');
      setError(msg);
    } finally {
      setBusy(false);
    }
    return undefined;
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Change password"
      description="Enter your current password to set a new one."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {error && <Notice tone="error">{error}</Notice>}

        <FloatingInput
          id="pw-current"
          label="Current password"
          type="password"
          icon={FaLock}
          value={pw.current}
          onChange={(e) => setPw({ ...pw, current: e.target.value })}
          autoComplete="current-password"
          required
        />

        <div>
          <FloatingInput
            id="pw-new"
            label="New password"
            type="password"
            icon={FaLock}
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
            onFocus={() => setNewPwFocused(true)}
            onBlur={() => setNewPwFocused(false)}
            autoComplete="new-password"
            required
          />
          {showStrength && (
            <div className="mt-2 animate-fade-in">
              <PasswordStrength checks={checks} score={score} />
            </div>
          )}
        </div>

        <div>
          <FloatingInput
            id="pw-confirm"
            label="Confirm new password"
            type="password"
            icon={FaLock}
            value={pw.confirm}
            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            autoComplete="new-password"
            error={Boolean(confirmError)}
            required
          />
          {confirmError && <FieldError>{confirmError}</FieldError>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <GlassButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            loading={busy}
            disabled={!canSubmit}
            leftIcon={<FaLock size={11} />}
          >
            {busy ? 'Updating…' : 'Update password'}
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}