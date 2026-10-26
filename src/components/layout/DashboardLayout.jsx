// File: src/components/layout/DashboardLayout.jsx
import { useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLeakStatus } from '@/hooks/useLeakStatus';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { AddDeviceModal } from '@/components/devices/AddDeviceModal';

const COLLAPSE_KEY = 'hydrotrack.sidebar.collapsed';

/* Remembered choice wins; otherwise start as an icon rail on tablet widths. */
function readInitialCollapsed() {
  try {
    const saved = window.localStorage.getItem(COLLAPSE_KEY);
    if (saved !== null) return saved === '1';
  } catch {
    /* storage unavailable (private mode, etc.) — fall through */
  }
  return typeof window !== 'undefined' && window.innerWidth < 1024;
}

export function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const leak = useLeakStatus(user?.uid);

  const [addOpen, setAddOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readInitialCollapsed);

  const openAddDevice = useCallback(() => setAddOpen(true), []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile: glass top bar + hamburger drawer (hidden from md up) */}
      <MobileNav onAddDevice={openAddDevice} leak={leak} />

      {/* Desktop: floating, collapsible sidebar (hidden below md) */}
      <div className="hidden shrink-0 md:block">
        <div className="sticky top-0 h-screen p-4 pr-0">
          <Sidebar
            collapsed={collapsed}
            onToggle={toggleCollapsed}
            onAddDevice={openAddDevice}
            leak={leak}
          />
        </div>
      </div>

      <main className="min-w-0 flex-1 px-4 pb-10 pt-5 md:px-8 md:py-8">
        <div key={location.pathname} className="page-enter mx-auto max-w-7xl">
          <Outlet context={{ openAddDevice, leak }} />
        </div>
      </main>

      <AddDeviceModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}