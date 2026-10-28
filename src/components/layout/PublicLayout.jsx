import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="px-4 pb-6 pt-2 text-center text-xs text-ink-400 pb-safe">
        © {new Date().getFullYear()} HydroTrack · Real-time water monitoring
      </footer>
    </div>
  );
}