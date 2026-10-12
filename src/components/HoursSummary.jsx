import { fmtHours } from '../hours.js';

/** rows: [{ id, name, hours, shifts, tag? }] */
export default function HoursSummary({ title = 'Hours this week', rows, total, count }) {
  const max = Math.max(1, ...rows.map((r) => r.hours));
  return (
    <section aria-label={title} className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <div className="flex gap-2 text-sm">
          <span className="rounded-lg bg-indigo-50 px-3 py-1 font-semibold text-indigo-800">{fmtHours(total)} total</span>
          <span className="rounded-lg bg-slate-100 px-3 py-1 font-medium text-slate-700">
            {count} {count === 1 ? 'shift' : 'shifts'}
          </span>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">Nobody is rostered yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-2.5 text-sm sm:grid-cols-[12rem_minmax(0,1fr)_7rem]">
              <span className="flex items-center gap-2 truncate font-medium text-slate-900">
                <span className="truncate">{r.name}</span>
                {r.tag && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800">{r.tag}</span>
                )}
              </span>
              <span className="text-right font-semibold tabular-nums text-slate-900 sm:order-3">
                {fmtHours(r.hours)}
                <span className="ml-1.5 text-xs font-normal text-slate-500">
                  {r.shifts} {r.shifts === 1 ? 'shift' : 'shifts'}
                </span>
              </span>
              <span className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-100 sm:order-2 sm:col-span-1" aria-hidden="true">
                <span
                  className={`block h-full rounded-full ${r.tag ? 'bg-violet-500' : 'bg-indigo-500'}`}
                  style={{ width: `${(r.hours / max) * 100}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}