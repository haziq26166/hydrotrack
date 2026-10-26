import { FaCheck, FaCircle } from 'react-icons/fa6';

/* ============================================================
   REQUIREMENTS — the rules that must all pass
   ============================================================ */
const CHECKS = [
  { key: 'length',    label: 'At least 8 characters' },
  { key: 'number',    label: 'At least 1 number' },
  { key: 'uppercase', label: 'At least 1 uppercase letter' },
  { key: 'lowercase', label: 'At least 1 lowercase letter' },
  { key: 'special',   label: 'At least 1 special character' },
];

/* ============================================================
   EVALUATORS — exported so Register can reuse them
   ============================================================ */

/** Returns { length, number, uppercase, lowercase, special } → booleans */
export function evaluatePassword(pw) {
  return {
    length:    pw.length >= 8,
    number:    /\d/.test(pw),
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    special:   /[^A-Za-z0-9]/.test(pw),
  };
}

/** Returns a 0–100 score = (rules passed / total rules) × 100 */
export function passwordScore(checks) {
  const total  = Object.keys(checks).length;
  const passed = Object.values(checks).filter(Boolean).length;
  return Math.round((passed / total) * 100);
}

/** True only when every rule passes */
export function isPasswordValid(checks) {
  return Object.values(checks).every(Boolean);
}

/* ============================================================
   COMPONENT
   ============================================================ */

export function PasswordStrength({ checks, score }) {
  const tone =
    score >= 80 ? 'strong' :
    score >= 60 ? 'good'   :
    score >= 40 ? 'fair'   :
    score >  0  ? 'weak'   : 'empty';

  const styles = {
    empty:  { bar: 'bg-slate-300',   text: 'text-slate-500',   label: '—' },
    weak:   { bar: 'bg-red-500',     text: 'text-red-600',     label: 'Weak' },
    fair:   { bar: 'bg-amber-500',   text: 'text-amber-600',   label: 'Fair' },
    good:   { bar: 'bg-lime-500',    text: 'text-lime-600',    label: 'Good' },
    strong: { bar: 'bg-emerald-500', text: 'text-emerald-600', label: 'Strong' },
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">

      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-700">Password Strength</span>
        <span className={`font-bold ${styles.text}`}>
          {score}% · {styles.label}
        </span>
      </div>

      {/* ---- Progress bar ---- */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${styles.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* ---- Requirements list ---- */}
      <p className="mt-3 font-semibold text-slate-700">Password Requirements:</p>
      <ul className="mt-2 space-y-1">
        {CHECKS.map(({ key, label }) => {
          const ok = checks[key];
          return (
            <li key={key} className="flex items-center gap-2">
              {ok ? (
                <FaCheck size={10} className="shrink-0 text-emerald-500" />
              ) : (
                <FaCircle size={5} className="shrink-0 text-slate-400" />
              )}
              <span className={ok ? 'text-emerald-700' : 'text-slate-600'}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>

      {/* ---- Caution text ---- */}
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Avoid passwords that you use with other websites or that might be easy
        for someone else to guess.
      </p>
    </div>
  );
}