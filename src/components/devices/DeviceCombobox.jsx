import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FaChevronDown, FaMagnifyingGlass } from 'react-icons/fa6';

/**
 * Searchable device picker — click it and type part of a device name or ID.
 * Scales to any number of devices (used on Dashboard, Alerts, History, Settings).
 *
 * @param {Record<string, {id, name}>} devices
 * @param {string}   value       currently selected device id (or 'ALL')
 * @param {(id: string) => void} onChange
 * @param {string}   [label]     accessible label
 * @param {string}   [allLabel]  when given, adds an "All devices" option whose
 *                               value is the string 'ALL'
 *
 * Keyboard: type to filter · ↑ ↓ to move · Enter to pick · Esc to close.
 */
export function DeviceCombobox({
  devices,
  value,
  onChange,
  label = 'Select device',
  allLabel,
  placeholder = 'Select a device',
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const options = useMemo(() => {
    const sorted = Object.values(devices).sort((a, b) => a.name.localeCompare(b.name));
    return allLabel ? [{ id: 'ALL', name: allLabel, hint: '' }, ...sorted] : sorted;
  }, [devices, allLabel]);

  const selected = options.find((o) => o.id === value) || null;
  const selectedLabel = !selected
    ? ''
    : selected.id === 'ALL'
      ? selected.name
      : `${selected.name} (${selected.id})`;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q),
    );
  }, [options, query]);

  /* Close when clicking anywhere outside */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  /* Keep the highlighted option visible while arrowing through a long list */
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, listId]);

  function openList() {
    setQuery('');
    setActive(Math.max(0, options.findIndex((d) => d.id === value)));
    setOpen(true);
  }

  function choose(device) {
    onChange(device.id);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  function onKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        /* Always swallow Enter so it can never submit the surrounding form. */
        e.preventDefault();
        if (open && filtered[active]) choose(filtered[active]);
        break;
      case 'Escape':
        if (open) { e.stopPropagation(); setOpen(false); }
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <FaMagnifyingGlass size={13} className="hydro-input-icon" />

      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[active] ? `${listId}-opt-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={open ? query : selectedLabel}
        placeholder={open ? selectedLabel || 'Type a device name or ID…' : placeholder}
        onFocus={(e) => { openList(); e.target.select(); }}
        onClick={() => { if (!open) openList(); }}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={onKeyDown}
        className="hydro-input !pl-9 !pr-9"
      />

      <FaChevronDown
        size={10}
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 transition-transform ${
          open ? 'rotate-180' : ''
        }`}
      />

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto glass-strong rounded-md p-1"
        >
          {filtered.length === 0 ? (
            <li className="px-2.5 py-2 text-[13px] text-ink-500">
              No devices match “{query.trim()}”.
            </li>
          ) : (
            filtered.map((d, i) => {
              const isActive = i === active;
              const isSelected = d.id === value;

              return (
                <li
                  key={d.id}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); choose(d); }}
                  className={[
                    'flex cursor-pointer items-center justify-between gap-3 rounded px-2.5 py-1.5 text-[13px]',
                    isActive ? 'bg-hydro-50 text-hydro-700' : 'text-ink-800',
                    isSelected ? 'font-semibold' : 'font-medium',
                  ].join(' ')}
                >
                  <span className="truncate">{d.name}</span>
                  {d.id !== 'ALL' && (
                    <span className="shrink-0 font-mono text-[11px] text-ink-400">{d.id}</span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}