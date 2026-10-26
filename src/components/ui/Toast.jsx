import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export function Toast({ toast, onClose, duration = 3500 }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [toast, duration, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50">
      <div
        className={[
          'pointer-events-auto flex items-center gap-3 rounded-2xl px-5 py-3 backdrop-blur-md border shadow-lg',
          isSuccess
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
            : 'bg-red-50/90 border-red-200 text-red-800',
        ].join(' ')}
      >
        {isSuccess ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-black/5">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}