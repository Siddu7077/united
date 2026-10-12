import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { currentWeek } from '../../utils.js';
import { tallyHours } from '../../hours.js';
import { btnPrimary } from '../../ui.js';
import HoursSummary from '../../components/HoursSummary.jsx';
import Notice from '../../components/Notice.jsx';
import RosterGrid from '../../components/RosterGrid.jsx';
import WeekPicker from '../../components/WeekPicker.jsx';

export default function PublishedRoster() {
  const { user } = useAuth();
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
      .get(`/roster?week=${week}`)
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [week]);

  // The manager can be rostered too, so include them alongside the employees.
  const people = useMemo(() => {
    const list = (data?.employees || []).filter((e) => e.id !== user.id);
    return [{ id: user.id, name: user.name, isAdmin: true }, ...list];
  }, [data, user]);

  // "day-shiftId" -> [{ id, name, isAdmin }]
  const peopleByCell = useMemo(() => {
    if (!data) return {};
    const byId = Object.fromEntries(people.map((p) => [p.id, p]));
    const map = {};
    for (const e of data.entries) {
      (map[`${e.day}-${e.shift_id}`] ||= []).push(byId[e.user_id] || { id: e.user_id, name: 'Former employee' });
    }
    for (const list of Object.values(map)) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [data, people]);

  const hours = useMemo(() => {
    if (!data) return { rows: [], total: 0, count: 0 };
    const t = tallyHours(data.entries, shifts);
    const rows = people.map((p) => ({
      id: p.id,
      name: p.name,
      tag: p.isAdmin ? 'Manager' : null,
      hours: t.per[p.id]?.hours || 0,
      shifts: t.per[p.id]?.shifts || 0,
    }));
    rows.sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
    return { rows, total: t.total, count: t.count };
  }, [data, shifts, people]);

  const isPublished = data?.status === 'published';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Published roster</h1>
          <p className="mt-1 text-sm text-slate-500">What employees currently see for the selected week.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WeekPicker week={week} onChange={setWeek} />
          {isPublished && (
            <Link to={`/admin/roster?week=${week}`} className={btnPrimary}>
              Edit this roster
            </Link>
          )}
        </div>
      </div>

      {error && <Notice type="error">{error}</Notice>}

      {data && !isPublished && (
        <Notice type="info">
          {data.status === 'draft' ? 'This week only has an unpublished draft. ' : 'No roster has been created for this week. '}
          <Link to={`/admin/roster?week=${week}`} className="font-semibold underline">
            {data.status === 'draft' ? 'Continue the draft' : 'Create it now'}
          </Link>
          .
        </Notice>
      )}

      {!data && !error ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading…</div>
      ) : (
        data &&
        isPublished && (
          <>
            <RosterGrid
              week={week}
              shifts={shifts}
              renderCell={(day, shift) => {
                const list = peopleByCell[`${day}-${shift.id}`] || [];
                return list.length === 0 ? null : (
                  <ul className="space-y-1 p-1">
                    {list.map((p) => (
                      <li
                        key={p.id}
                        className={`truncate rounded-md px-2 py-1 text-xs font-medium ${
                          p.isAdmin ? 'bg-violet-100 text-violet-900' : 'bg-indigo-50 text-indigo-900'
                        }`}
                      >
                        {p.name}
                      </li>
                    ))}
                  </ul>
                );
              }}
            />
            <HoursSummary title="Hours by person" rows={hours.rows} total={hours.total} count={hours.count} />
          </>
        )
      )}
    </div>
  );
}