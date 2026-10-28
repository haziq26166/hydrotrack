import { useCallback, useEffect, useRef, useState } from 'react';
import { FaTableCellsLarge, FaListUl } from 'react-icons/fa6';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { DeviceCard } from './DeviceCard';
import { DeviceRow, COL } from './DeviceRow';

/** Devices at or above this count switch from big cards to a compact list. */
export const MANY_DEVICES = 6;
/** The mobile swipe carousel is only used up to this many devices. */
export const MAX_CAROUSEL = 5;

/* ============================================================
   VIEW TOGGLE — cards / list
   ============================================================ */
export function ViewToggle({ value, onChange, className = '' }) {
  const opt = (id, Icon, label) => (
    <button
      type="button"
      onClick={() => onChange(id)}
      aria-pressed={value === id}
      aria-label={label}
      title={label}
      className={[
        'grid h-9 w-9 place-items-center rounded-xl transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30',
        value === id
          ? 'bg-white text-hydro-700 shadow-glass-sm'
          : 'text-ink-400 hover:text-hydro-700',
      ].join(' ')}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <div role="group" aria-label="Device view" className={`glass-soft flex items-center gap-0.5 rounded-2xl p-1 ${className}`}>
      {opt('cards', FaTableCellsLarge, 'Card view')}
      {opt('list', FaListUl, 'List view')}
    </div>
  );
}

/* ============================================================
   MOBILE SWIPE CAROUSEL — snap scrolling + page dots
   ============================================================ */
function Carousel({ children, count }) {
  const trackRef = useRef(null);
  const frame = useRef(0);
  const [active, setActive] = useState(0);

  const update = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = trackRef.current;
      if (!el) return;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      Array.from(el.children).forEach((child, i) => {
        const dist = Math.abs(child.offsetLeft + child.offsetWidth / 2 - mid);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      setActive(best);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const goTo = (i) => {
    const el = trackRef.current;
    const child = el?.children[i];
    if (!el || !child) return;
    el.scrollTo({
      left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2,
      behavior: 'smooth',
    });
  };

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={update}
        className="snap-carousel relative -mx-4 px-4 pb-1"
        role="list"
        aria-label="Devices"
      >
        {children}
      </div>

      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2" role="tablist" aria-label="Choose device">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Device ${i + 1} of ${count}`}
              onClick={() => goTo(i)}
              className={[
                'h-2 rounded-full transition-all duration-300 ease-out-expo',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30',
                i === active ? 'w-6 bg-hydro' : 'w-2 bg-ink-200 hover:bg-ink-300',
              ].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Renders a set of devices in the right layout.
 *
 *   devices         already filtered + sorted entries from useDeviceFleet().list
 *   view            'cards' | 'list'
 *   carousel        on phones, show cards as a swipe carousel (only when
 *                   there are ≤ MAX_CAROUSEL devices; otherwise stacked)
 *   defaultId       highlights the default device (Devices page)
 *   renderActions   (device) => node — per-device actions; omit for none
 */
export function DeviceCollection({
  devices,
  view = 'cards',
  carousel = false,
  defaultId = null,
  renderActions,
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const hasActions = typeof renderActions === 'function';

  /* ---------------- LIST ---------------- */
  if (view === 'list') {
    return (
      <div className="glass overflow-hidden rounded-3xl">
        <div className="hidden items-center gap-4 border-b border-white/60 bg-white/30 px-5 py-3 md:flex">
          <p className="kpi-label min-w-0 flex-1 pl-5">Device</p>
          <p className={`kpi-label ${COL.status}`}>Status</p>
          <p className={`kpi-label ${COL.flow}`}>Flow</p>
          <p className={`kpi-label ${COL.today}`}>Today</p>
          <p className={`kpi-label ${COL.seen}`}>Updated</p>
          {hasActions && <p className={`kpi-label ${COL.actions} text-right`}>Actions</p>}
        </div>

        <ul className="divide-y divide-white/60">
          {devices.map((d) => (
            <DeviceRow
              key={d.id}
              device={d}
              isDefault={d.id === defaultId}
              actions={hasActions ? renderActions(d) : undefined}
            />
          ))}
        </ul>
      </div>
    );
  }

  /* ---------------- CARDS ---------------- */
  const card = (d) => (
    <DeviceCard
      device={d}
      isDefault={d.id === defaultId}
      actions={hasActions ? renderActions(d) : undefined}
    />
  );

  if (carousel && !isDesktop && devices.length <= MAX_CAROUSEL) {
    return (
      <Carousel count={devices.length}>
        {devices.map((d) => (
          <div key={d.id} role="listitem" className="snap-item w-[86%] xs:w-[78%]">
            {card(d)}
          </div>
        ))}
      </Carousel>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
      {devices.map((d) => (
        <div key={d.id} className="min-w-0">
          {card(d)}
        </div>
      ))}
    </div>
  );
}