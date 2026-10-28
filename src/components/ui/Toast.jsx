import { useEffect, useRef } from 'react';
import {
  FaCircleCheck, FaCircleExclamation, FaTriangleExclamation, FaCircleInfo, FaXmark,
} from 'react-icons/fa6';

/* Muted, glassy toast tones. `error` kept as the original type name. */
const TONES = {
  success: { Icon: FaCircleCheck,         cls: 'bg-sea-50/90 border-sea-200 text-sea-800',       icon: 'text-sea-500' },
  error:   { Icon: FaCircleExclamation,   cls: 'bg-coral-50/90 border-coral-200 text-coral-800', icon: 'text-coral-500' },
  warning: { Icon: FaTriangleExclamation, cls: 'bg-sand-50/90 border-sand-200 text-sand-800',    icon: 'text-sand-500' },
  info:    { Icon: FaCircleInfo,          cls: 'bg-aqua-50/90 border-aqua-200 text-aqua-900',    icon: 'text-aqua-600' },
};

/**
 * toast = { type: 'success' | 'error' | 'warning' | 'info', message: string } | null
 */
export function Toast({ toast, onClose, duration = 3500 }) {
  /* Keep the latest onClose in a ref so a new inline callback on each
     parent render doesn't restart the auto-dismiss timer. */
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => closeRef.current?.(), duration);
    return () => clearTimeout(t);
  }, [toast, duration]);

  if (!toast) return null;

  const { Icon, cls, icon } = TONES[toast.type] ?? TONES.info;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex justify-center pb-safe sm:inset-x-auto sm:bottom-6 sm:right-6 sm:justify-end">
      <div
        role={toast.type === 'error' ? 'alert' : 'status'}
        aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        className={[
          'pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3',
          'shadow-glass-lg backdrop-blur-xl animate-toast-in',
          cls,
        ].join(' ')}
      >
        <Icon size={18} className={`shrink-0 ${icon}`} />
        <span className="text-sm font-semibold">{toast.message}</span>
        <button
          onClick={onClose}
          aria-label="Dismiss notification"
          className="rounded-lg p-1.5 transition-colors hover:bg-black/5"
        >
          <FaXmark size={13} />
        </button>
      </div>
    </div>
  );
}