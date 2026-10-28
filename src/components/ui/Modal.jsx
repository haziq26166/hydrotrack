import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaXmark } from 'react-icons/fa6';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Centered glass dialog (all screen sizes).
 *
 * Props
 *   open, onClose
 *   title, description   optional header text
 *   size                 sm | md | lg
 *   footer               optional node pinned under the content
 *   hideClose            hide the corner ✕ button
 *   closeOnBackdrop      click outside to close (default true)
 *
 * Handles: portal rendering, Esc to close, body scroll lock,
 * focus trap and focus restore, aria-modal semantics.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  hideClose = false,
  closeOnBackdrop = true,
  className = '',
  children,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef(onClose);

  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    /* Move focus into the dialog (first field if there is one) */
    const node = dialogRef.current;
    const first = node?.querySelector('input,select,textarea') ?? node;
    first?.focus({ preventScroll: true });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !node) return;

      const items = Array.from(node.querySelectorAll(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink-900/30 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={[
          'glass-strong relative my-auto w-full rounded-3xl outline-none animate-scale-in',
          SIZES[size] ?? SIZES.md,
          className,
        ].join(' ')}
      >
        {!hideClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl text-ink-400 transition-colors hover:bg-ink-100/70 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30"
          >
            <FaXmark size={15} />
          </button>
        )}

        {(title || description) && (
          <header className="px-6 pb-2 pt-6 pr-14">
            {title && (
              <h2 id={titleId} className="text-lg font-bold text-ink-900">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="mt-1 text-sm text-ink-500">
                {description}
              </p>
            )}
          </header>
        )}

        <div className="px-6 py-4">{children}</div>

        {footer && (
          <footer className="flex flex-col-reverse gap-3 px-6 pb-6 pt-2 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}