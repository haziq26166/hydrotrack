import {
  FaCircleCheck, FaTriangleExclamation, FaXmark, FaPlugCircleXmark,
} from 'react-icons/fa6';
import { useState } from 'react';

export function LeakAlertBanner({
  status = 'NORMAL',
  online = true,
  message,
  onDismiss,
}) {
  const [dismissed, setDismissed] = useState(false);
  const isAlert = online && (status === 'LEAK' || status === 'ALERT');

  /* ---- Offline state (highest priority) ---- */
  if (!online) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 backdrop-blur-md px-5 py-4 text-slate-600 shadow-glass">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-400 text-white shadow-md shadow-slate-400/30">
          <FaPlugCircleXmark size={15} />
        </span>
        <p className="text-sm font-medium">
          Device is offline — readings are paused until it reconnects.
        </p>
      </div>
    );
  }

  /* ---- Success state ---- */
  if (!isAlert || dismissed) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 backdrop-blur-md px-5 py-4 text-emerald-700 shadow-glass">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
          <FaCircleCheck size={16} />
        </span>
        <p className="text-sm font-medium">
          System protected — no leaks detected.
        </p>
      </div>
    );
  }

  /* ---- Alert state ---- */
  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      className="relative flex items-center gap-3 rounded-2xl border border-red-200/80 bg-red-50/80 backdrop-blur-md px-5 py-4 text-red-800 animate-pulse-alert"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-500 text-white shadow-md shadow-red-500/40">
        <FaTriangleExclamation size={16} />
      </span>
      <div className="flex-1 text-sm">
        <p className="font-semibold">
          {status === 'LEAK' ? 'Continuous leak detected' : 'Flow anomaly detected'}
        </p>
        <p className="text-red-700/80">
          {message ?? 'Check the Alerts page for details.'}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="rounded-lg p-1.5 text-red-500 hover:bg-red-100 transition"
        aria-label="Dismiss alert"
      >
        <FaXmark size={16} />
      </button>
    </div>
  );
}