import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AddDeviceModal } from '@/components/devices/AddDeviceModal';

export function DashboardLayout() {
  const [addOpen, setAddOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex">
      <Sidebar onAddDevice={() => setAddOpen(true)} />

      <main className="flex-1 min-w-0 p-4 md:p-8">
        <div key={location.pathname} className="mx-auto max-w-7xl">
          <Outlet context={{ openAddDevice: () => setAddOpen(true) }} />
        </div>
      </main>

      <AddDeviceModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}