import { addWeeks, weekLabel } from '../utils.js';
import { btnSecondary } from '../ui.js';

/** Previous / next week control. `minWeek` (ISO Monday) stops navigation going earlier. */
export default function WeekPicker({ week, onChange, minWeek }) {
  const atMin = minWeek ? week <= minWeek : false;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={btnSecondary}
        disabled={atMin}
        onClick={() => onChange(addWeeks(week, -1))}
        aria-label="Previous week"
      >
        ‹
      </button>
      <div className="min-w-[10.5rem] text-center">
        <div className="text-xs uppercase tracking-wide text-slate-500">Week of</div>
        <div className="text-sm font-semibold text-slate-900">{weekLabel(week)}</div>
      </div>
      <button
        type="button"
        className={btnSecondary}
        onClick={() => onChange(addWeeks(week, 1))}
        aria-label="Next week"
      >
        ›
      </button>
    </div>
  );
}
