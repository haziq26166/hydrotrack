import { useEffect, useState } from 'react';
import { FaXmark, FaLink } from 'react-icons/fa6';
import {
  database, ref, set, get, child,
} from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { GlassButton } from '@/components/ui/GlassButton';

const DEVICE_ID_RE = /^WFS-[A-Z0-9]{4}$/;

export function AddDeviceModal({ open, onClose }) {
  const { user } = useAuth();
  const [deviceId, setDeviceId]     = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError]           = useState('');
  const [busy, setBusy]             = useState(false);

  useEffect(() => {
    if (open) {
      setDeviceId(''); setDeviceName(''); setError(''); setBusy(false);
    }
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

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
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl shadow-slate-900/20 p-6">

        {/* ---------- Header ---------- */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Link HydroTrack Device</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:text-red-500 transition-colors duration-150"
          >
            <FaXmark size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ---------- Device ID ---------- */}
          <div className="relative">
            <input
              id="add-device-id"
              autoFocus
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
              placeholder=" "
              maxLength={8}
              required
              className="
                peer w-full rounded-xl
                border border-slate-200 bg-white
                px-4 pt-5 pb-2
                font-mono tracking-wider text-slate-800
                outline-none transition-all duration-150
                focus:border-hydro focus:ring-2 focus:ring-hydro/20
              "
            />
            <label
              htmlFor="add-device-id"
              className="
                pointer-events-none absolute left-4
                top-1/2 -translate-y-1/2
                text-sm text-slate-500
                origin-left transition-all duration-200
                peer-focus:top-2 peer-focus:translate-y-0
                peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-hydro
                peer-[:not(:placeholder-shown)]:top-2
                peer-[:not(:placeholder-shown)]:translate-y-0
                peer-[:not(:placeholder-shown)]:text-[11px]
                peer-[:not(:placeholder-shown)]:font-semibold
              "
            >
              Device ID
            </label>
          </div>

          <p className="-mt-3 text-xs text-slate-500">
            Format:{' '}
            <code className="rounded bg-hydro-50 px-1.5 py-0.5 font-mono text-hydro-700">
              WFS-XXXX
            </code>
          </p>

          {/* ---------- Device Name ---------- */}
          <div className="relative">
            <input
              id="add-device-name"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder=" "
              minLength={2}
              maxLength={40}
              required
              className="
                peer w-full rounded-xl
                border border-slate-200 bg-white
                px-4 pt-5 pb-2
                text-slate-800
                outline-none transition-all duration-150
                focus:border-hydro focus:ring-2 focus:ring-hydro/20
              "
            />
            <label
              htmlFor="add-device-name"
              className="
                pointer-events-none absolute left-4
                top-1/2 -translate-y-1/2
                text-sm text-slate-500
                origin-left transition-all duration-200
                peer-focus:top-2 peer-focus:translate-y-0
                peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-hydro
                peer-[:not(:placeholder-shown)]:top-2
                peer-[:not(:placeholder-shown)]:translate-y-0
                peer-[:not(:placeholder-shown)]:text-[11px]
                peer-[:not(:placeholder-shown)]:font-semibold
              "
            >
              Device Name
            </label>
          </div>

          {/* ---------- Actions ---------- */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 rounded-xl border border-slate-200 bg-white
                px-5 py-3 font-semibold text-slate-600
                hover:text-hydro
                transition-colors duration-150
              "
            >
              Cancel
            </button>

            <GlassButton
              type="submit"
              loading={busy}
              leftIcon={<FaLink size={14} />}
              className="flex-1"
            >
              {busy ? 'Linking…' : 'Link Device'}
            </GlassButton>
          </div>
        </form>
      </div>
    </div>
  );
}