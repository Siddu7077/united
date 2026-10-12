import { DAY_SHORT, dayDate, fmtDate, shiftRange, shiftStyle } from '../utils.js';

/**
 * The week table used everywhere: 7 day columns x one row per shift.
 * `renderCell(dayIndex, shift)` supplies the contents of each cell.
 */
export default function RosterGrid({ week, shifts, renderCell }) {
  const today = new Date().toDateString();

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[920px] table-fixed border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="w-40 border-b border-slate-200 p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Shift
            </th>
            {DAY_SHORT.map((label, i) => {
              const date = dayDate(week, i);
              const isToday = date.toDateString() === today;
              return (
                <th
                  key={label}
                  className={`border-b border-l border-slate-200 p-3 text-center ${isToday ? 'bg-indigo-50' : ''}`}
                >
                  <div className="text-sm font-semibold text-slate-900">{label}</div>
                  <div className="text-xs font-normal text-slate-500">{fmtDate(date)}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift) => (
            <tr key={shift.id}>
              <th scope="row" className="border-t border-slate-200 p-3 text-left align-top">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${shiftStyle(shift.id).dot}`} />
                  <span className="text-sm font-semibold text-slate-900">{shift.name}</span>
                </div>
                <div className="mt-0.5 text-xs font-normal text-slate-500">{shiftRange(shift)}</div>
              </th>
              {DAY_SHORT.map((_, i) => (
                <td key={i} className="h-24 border-l border-t border-slate-200 p-1.5 align-top">
                  {renderCell(i, shift)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
