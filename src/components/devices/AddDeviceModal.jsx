// File: src/components/devices/AddDeviceModal.jsx
import { useEffect, useState } from 'react';
import { FaLink, FaHashtag, FaTag } from 'react-icons/fa6';
import {
  database, ref, set, get, child,
} from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { GlassButton } from '@/components/ui/GlassButton';
import { FloatingInput } from '@/components/ui/FloatingInput';

const DEVICE_ID_RE = /^WFS-[A-Z0-9]{4}$/;

export function AddDeviceModal({ open, onClose }) {
  const { user } = useAuth();
  const [deviceId, setDeviceId]     = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError]           = useState('');
  const [busy, setBusy]             = useState(false);

  /* Fresh form every time the dialog opens */
  useEffect(() => {
    if (open) {
      setDeviceId(''); setDeviceName(''); setError(''); setBusy(false);
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const id   = deviceId.trim().toUpperCase();
    const name = deviceName.trim();

    if (!DEVICE_ID_RE.test(id))  return setError('Device ID must look like WFS-A1B2.');
    if (name.length < 2)         return setError('Device name must be at least 2 characters.');

    setBusy(true);
    try {
      const snap = await get(child(ref(database), `devices/${id}`));
      if (!snap.exists()) return setError('Device ID not found. Please check your Device ID.');

      const data = snap.val();
      if (data.claimed_by && data.claimed_by !== user.uid) {
        return setError('This device is already linked to another account.');
      }
      if (data.claimed_by === user.uid) {
        return setError('You have already linked this device.');
      }

      await set(ref(database, `users/${user.uid}/user_devices/${id}`), {
        name, linked_at: Date.now(),
      });
      await set(ref(database, `devices/${id}/claimed_by`), user.uid);

      onClose?.();
    } catch (err) {
      setError((err.message || '').replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Link HydroTrack device"
      description="Enter the Device ID printed on your hardware and give it a name you'll recognise."
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

        <div>
          <FloatingInput
            id="add-device-id"
            label="Device ID"
            icon={FaHashtag}
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
            maxLength={8}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
          />
          <p className="mt-2 text-xs text-ink-500">
            Format:{' '}
            <code className="rounded-md bg-hydro-50 px-1.5 py-0.5 font-mono text-hydro-700">WFS-XXXX</code>
          </p>
        </div>

        <FloatingInput
          id="add-device-name"
          label="Device name"
          icon={FaTag}
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
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
            leftIcon={<FaLink size={13} />}
            className="flex-1"
          >
            {busy ? 'Linking…' : 'Link device'}
          </GlassButton>
        </div>
      </form>
    </Modal>
  );
}