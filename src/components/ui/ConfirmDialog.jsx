import { AlertTriangle } from 'lucide-react';
import { GlassButton } from './GlassButton';

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, onConfirm, onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel?.()}
    >
      <div className="glass-strong w-full max-w-sm rounded-3xl p-6 text-center">
        {danger && (
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-red-600">
            <AlertTriangle size={24} />
          </div>
        )}
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>

        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="glass-btn-ghost flex-1">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={[
              'flex-1 rounded-2xl px-5 py-3 font-semibold text-white shadow-lg transition active:scale-[0.98]',
              danger
                ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30 hover:from-red-400 hover:to-red-500'
                : 'bg-gradient-to-br from-hydro to-hydro-light shadow-hydro hover:from-water-400 hover:to-water-500',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}