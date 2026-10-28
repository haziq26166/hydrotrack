import { FaChevronDown } from 'react-icons/fa6';

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
        aria-label="Select device"
        className="hydro-input cursor-pointer appearance-none !pr-10"
      >
        {allLabel !== null && <option value="ALL">{allLabel}</option>}
        {list.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.id})
          </option>
        ))}
      </select>
      <FaChevronDown
        size={11}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-400"
      />
    </div>
  );
}