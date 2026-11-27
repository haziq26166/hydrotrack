import { useEffect, useState } from 'react';
import { FaUser, FaFloppyDisk } from 'react-icons/fa6';
import { database, ref, set, updateProfile } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { GlassButton } from '@/components/ui/GlassButton';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { Notice } from '@/components/ui/Notice';

/**
 * Modal for changing the display name.
 *   open, onClose
 *   onSaved(name)  called after the name has been saved
 */
export function EditNameModal({ open, onClose, onSaved }) {
  const { user } = useAuth();
  const [name, setName]   = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  /* Start from the current name every time the modal opens */
  useEffect(() => {
    if (open) {
      setName(user?.displayName || '');
      setError('');
    }
  }, [open, user]);

  const trimmed = name.trim();
  const unchanged = trimmed === (user?.displayName || '');
  const canSave = trimmed.length >= 2 && !unchanged && !busy;

  async function handleSubmit(e) {
    e.preventDefault();
    if (trimmed.length < 2) return setError('Name must be at least 2 characters.');
    if (!canSave) return undefined;

    setBusy(true);
    setError('');
    try {
      await updateProfile(user, { displayName: trimmed });
      await set(ref(database, `users/${user.uid}/displayName`), trimmed);
      onSaved?.(trimmed);
      onClose?.();
    } catch (err) {
      setError((err.message || 'Could not update your name.').replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
    return undefined;
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Change name"
      description="This is the name shown in the sidebar and in notifications."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {error && <Notice tone="error">{error}</Notice>}

        <FloatingInput
          id="edit-name"
          label="Full name"
          icon={FaUser}
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={60}
          autoComplete="name"
          required
        />

        <div className="flex justify-end gap-2 pt-1">
          <GlassButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            loading={busy}
            disabled={!canSave}
            leftIcon={<FaFloppyDisk size={12} />}
          >
            {busy ? 'Saving…' : 'Save'}
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}