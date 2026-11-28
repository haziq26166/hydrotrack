import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaDroplet, FaXmark } from 'react-icons/fa6';
import { useAuth } from '@/context/AuthContext';
import { StatusDot } from '@/components/ui/StatusChip';
import { SidebarContent } from './SidebarContent';

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Mobile top bar (menu · brand · profile) plus a slide-in drawer.
 * Visible below the md breakpoint only.
 * The drawer is portalled to <body> so `fixed` positioning is never
 * affected by a parent's styles.
 */
export function MobileNav({ onAddDevice, leak }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const toggleRef = useRef(null);
  const panelRef = useRef(null);

  const initial = (user?.displayName || 'H').charAt(0).toUpperCase();
  const dotStatus = leak?.level === 'leak' ? 'leak' : leak?.level === 'warn' ? 'warn' : null;

  const close = () => setOpen(false);

  /* Close after every route change */
  useEffect(() => { setOpen(false); }, [pathname]);

  /* Close if the viewport grows past the mobile breakpoint */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e) => { if (e.matches) setOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* Scroll lock, Esc, focus trap, focus restore */
  useEffect(() => {
    if (!open) return undefined;

    const toggle = toggleRef.current;
    const panel = panelRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    panel?.querySelector('button')?.focus({ preventScroll: true });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !panel) return;

      const items = Array.from(panel.querySelectorAll(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      toggle?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      {/* ============================================================
          TOP BAR
          ============================================================ */}
      <div className="sticky top-0 z-30 pt-safe md:hidden">
       <div className="px-3 pt-3">
        <div className="glass flex h-12 items-center justify-between rounded-2xl px-2">
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={open}
            aria-controls="mobile-drawer"
            className="relative grid h-9 w-9 place-items-center rounded-md text-ink-700 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hydro/40"
          >
            <FaBars size={16} />
            {dotStatus && (
              <span className="absolute right-1.5 top-1.5" title="Leak alert on the dashboard">
                <StatusDot
                  status={dotStatus}
                  pulse={dotStatus === 'leak'}
                  className="rounded-full ring-2 ring-white"
                />
              </span>
            )}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-hydro text-white">
              <FaDroplet size={12} />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-ink-900">HydroTrack</span>
          </Link>

          <Link
            to="/profile"
            aria-label="Profile"
            className="grid h-9 w-9 place-items-center rounded-md transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hydro/40"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-hydro-50 text-xs font-bold text-hydro-700">
              {initial}
            </span>
          </Link>
        </div>
       </div>
      </div>

      {/* ============================================================
          SLIDE-IN DRAWER
          ============================================================ */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-ink-900/25 backdrop-blur-sm animate-fade-in"
              onClick={close}
              aria-hidden="true"
            />

            <aside
              id="mobile-drawer"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="absolute inset-y-0 left-0 flex w-[17.5rem] max-w-[92%] animate-slide-in-left"
              style={{
                padding: '0.75rem',
                paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
              }}
            >
             <div className="glass-strong flex h-full w-full flex-col rounded-2xl px-2 py-3">
              <SidebarContent
                onNavigate={close}
                onAddDevice={onAddDevice}
                leak={leak}
                headerAction={
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close navigation menu"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hydro/40"
                  >
                    <FaXmark size={14} />
                  </button>
                }
              />
             </div>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}