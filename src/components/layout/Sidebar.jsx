import { NavLink } from 'react-router-dom';
import {
  FaHouse, FaDroplet, FaBell, FaChartColumn,
  FaUser, FaGear, FaRightFromBracket, FaPlus,
} from 'react-icons/fa6';
import { useAuth } from '@/context/AuthContext';

const OVERVIEW_NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: FaHouse },
  { to: '/devices',   label: 'Devices',   Icon: FaDroplet },
  { to: '/alerts',    label: 'Alerts',    Icon: FaBell },
  { to: '/history',   label: 'History',   Icon: FaChartColumn },
];

const ACCOUNT_NAV = [
  { to: '/profile',  label: 'Profile',  Icon: FaUser },
  { to: '/settings', label: 'Settings', Icon: FaGear },
];

export function Sidebar({ onAddDevice }) {
  const { user, signOutUser } = useAuth();

  const displayName = user?.displayName || 'HydroTrack User';
  const email       = user?.email || '';
  const initial     = displayName.charAt(0).toUpperCase();

  /* Nav item styling — flat, rounded, only background + text color change.
     Nothing about the geometry shifts between states, so the layout stays still. */
  const linkCls = ({ isActive }) =>
    [
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
      'transition-colors duration-150',
      isActive
        ? 'bg-slate-100 font-semibold text-hydro'
        : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800',
    ].join(' ');

  return (
    <aside className="hidden md:flex md:w-60 shrink-0">
      <div className="sticky top-0 flex h-screen w-full flex-col border-r border-slate-200 bg-white">

        {/* ============================================================
            BRAND — icon is the only colored element at the top
            ============================================================ */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-hydro text-white">
            <FaDroplet size={14} />
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900">
            HydroTrack
          </span>
        </div>

        {/* ============================================================
            ADD DEVICE — subtle outlined CTA
            ============================================================ */}
        <div className="px-3 pb-4">
          <button
            onClick={onAddDevice}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-hydro transition-colors duration-150 hover:border-hydro/30 hover:bg-hydro/5"
          >
            <FaPlus size={11} />
            Add Device
          </button>
        </div>

        {/* ============================================================
            NAVIGATION — grouped with tiny uppercase section labels
            ============================================================ */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">

          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Overview
          </p>
          <div className="space-y-0.5">
            {OVERVIEW_NAV.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={linkCls}>
                <Icon size={15} className="shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Account
          </p>
          <div className="space-y-0.5">
            {ACCOUNT_NAV.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={linkCls}>
                <Icon size={15} className="shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* ============================================================
            USER BLOCK — avatar, name, email, logout
            ============================================================ */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-hydro/10 text-xs font-bold text-hydro">
              {initial}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {displayName}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {email}
              </p>
            </div>

            <button
              onClick={signOutUser}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
            >
              <FaRightFromBracket size={13} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}