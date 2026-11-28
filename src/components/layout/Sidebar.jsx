import { FaAngleLeft, FaAngleRight } from 'react-icons/fa6';
import { SidebarContent } from './SidebarContent';

/**
 * Desktop sidebar (md and up) — a floating glass panel. Collapses to an icon rail.
 * The parent (DashboardLayout) owns the `collapsed` state and persists it.
 */
export function Sidebar({ collapsed, onToggle, onAddDevice, leak }) {
  return (
    <aside
      aria-label="Sidebar"
      className={[
        'glass relative flex h-full flex-col rounded-2xl px-2 py-3',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-14' : 'w-56',
      ].join(' ')}
    >
      {/* Collapse / expand handle, straddling the right edge */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        className="absolute -right-3 top-[18px] z-10 grid h-6 w-6 place-items-center rounded-full border border-white/80 bg-white/80 text-ink-500 shadow-glass-sm backdrop-blur-md transition-colors hover:text-hydro-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hydro/40"
      >
        {collapsed ? <FaAngleRight size={10} /> : <FaAngleLeft size={10} />}
      </button>

      <SidebarContent collapsed={collapsed} onAddDevice={onAddDevice} leak={leak} />
    </aside>
  );
}