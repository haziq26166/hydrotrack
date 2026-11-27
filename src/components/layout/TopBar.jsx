/**
 * Compact page header. Existing usage `<TopBar title="…" icon={Icon} />` is unchanged.
 *
 *   title      page title
 *   icon       optional react-icons component, shown beside the title
 *   subtitle   optional one-line description under the title
 *   actions    optional node (buttons, pickers) aligned to the right
 */
export function TopBar({ title, icon: Icon, subtitle, actions, className = '' }) {
  return (
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 ${className}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-hydro-50 text-hydro">
            <Icon size={14} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-6 text-ink-900">{title}</h1>
          {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}