import { FaDroplet } from 'react-icons/fa6';

/**
 * Shared frame for Login, Register and Forgot Password:
 * brand mark + heading above a frosted glass form card.
 *
 *   title, subtitle   heading text
 *   footer            node shown under the card (e.g. "Don't have an account?")
 *   width             'sm' | 'md'  (Register uses md for its longer form)
 */
export function AuthShell({ title, subtitle, footer, width = 'md', children }) {
  return (
    <div className="grid min-h-[calc(100vh-6rem)] place-items-center px-4 py-8 sm:py-12">
      <div className={`w-full animate-fade-in-up ${width === 'sm' ? 'max-w-sm' : 'max-w-md'}`}>
        <div className="mb-6 text-center">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-hydro-gradient text-white shadow-brand">
            <FaDroplet size={22} />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-500">{subtitle}</p>}
        </div>

        <div className="glass-strong rounded-3xl p-6 sm:p-8">{children}</div>

        {footer && <p className="mt-6 text-center text-sm text-ink-500">{footer}</p>}
      </div>
    </div>
  );
}

/** Consistent inline link style for auth pages. */
export const authLinkCls =
  'font-semibold text-hydro transition-colors hover:text-hydro-700 focus-visible:outline-none focus-visible:underline';