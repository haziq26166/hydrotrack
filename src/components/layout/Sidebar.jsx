import { FaAngleLeft, FaAngleRight } from 'react-icons/fa6';
import { SidebarContent } from './SidebarContent';

/**
 * Desktop floating glass sidebar (md and up). Collapses to an icon rail.
 * The parent (DashboardLayout) owns the `collapsed` state and persists it.
 */
export function Sidebar({ collapsed, onToggle, onAddDevice, leak }) {
  return (
    <aside
      aria-label="Sidebar"
      className={[
        'glass-strong relative flex h-full flex-col rounded-3xl p-3',
        'transition-[width] duration-300 ease-out-expo',
        collapsed ? 'w-[76px]' : 'w-64',
      ].join(' ')}
    >
      {/* Collapse / expand handle, straddling the right edge */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        className="absolute -right-3 top-9 z-10 grid h-6 w-6 place-items-center rounded-full border border-white/80 bg-white text-ink-500 shadow-glass-sm transition-colors hover:text-hydro-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30"
      >
        {collapsed ? <FaAngleRight size={11} /> : <FaAngleLeft size={11} />}
      </button>

      <SidebarContent collapsed={collapsed} onAddDevice={onAddDevice} leak={leak} />
    </aside>
  );
}