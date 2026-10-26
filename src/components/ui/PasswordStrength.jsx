// File: src/components/ui/PasswordStrength.jsx
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

  /* Muted status palette: coral → sand → mint → sea */
  const styles = {
    empty:  { bar: 'bg-ink-200',   text: 'text-ink-500',   label: '—' },
    weak:   { bar: 'bg-coral-400', text: 'text-coral-600', label: 'Weak' },
    fair:   { bar: 'bg-sand-400',  text: 'text-sand-700',  label: 'Fair' },
    good:   { bar: 'bg-mint-600',  text: 'text-mint-800',  label: 'Good' },
    strong: { bar: 'bg-sea-500',   text: 'text-sea-700',   label: 'Strong' },
  }[tone];

  return (
    <div className="glass-soft rounded-2xl p-4 text-sm">

      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink-700">Password Strength</span>
        <span className={`font-bold tabular-nums ${styles.text}`}>
          {score}% · {styles.label}
        </span>
      </div>

      {/* ---- Progress bar ---- */}
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label="Password strength"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out-expo ${styles.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* ---- Requirements list ---- */}
      <p className="mt-3 font-semibold text-ink-700">Password Requirements:</p>
      <ul className="mt-2 space-y-1">
        {CHECKS.map(({ key, label }) => {
          const ok = checks[key];
          return (
            <li key={key} className="flex items-center gap-2">
              {ok ? (
                <FaCheck size={10} className="shrink-0 text-sea-500" />
              ) : (
                <FaCircle size={5} className="shrink-0 text-ink-300" />
              )}
              <span className={ok ? 'text-sea-700' : 'text-ink-600'}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>

      {/* ---- Caution text ---- */}
      <p className="mt-3 text-xs leading-relaxed text-ink-500">
        Avoid passwords that you use with other websites or that might be easy
        for someone else to guess.
      </p>
    </div>
  );
}