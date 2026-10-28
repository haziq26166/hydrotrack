/** Humanize "X seconds ago" into a compact label (e.g. "42s ago", "3h ago"). */
export function formatAgo(seconds) {
  if (seconds === null || seconds === undefined) return '';
  if (seconds < 60)    return `${seconds}s ago`;
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** "1 device" / "3 devices" */
export function plural(n, singular, pluralForm = `${singular}s`) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}