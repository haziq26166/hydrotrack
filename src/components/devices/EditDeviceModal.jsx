import { useEffect, useState } from 'react';
import { FaXmark, FaFloppyDisk } from 'react-icons/fa6';
import { database, ref, set } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';
import { GlassButton } from '@/components/ui/GlassButton';

export function EditDeviceModal({ open, device, onClose, onSaved }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (device) setName(device.name); }, [device]);

  if (!open || !device) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    setBusy(true);
    try {
      await set(ref(database, `users/${user.uid}/user_devices/${device.id}/name`), trimmed);
      onSaved?.();
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
          <h3 className="text-lg font-bold text-slate-800">Edit Device Details</h3>
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

          {/* ---------- Device Name ---------- */}
          <div className="relative">
            <input
              id="edit-device-name"
              autoFocus
              required
              minLength={2}
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=" "
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
              htmlFor="edit-device-name"
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
              leftIcon={<FaFloppyDisk size={14} />}
              className="flex-1"
            >
              {busy ? 'Saving…' : 'Save Changes'}
            </GlassButton>
          </div>
        </form>
      </div>
    </div>
  );
}