import { useEffect, useState } from 'react';
import { FaFloppyDisk, FaTag } from 'react-icons/fa6';
import { database, ref, set } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { GlassButton } from '@/components/ui/GlassButton';
import { FloatingInput } from '@/components/ui/FloatingInput';

export function EditDeviceModal({ open, device, onClose, onSaved }) {
  const { user } = useAuth();
  const [name, setName]   = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy]   = useState(false);

  useEffect(() => {
    if (device) { setName(device.name); setError(''); }
  }, [device]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError('Device name must be at least 2 characters.');

    setBusy(true);
    setError('');
    try {
      await set(ref(database, `users/${user.uid}/user_devices/${device.id}/name`), trimmed);
      onSaved?.();
    } catch (err) {
      setError((err.message || 'Could not save changes.').replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(open && device)}
      onClose={busy ? undefined : onClose}
      title="Edit device details"
      description={device ? `Device ID ${device.id}` : undefined}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-coral-200 bg-coral-50/80 px-4 py-3 text-sm font-medium text-coral-700"
          >
            {error}
          </div>
        )}

        <FloatingInput
          id="edit-device-name"
          label="Device name"
          icon={FaTag}
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={40}
          autoComplete="off"
          required
        />

        <div className="flex gap-3 pt-2">
          <GlassButton variant="ghost" className="flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            loading={busy}
            leftIcon={<FaFloppyDisk size={13} />}
            className="flex-1"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}