import { FaTriangleExclamation } from 'react-icons/fa6';
import { Modal } from './Modal';
import { GlassButton } from './GlassButton';

/**
 * Centered confirmation dialog. API unchanged:
 *   open, title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel
 * New (optional): loading — disables both buttons and spins the confirm button.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} onClose={onCancel} size="sm" hideClose>
      <div className="pt-2 text-center">
        {danger && (
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-coral-100 text-coral-600">
            <FaTriangleExclamation size={20} />
          </div>
        )}
        <h3 className="text-lg font-bold text-ink-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">{message}</p>

        <div className="mt-6 flex gap-3">
          <GlassButton
            variant="ghost"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </GlassButton>
          <GlassButton
            variant={danger ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </GlassButton>
        </div>
      </div>
    </Modal>
  );
}