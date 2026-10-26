// File: src/components/layout/TopBar.jsx

/**
 * Page header. Existing usage `<TopBar title="…" icon={Icon} />` is unchanged.
 *
 *   title      page title
 *   icon       optional react-icons component, shown in a glass tile
 *   subtitle   optional one-line description under the title
 *   actions    optional node (buttons, toggles) aligned to the right
 */
export function TopBar({ title, icon: Icon, subtitle, actions, className = '' }) {
  return (
    <div className={`mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-3.5">
        {Icon && (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/80 bg-white/70 text-hydro shadow-glass-sm backdrop-blur-md">
            <Icon size={20} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[1.75rem] sm:leading-9">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}