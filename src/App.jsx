import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

/* Public pages */
import Welcome        from '@/pages/Welcome';
import Login          from '@/pages/Login';
import Register       from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';

/* Protected pages */
import Dashboard from '@/pages/Dashboard';
import Devices   from '@/pages/Devices';
import Alerts    from '@/pages/Alerts';
import History   from '@/pages/History';
import Settings  from '@/pages/Settings';
import Profile   from '@/pages/Profile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ---------- Public routes (share the top navbar) ---------- */}
          <Route element={<PublicLayout />}>
            <Route path="/"                element={<Welcome />} />
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* ---------- Protected dashboard shell ---------- */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/devices"   element={<Devices />} />
              <Route path="/alerts"    element={<Alerts />} />
              <Route path="/history"   element={<History />} />
              <Route path="/settings"  element={<Settings />} />
              <Route path="/profile"   element={<Profile />} />
            </Route>
          </Route>

          {/* ---------- Fallback ---------- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}