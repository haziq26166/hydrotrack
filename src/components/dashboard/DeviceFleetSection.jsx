import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaMagnifyingGlass, FaArrowRight } from 'react-icons/fa6';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { statusRank } from '@/hooks/useDeviceFleet';
import { DeviceCollection, ViewToggle, MANY_DEVICES } from './DeviceCollection';

const FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'offline',   label: 'Offline' },
];

const byAttention = (a, b) =>
  statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name);

/**
 * Dashboard device area.
 *
 *  1–5 devices  big cards (swipe carousel on phones)
 *  6+ devices   compact list by default, with search, a status filter and a
 *               card/list toggle. Problem devices always sort to the top.
 */
export function DeviceFleetSection({ list }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const many = list.length >= MANY_DEVICES;

  const [view, setView] = useState('list');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const counts = useMemo(
    () => ({
      all: list.length,
      attention: list.filter((d) => d.status === 'leak' || d.status === 'warn').length,
      offline: list.filter((d) => d.status === 'offline' && !d.loading).length,
    }),
    [list],
  );

  const shown = useMemo(() => {
    if (!many) return [...list].sort(byAttention);

    const q = query.trim().toLowerCase();
    return list
      .filter((d) => {
        if (filter === 'attention' && d.status !== 'leak' && d.status !== 'warn') return false;
        if (filter === 'offline' && !(d.status === 'offline' && !d.loading)) return false;
        return !q || d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q);
      })
      .sort(byAttention);
  }, [list, many, query, filter]);

  /* Phones always get the compact list once there are many devices. */
  const effectiveView = !many ? 'cards' : isDesktop ? view : 'list';

  return (
    <section aria-labelledby="devices-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 id="devices-heading" className="section-title">Your devices</h2>
          <span className="text-xs font-semibold text-ink-400">{list.length}</span>
        </div>

        <Link
          to="/devices"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-hydro transition-colors hover:bg-white/60 hover:text-hydro-700"
        >
          Manage devices <FaArrowRight size={10} />
        </Link>
      </div>

      {many && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <FaMagnifyingGlass size={14} className="hydro-input-icon" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search devices…"
              aria-label="Search devices"
              className="hydro-input !pl-10"
            />
          </div>

          <div role="group" aria-label="Filter by status" className="glass-soft flex items-center gap-0.5 rounded-2xl p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={[
                  'rounded-xl px-3 py-2 text-xs font-bold transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30',
                  filter === f.id ? 'bg-white text-hydro-700 shadow-glass-sm' : 'text-ink-500 hover:text-hydro-700',
                ].join(' ')}
              >
                {f.label}
                <span className="ml-1.5 tabular-nums text-ink-400">{counts[f.id]}</span>
              </button>
            ))}
          </div>

          <ViewToggle value={view} onChange={setView} className="hidden md:flex" />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="glass-soft rounded-3xl px-6 py-12 text-center">
          <p className="text-sm font-bold text-ink-800">No devices match</p>
          <p className="mt-1 text-xs text-ink-500">Try a different search or filter.</p>
        </div>
      ) : (
        <DeviceCollection devices={shown} view={effectiveView} carousel={!many} />
      )}
    </section>
  );
}