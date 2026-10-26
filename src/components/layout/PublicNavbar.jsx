import { Link, NavLink } from 'react-router-dom';
import { FaDroplet } from 'react-icons/fa6';
import { useAuth } from '@/context/AuthContext';

export function PublicNavbar() {
  const { user } = useAuth();

  /* Shared text-link styling — no background, no border.
     Only the text color changes when the link is active or hovered. */
  const linkCls = ({ isActive }) =>
    [
      'text-sm font-medium transition-colors duration-150',
      isActive
        ? 'text-hydro'
        : 'text-slate-500 hover:text-hydro',
    ].join(' ');

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ---------- Brand (still clickable to Home) ---------- */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-hydro text-white shadow-hydro transition-transform group-hover:scale-105">
            <FaDroplet size={16} />
          </div>
          <span className="text-lg font-bold tracking-tight text-hydro">
            HydroTrack
          </span>
        </Link>

        {/* ---------- Nav — pure text links ---------- */}
        <nav className="flex items-center gap-6 sm:gap-8">
          <NavLink to="/" end className={linkCls}>
            Home
          </NavLink>

          {user ? (
            <NavLink to="/dashboard" className={linkCls}>
              Dashboard
            </NavLink>
          ) : (
            <>
              <NavLink to="/login" className={linkCls}>
                Sign In
              </NavLink>
              <NavLink to="/register" className={linkCls}>
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}