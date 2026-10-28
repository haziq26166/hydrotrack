import {
  FaCircleCheck, FaCircleExclamation, FaTriangleExclamation, FaCircleInfo,
} from 'react-icons/fa6';

const TONES = {
  error:   { Icon: FaCircleExclamation,   cls: 'border-coral-200 bg-coral-50/80 text-coral-700', icon: 'text-coral-500', role: 'alert'  },
  success: { Icon: FaCircleCheck,         cls: 'border-sea-200 bg-sea-50/80 text-sea-700',       icon: 'text-sea-500',   role: 'status' },
  warning: { Icon: FaTriangleExclamation, cls: 'border-sand-200 bg-sand-50/80 text-sand-800',    icon: 'text-sand-500',  role: 'status' },
  info:    { Icon: FaCircleInfo,          cls: 'border-aqua-200 bg-aqua-50/80 text-aqua-900',    icon: 'text-aqua-600',  role: 'status' },
};

/**
 * Inline message box for forms and settings panels.
 *   tone   error | success | warning | info
 *   title  optional bold first line
 */
export function Notice({ tone = 'info', title, children, className = '' }) {
  const { Icon, cls, icon, role } = TONES[tone] ?? TONES.info;

  return (
    <div
      role={role}
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${cls} ${className}`}
    >
      <Icon size={15} className={`mt-0.5 shrink-0 ${icon}`} />
      <div className="min-w-0 leading-relaxed">
        {title && <p className="font-bold">{title}</p>}
        <div className={title ? 'mt-0.5' : ''}>{children}</div>
      </div>
    </div>
  );
}

/** Small validation message shown under a single field. */
export function FieldError({ children }) {
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-coral-600">
      <FaTriangleExclamation size={10} className="shrink-0" />
      {children}
    </p>
  );
}