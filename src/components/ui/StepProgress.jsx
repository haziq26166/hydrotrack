import { FaCheck } from 'react-icons/fa6';

/**
 * Horizontal progress indicator for multi-step dialogs.
 *
 *   steps    array of short labels, e.g. ['Device ID', 'Name', 'Household']
 *   current  zero-based index of the active step
 */
export function StepProgress({ steps, current }) {
  return (
    <ol className="flex items-center" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;

        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}
          >
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={[
                  'grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-colors duration-200',
                  done
                    ? 'bg-hydro text-white'
                    : active
                      ? 'bg-hydro text-white ring-4 ring-aqua/30'
                      : 'border border-ink-200 bg-white/80 text-ink-400',
                ].join(' ')}
              >
                {done ? <FaCheck size={11} /> : i + 1}
              </span>
              <span
                className={`text-[11px] font-semibold ${
                  active || done ? 'text-ink-800' : 'text-ink-400'
                }`}
              >
                {label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`mx-2 mb-5 h-0.5 flex-1 rounded-full transition-colors duration-200 ${
                  done ? 'bg-hydro' : 'bg-ink-200'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}