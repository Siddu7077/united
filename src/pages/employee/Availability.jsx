import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { addWeeks, currentWeek } from '../../utils.js';
import { fmtHours, tallyHours } from '../../hours.js';
import { btnPrimary, btnSecondary } from '../../ui.js';
import Notice from '../../components/Notice.jsx';
import RosterGrid from '../../components/RosterGrid.jsx';
import SaveStatus from '../../components/SaveStatus.jsx';
import WeekPicker from '../../components/WeekPicker.jsx';

// "Finalised" is remembered in this browser only (the backend just stores the slots).
const finalKey = (uid, week) => `availability-final:${uid}:${week}`;
const readFinal = (uid, week) => {
  try {
    return localStorage.getItem(finalKey(uid, week)) === '1';
  } catch {
    return false;
  }
};
const writeFinal = (uid, week, on) => {
  try {
    if (on) localStorage.setItem(finalKey(uid, week), '1');
    else localStorage.removeItem(finalKey(uid, week));
  } catch {
    /* storage unavailable */
  }
};
const toSlots = (set) =>
  [...set].map((key) => {
    const [day, shift_id] = key.split('-').map(Number);
    return { day, shift_id };
  });

export default function Availability() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const thisWeek = currentWeek();
  const week = params.get('week') || addWeeks(thisWeek, 1);

  const [shifts, setShifts] = useState([]);
  const [picked, setPicked] = useState(new Set()); // "day-shiftId"
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [finalised, setFinalised] = useState(false);
  const [notice, setNotice] = useState(null);

  const timer = useRef(null);
  const latest = useRef({ week, picked });
  latest.current = { week, picked };

  useEffect(() => {
    api
      .get('/shifts')
      .then((r) => setShifts(r.shifts))
      .catch((e) => setNotice({ type: 'error', text: e.message }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotice(null);
    setSaveState('idle');
    setFinalised(readFinal(user.id, week));
    api
      .get(`/availability?week=${week}`)
      .then((r) => {
        if (!cancelled) setPicked(new Set(r.slots.map((s) => `${s.day}-${s.shift_id}`)));
      })
      .catch((e) => !cancelled && setNotice({ type: 'error', text: e.message }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [week, user.id]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    timer.current = null;
    const { week: w, picked: p } = latest.current;
    setSaveState('saving');
    try {
      await api.put('/availability', { week: w, slots: toSlots(p) });
      setSaveState('saved');
      return true;
    } catch (e) {
      setSaveState('error');
      setNotice({ type: 'error', text: `Could not save: ${e.message}` });
      return false;
    }
  }, []);

  // Don't lose a pending change if the page is closed or navigated away from.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        const { week: w, picked: p } = latest.current;
        api.put('/availability', { week: w, slots: toSlots(p) }).catch(() => {});
      }
    },
    []
  );

  function schedule() {
    setFinalised(false);
    writeFinal(user.id, latest.current.week, false);
    setNotice(null);
    setSaveState('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  }

  async function changeWeek(next) {
    if (timer.current) await flush();
    setParams({ week: next });
  }

  function toggle(key) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    schedule();
  }

  function setAll(on) {
    const next = new Set();
    if (on) for (let d = 0; d < 7; d++) for (const s of shifts) next.add(`${d}-${s.id}`);
    setPicked(next);
    schedule();
  }

  async function finalise() {
    setBusy(true);
    const ok = await flush();
    if (ok) {
      writeFinal(user.id, week, true);
      setFinalised(true);
      setNotice({ type: 'success', text: 'Availability finalised. Your manager can use it to build the roster.' });
    }
    setBusy(false);
  }

  const tally = tallyHours(
    [...picked].map((k) => ({ user_id: 0, shift_id: Number(k.split('-')[1]) })),
    shifts
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">My availability</h1>
            {!loading && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  finalised ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {finalised ? 'Finalised' : 'Draft'}
              </span>
            )}
            <SaveStatus state={saveState} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Tap a shift to mark that you can work it. Changes save automatically as a draft. Press Finalise when you are done.
          </p>
        </div>
        <WeekPicker week={week} onChange={changeWeek} minWeek={thisWeek} />
      </div>

      {notice && <Notice type={notice.type}>{notice.text}</Notice>}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Loading…</div>
      ) : (
        <RosterGrid
          week={week}
          shifts={shifts}
          renderCell={(day, shift) => {
            const key = `${day}-${shift.id}`;
            const on = picked.has(key);
            return (
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(key)}
                className={`flex h-full min-h-[5rem] w-full flex-col items-center justify-center gap-1 rounded-lg border text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  on
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {on ? '✓' : '–'}
                </span>
                {on ? 'Available' : 'Unavailable'}
              </button>
            );
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
            {picked.size} {picked.size === 1 ? 'shift' : 'shifts'} available
          </span>
          <span className="rounded-lg bg-slate-100 px-3 py-1 font-medium text-slate-700">{fmtHours(tally.total)} of work you can take</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={() => setAll(true)} disabled={loading}>
            Mark all available
          </button>
          <button type="button" className={btnSecondary} onClick={() => setAll(false)} disabled={loading || picked.size === 0}>
            Clear all
          </button>
          <button type="button" className={btnPrimary} onClick={finalise} disabled={busy || loading || finalised}>
            {busy ? 'Finalising…' : finalised ? 'Finalised' : 'Finalise availability'}
          </button>
        </div>
      </div>
    </div>
  );
}