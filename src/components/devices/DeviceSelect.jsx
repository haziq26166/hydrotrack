import { ChevronDown } from 'lucide-react';

/**
 * Reusable glassy device picker.
 *
 * @param {Record<string, {id, name}>} devices
 * @param {string} value        — current selected id (or 'ALL')
 * @param {(v: string) => void} onChange
 * @param {string} [allLabel]   — pass `null` to hide the "All" option
 */
export function DeviceSelect({ devices, value, onChange, allLabel = 'All Devices' }) {
  const list = Object.values(devices);

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="hydro-input appearance-none pr-10 cursor-pointer"
      >
        {allLabel !== null && <option value="ALL">{allLabel}</option>}
        {list.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.id})
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}