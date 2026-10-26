import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { auth, onAuthStateChanged, signOut } from '@/services/firebase';

const AuthContext = createContext(null);
const IDLE_MS = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const idleTimer             = useRef(null);

  /* --- 1. Track Firebase auth state --- */
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u ?? null));
  }, []);

  /* --- 2. Inactivity watchdog (fires only when logged in) --- */
  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(async () => {
        await signOut(auth);
        window.location.href = '/login?reason=inactivity';
      }, IDLE_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [user]);

  const value = {
    user,
    loading: user === undefined,
    signOutUser: () => signOut(auth),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}