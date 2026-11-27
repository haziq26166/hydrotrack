import { NavLink } from 'react-router-dom';
import { FaDroplet, FaPlus, FaRightFromBracket } from 'react-icons/fa6';
import { useAuth } from '@/context/AuthContext';
import { GlassButton } from '@/components/ui/GlassButton';
import { StatusDot } from '@/components/ui/StatusChip';
import { NAV_GROUPS } from './navConfig';

/* Hover / keyboard-focus label shown next to icons in the collapsed rail */
function Tip({ show, children }) {
  if (!show) return null;
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-glass-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

function leakLabel(leak) {
  if (!leak) return '';
  if (leak.level === 'leak') {
    return leak.leakCount === 1
      ? 'Leak detected on 1 device'
      : `Leak detected on ${leak.leakCount} devices`;
  }
  if (leak.level === 'warn') return 'Flow anomaly detected';
  return '';
}

/**
 * Brand + Add Device + navigation + user block.
 * Rendered inside the desktop <Sidebar /> (collapsible) and the mobile drawer.
 *
 *   collapsed    icon-only rail (desktop only)
 *   onNavigate   called after any link / action (the drawer uses it to close)
 *   onAddDevice  opens the Add Device dialog
 *   leak         result of useLeakStatus() — drives the Dashboard dot
 *   headerAction optional node shown at the right of the brand row
 */
export function SidebarContent({
  collapsed = false,
  onNavigate,
  onAddDevice,
  leak,
  headerAction,
}) {
  const { user, signOutUser } = useAuth();

  const displayName = user?.displayName || 'HydroTrack User';
  const email       = user?.email || '';
  const initial     = displayName.charAt(0).toUpperCase();

  const dotStatus = leak?.level === 'leak' ? 'leak' : leak?.level === 'warn' ? 'warn' : null;
  const dotText   = leakLabel(leak);

  const handleAdd = () => {
    onNavigate?.();
    onAddDevice?.();
  };

  const linkCls = ({ isActive }) =>
    [
      'nav-item group relative',
      isActive ? 'active' : '',
      collapsed ? 'justify-center !gap-0 !px-0' : '',
    ].join(' ');

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* ============================================================
          BRAND
          ============================================================ */}
      <div className={`flex h-9 items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-1'} mb-3`}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-hydro text-white">
          <FaDroplet size={14} />
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-ink-900">
            HydroTrack
          </span>
        )}
        {!collapsed && headerAction}
      </div>

      {/* ============================================================
          ADD DEVICE
          ============================================================ */}
      <div className={collapsed ? 'group relative flex justify-center pb-3' : 'pb-3'}>
        {collapsed ? (
          <>
            <GlassButton size="icon" aria-label="Add device" onClick={handleAdd}>
              <FaPlus size={12} />
            </GlassButton>
            <Tip show>Add Device</Tip>
          </>
        ) : (
          <GlassButton fullWidth leftIcon={<FaPlus size={11} />} onClick={handleAdd}>
            Add Device
          </GlassButton>
        )}
      </div>

      {/* ============================================================
          NAVIGATION
          ============================================================ */}
      <nav
        aria-label="Main navigation"
        className={`min-h-0 flex-1 ${collapsed ? 'overflow-visible' : 'overflow-y-auto'}`}
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {collapsed ? (
              gi > 0 && <div className="mx-2 my-2 h-px bg-ink-200" />
            ) : (
              <p className={`px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400 ${gi === 0 ? 'pt-0' : 'pt-4'}`}>
                {group.label}
              </p>
            )}

            <div className="space-y-0.5">
              {group.items.map(({ to, label, Icon }) => {
                const showDot = to === '/dashboard' && dotStatus;

                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={linkCls}
                    onClick={onNavigate}
                    aria-label={collapsed ? label : undefined}
                  >
                    <Icon size={14} className="shrink-0" />

                    <span className={collapsed ? 'sr-only' : 'min-w-0 flex-1 truncate'}>
                      {label}
                    </span>

                    {/* Leak indicator on the Dashboard item */}
                    {showDot && (
                      <>
                        <span
                          className={collapsed ? 'absolute right-1.5 top-1.5' : 'ml-auto'}
                          title={dotText}
                        >
                          <StatusDot
                            status={dotStatus}
                            pulse={dotStatus === 'leak'}
                            className="rounded-full ring-2 ring-white"
                          />
                        </span>
                        <span className="sr-only">{dotText}</span>
                      </>
                    )}

                    <Tip show={collapsed}>
                      {label}
                      {showDot ? ` · ${dotText}` : ''}
                    </Tip>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ============================================================
          USER BLOCK
          ============================================================ */}
      <div className="mt-2 border-t border-ink-200 pt-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <span
              title={displayName}
              className="grid h-8 w-8 place-items-center rounded-full bg-hydro-50 text-xs font-bold text-hydro-700"
            >
              {initial}
            </span>
            <span className="group relative">
              <button
                onClick={signOutUser}
                aria-label="Sign out"
                className="grid h-8 w-8 place-items-center rounded-md text-ink-400 transition-colors hover:bg-coral-50 hover:text-coral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hydro/40"
              >
                <FaRightFromBracket size={13} />
              </button>
              <Tip show>Sign out</Tip>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-md p-1.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-hydro-50 text-xs font-bold text-hydro-700">
              {initial}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink-800">{displayName}</p>
              <p className="truncate text-[11px] text-ink-500">{email}</p>
            </div>

            <button
              onClick={signOutUser}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-400 transition-colors hover:bg-coral-50 hover:text-coral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hydro/40"
            >
              <FaRightFromBracket size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}