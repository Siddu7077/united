import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { DAYS, currentWeek, dayDate, fmtDate, shiftRange, shiftStyle } from '../../utils.js';
import { fmtHours, shiftHours, tallyHours } from '../../hours.js';
import Notice from '../../components/Notice.jsx';
import RosterGrid from '../../components/RosterGrid.jsx';
import WeekPicker from '../../components/WeekPicker.jsx';

function Tile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-bold tabular-nums text-slate-900">{value}</div>
      <div className="mt-0.5 text-sm text-slate-500">{label}</div>
    </div>
  );
}

export default function MyRoster() {
  const [week, setWeek] = useState(currentWeek());
  const [shifts, setShifts] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/shifts')
      .then((r) => setShifts(r.shifts))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    api
      .get(`/my-roster?week=${week}`)
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [week]);

  const mine = useMemo(() => new Set((data?.entries || []).map((e) => `${e.day}-${e.shift_id}`)), [data]);

  const list = useMemo(() => {
    if (!data) return [];
    const byId = Object.fromEntries(shifts.map((s) => [s.id, s]));
    return data.entries
      .filter((e) => byId[e.shift_id])
      .sort((a, b) => a.day - b.day || a.shift_id - b.shift_id)
      .map((e) => ({ ...e, shift: byId[e.shift_id] }));
  }, [data, shifts]);

  const tally = useMemo(() => tallyHours(data?.entries || [], shifts), [data, shifts]);
  const daysWorking = new Set(list.map((e) => e.day)).size;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My roster</h1>
          <p className="mt-1 text-sm text-slate-500">Only your own shifts are shown. Empty boxes are days you are off.</p>
        </div>
        <WeekPicker week={week} onChange={setWeek} />
      </div>

      {error && <Notice type="error">{error}</Notice>}
      {data && !data.published && (
        <Notice type="info">The roster for this week has not been published yet. Check back soon.</Notice>
      )}

      {data?.published && (
        <div className="grid grid-cols-3 gap-3">
          <Tile label="Hours this week" value={fmtHours(tally.total)} />
          <Tile label={tally.count === 1 ? 'Shift' : 'Shifts'} value={tally.count} />
          <Tile label={daysWorking === 1 ? 'Day working' : 'Days working'} value={daysWorking} />
        </div>
      )}

      {!data && !error ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading…</div>
      ) : (
        <RosterGrid
          week={week}
          shifts={shifts}
          renderCell={(day, shift) =>
            mine.has(`${day}-${shift.id}`) ? (
              <div
                className={`flex h-full min-h-[5rem] flex-col items-center justify-center rounded-lg border px-1 text-center ${shiftStyle(shift.id).chip}`}
              >
                <div className="text-sm font-semibold">{shift.name}</div>
                <div className="mt-0.5 text-xs">{shiftRange(shift)}</div>
                <div className="mt-0.5 text-[11px] opacity-80">{fmtHours(shiftHours(shift))}</div>
              </div>
            ) : null
          }
        />
      )}

      {data?.published && (
        <section aria-label="Your shifts this week">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Your shifts this week</h2>
          {list.length === 0 ? (
            <p className="text-sm text-slate-500">You have no shifts this week.</p>
          ) : (
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
              {list.map((e) => (
                <li key={`${e.day}-${e.shift_id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="font-medium text-slate-900">
                    {DAYS[e.day]} <span className="font-normal text-slate-500">{fmtDate(dayDate(week, e.day))}</span>
                  </span>
                  <span className="text-slate-600">
                    {e.shift.name} · {shiftRange(e.shift)} ·{' '}
                    <span className="font-semibold text-slate-900">{fmtHours(shiftHours(e.shift))}</span>
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between bg-slate-50 px-4 py-3 font-semibold text-slate-900">
                <span>Total</span>
                <span>{fmtHours(tally.total)}</span>
              </li>
            </ul>
          )}
        </section>
      )}
    </div>
  );
}