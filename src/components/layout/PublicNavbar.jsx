import { Link, NavLink } from 'react-router-dom';
import { FaDroplet } from 'react-icons/fa6';
import { useAuth } from '@/context/AuthContext';

export function PublicNavbar() {
  const { user } = useAuth();

  /* Pill links: only background + text colour change between states. */
  const linkCls = ({ isActive }) =>
    [
      'rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-200',
      isActive
        ? 'bg-white/90 text-hydro-700 shadow-glass-sm'
        : 'text-ink-500 hover:bg-white/60 hover:text-hydro-700',
    ].join(' ');

  return (
    <header className="sticky top-0 z-40 pt-safe">
      <div className="px-3 pt-3 sm:px-6">
        <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-2.5 sm:px-3">

          {/* ---------- Brand ---------- */}
          <Link to="/" className="group flex items-center gap-2.5 rounded-xl p-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-hydro-gradient text-white shadow-brand transition-transform duration-200 group-hover:scale-105">
              <FaDroplet size={15} />
            </span>
            <span className="hidden text-lg font-extrabold tracking-tight text-ink-900 xs:inline">
              HydroTrack
            </span>
          </Link>

          {/* ---------- Nav ---------- */}
          <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-1.5">
            <NavLink to="/" end className={linkCls}>
              Home
            </NavLink>

            {user ? (
              <Link to="/dashboard" className="btn-hydro !px-4 !py-2 text-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <NavLink to="/login" className={linkCls}>
                  Sign In
                </NavLink>
                <Link to="/register" className="btn-hydro !px-4 !py-2 text-sm">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}