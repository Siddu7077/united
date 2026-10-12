import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { DAYS, addWeeks, currentWeek, shiftRange } from '../../utils.js';
import { fmtHours, shiftHours, tallyHours } from '../../hours.js';
import { btnPrimary, btnSecondary, btnWarn } from '../../ui.js';
import HoursSummary from '../../components/HoursSummary.jsx';
import Modal from '../../components/Modal.jsx';
import Notice from '../../components/Notice.jsx';
import RosterGrid from '../../components/RosterGrid.jsx';
import SaveStatus from '../../components/SaveStatus.jsx';
import WeekPicker from '../../components/WeekPicker.jsx';

const STATUS_LABEL = { none: 'Not started', draft: 'Draft', published: 'Published' };
const STATUS_STYLE = {
  none: 'bg-slate-100 text-slate-600',
  draft: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-800',
};

const buildEntries = (assign) =>
  Object.entries(assign).flatMap(([key, ids]) => {
    const [day, shift_id] = key.split('-').map(Number);
    return ids.map((user_id) => ({ day, shift_id, user_id }));
  });

export default function RosterBuilder() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const thisWeek = currentWeek();
  const week = params.get('week') || addWeeks(thisWeek, 1);

  const [shifts, setShifts] = useState([]);
  const [data, setData] = useState(null);
  const [assign, setAssign] = useState({}); // "day-shiftId" -> [userId, ...]
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [notice, setNotice] = useState(null);

  const status = data?.status || 'none';
  const isPublished = status === 'published';

  const timer = useRef(null);
  const queue = useRef(Promise.resolve());
  const latest = useRef({});
  latest.current = { week, assign, isPublished };

  useEffect(() => {
    api
      .get('/shifts')
      .then((r) => setShifts(r.shifts))
      .catch((e) => setNotice({ type: 'error', text: e.message }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setOpen(null);
    setNotice(null);
    setSaveState('idle');
    api
      .get(`/roster?week=${week}`)
      .then((r) => {
        if (cancelled) return;
        const map = {};
        for (const e of r.entries) (map[`${e.day}-${e.shift_id}`] ||= []).push(e.user_id);
        setData(r);
        setAssign(map);
        setDirty(false);
      })
      .catch((e) => !cancelled && setNotice({ type: 'error', text: e.message }));
    return () => {
      cancelled = true;
    };
  }, [week]);

  // The manager can be rostered too, and is always treated as available.
  const people = useMemo(() => {
    const list = (data?.employees || []).filter((e) => e.id !== user.id);
    return [{ id: user.id, name: user.name, isAdmin: true }, ...list];
  }, [data, user]);
  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const shiftsById = useMemo(() => Object.fromEntries(shifts.map((s) => [s.id, s])), [shifts]);
  const isAvail = (id, key) => id === user.id || (data.availability[key] || []).includes(id);

  const stats = useMemo(() => {
    if (!data) return { unfilled: 0, unavailableAssigned: 0, total: 0 };
    let unfilled = 0;
    let unavailableAssigned = 0;
    for (const shift of shifts) {
      for (let day = 0; day < 7; day++) {
        const key = `${day}-${shift.id}`;
        const ids = assign[key] || [];
        if (ids.length === 0) unfilled++;
        const avail = data.availability[key] || [];
        unavailableAssigned += ids.filter((id) => id !== user.id && !avail.includes(id)).length;
      }
    }
    return { unfilled, unavailableAssigned, total: shifts.length * 7 };
  }, [data, shifts, assign, user.id]);

  const hours = useMemo(() => {
    const t = tallyHours(buildEntries(assign), shifts);
    const rows = people.map((p) => ({
      id: p.id,
      name: p.name,
      tag: p.isAdmin ? 'Manager' : null,
      hours: t.per[p.id]?.hours || 0,
      shifts: t.per[p.id]?.shifts || 0,
    }));
    rows.sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
    return { rows, total: t.total, count: t.count };
  }, [assign, shifts, people]);

  // ---- autosave (drafts only; a published roster is updated explicitly) ----
  const persistDraft = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    queue.current = queue.current.then(async () => {
      const { week: w, assign: a } = latest.current;
      setSaveState('saving');
      try {
        const r = await api.put('/roster', { week: w, entries: buildEntries(a), publish: false });
        setData((d) => (d ? { ...d, status: r.status } : d));
        setSaveState('saved');
        if (!timer.current) setDirty(false);
      } catch (e) {
        setSaveState('error');
        setNotice({ type: 'error', text: `Draft not saved: ${e.message}` });
      }
    });
    return queue.current;
  }, []);

  function scheduleDraft() {
    if (latest.current.isPublished) return;
    setSaveState('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(persistDraft, 700);
  }

  // Save a pending draft if the page is closed or navigated away from.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        const { week: w, assign: a } = latest.current;
        api.put('/roster', { week: w, entries: buildEntries(a), publish: false }).catch(() => {});
      }
    },
    []
  );

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function changeWeek(next) {
    if (timer.current) await persistDraft();
    else if (dirty && !window.confirm('You have unsaved changes for this week. Leave without saving?')) return;
    setParams({ week: next });
  }

  function toggle(key, userId) {
    setAssign((prev) => {
      const cur = prev[key] || [];
      const next = cur.includes(userId) ? cur.filter((id) => id !== userId) : [...cur, userId];
      return { ...prev, [key]: next };
    });
    setDirty(true);
    setNotice(null);
    scheduleDraft();
  }

  function autoFill() {
    const next = { ...assign };
    const load = {};
    for (const [key, ids] of Object.entries(next)) {
      const h = shiftHours(shiftsById[Number(key.split('-')[1])]);
      ids.forEach((id) => (load[id] = (load[id] || 0) + h));
    }
    let filled = 0;
    let byAdmin = 0;
    for (let day = 0; day < 7; day++) {
      for (const shift of shifts) {
        const key = `${day}-${shift.id}`;
        if ((next[key] || []).length) continue;
        const candidates = (data.availability[key] || []).filter((id) => id !== user.id && peopleById[id]);
        candidates.sort((a, b) => (load[a] || 0) - (load[b] || 0));
        const chosen = candidates[0] ?? user.id; // nobody available -> the manager covers
        if (chosen === user.id) byAdmin++;
        next[key] = [chosen];
        load[chosen] = (load[chosen] || 0) + shiftHours(shift);
        filled++;
      }
    }
    if (!filled) {
      setNotice({ type: 'info', text: 'Every shift already has someone assigned.' });
      return;
    }
    setAssign(next);
    setDirty(true);
    scheduleDraft();
    setNotice({
      type: 'success',
      text: `Filled ${filled} empty ${filled === 1 ? 'shift' : 'shifts'}${
        byAdmin ? `, ${byAdmin} covered by you because nobody was available` : ''
      }. Review and adjust as needed.`,
    });
  }

  async function save(publish) {
    if (publish && stats.unfilled > 0) {
      const ok = window.confirm(
        `${stats.unfilled} shift${stats.unfilled === 1 ? ' has' : 's have'} nobody assigned. Publish anyway?`
      );
      if (!ok) return;
    }
    clearTimeout(timer.current);
    timer.current = null;
    setBusy(true);
    setNotice(null);
    try {
      await queue.current;
      const r = await api.put('/roster', { week, entries: buildEntries(assign), publish });
      setData((d) => ({ ...d, status: r.status }));
      setDirty(false);
      setSaveState('saved');
      setNotice({
        type: 'success',
        text: publish
          ? isPublished
            ? 'Published roster updated.'
            : 'Roster published. Employees can now see their own shifts.'
          : 'Draft saved. Employees cannot see it until you publish.',
      });
    } catch (e) {
      setNotice({ type: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  const filled = stats.total - stats.unfilled;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">Roster employees</h1>
            {data && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>
                {STATUS_LABEL[status]}
              </span>
            )}
            {!isPublished && <SaveStatus state={saveState} />}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Click a shift to see who is available, then choose who works it. Drafts save automatically. You can roster yourself too.
          </p>
        </div>
        <WeekPicker week={week} onChange={changeWeek} />
      </div>

      {notice && <Notice type={notice.type}>{notice.text}</Notice>}
      {isPublished && !notice && (
        <Notice type="info">This roster is live. Changes are only visible to employees after you press Update published roster.</Notice>
      )}

      {!data ? (
        !notice && <div className="py-10 text-center text-sm text-slate-500">Loading…</div>
      ) : (
        <>
          <RosterGrid
            week={week}
            shifts={shifts}
            renderCell={(day, shift) => {
              const key = `${day}-${shift.id}`;
              const ids = assign[key] || [];
              const avail = data.availability[key] || [];
              return (
                <button
                  type="button"
                  onClick={() => setOpen({ day, shift })}
                  className="flex h-full min-h-[5rem] w-full flex-col gap-1 rounded-lg border border-dashed border-slate-300 p-1.5 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label={`${DAYS[day]} ${shift.name}: ${ids.length} assigned, ${avail.length} available`}
                >
                  <span className={`text-[11px] font-medium ${avail.length ? 'text-emerald-700' : 'text-red-600'}`}>
                    {avail.length} available
                  </span>
                  {ids.length === 0 ? (
                    <span className="text-xs text-slate-400">+ Assign</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {ids.map((id) => {
                        const ok = isAvail(id, key);
                        const admin = id === user.id;
                        return (
                          <span
                            key={id}
                            title={ok ? undefined : 'Marked themselves unavailable'}
                            className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                              !ok
                                ? 'bg-amber-100 text-amber-900'
                                : admin
                                  ? 'bg-violet-100 text-violet-900'
                                  : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {!ok && '⚠ '}
                            {peopleById[id]?.name.split(' ')[0] || 'Former employee'}
                            {admin && ' (you)'}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </button>
              );
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-1 text-sm text-slate-500">
              <p className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-slate-100 px-3 py-1 font-semibold text-slate-800">
                  {filled}/{stats.total} shifts filled
                </span>
                {dirty && isPublished && <span className="font-medium text-amber-600">Unpublished changes</span>}
              </p>
              {stats.unavailableAssigned > 0 && (
                <p className="text-amber-700">
                  ⚠ {stats.unavailableAssigned} assignment{stats.unavailableAssigned === 1 ? '' : 's'} on shifts the
                  person marked unavailable.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnSecondary} onClick={autoFill} disabled={busy || stats.unfilled === 0}>
                Auto-fill empty shifts
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => save(true)}
                disabled={busy || (isPublished && !dirty)}
              >
                {busy ? 'Saving…' : isPublished ? 'Update published roster' : 'Publish roster'}
              </button>
            </div>
          </div>

          <HoursSummary title="Hours by person" rows={hours.rows} total={hours.total} count={hours.count} />
        </>
      )}

      {open && data && (
        <AssignModal
          day={open.day}
          shift={open.shift}
          admin={people[0]}
          employees={people.slice(1)}
          availableIds={data.availability[`${open.day}-${open.shift.id}`] || []}
          selectedIds={assign[`${open.day}-${open.shift.id}`] || []}
          onToggle={(userId) => toggle(`${open.day}-${open.shift.id}`, userId)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

/** Picker for one shift: the manager, then available employees, then those who are not. */
function AssignModal({ day, shift, admin, employees, availableIds, selectedIds, onToggle, onClose }) {
  const [pending, setPending] = useState(null);

  const available = employees.filter((e) => availableIds.includes(e.id));
  const unavailable = employees.filter((e) => !availableIds.includes(e.id));

  function press(emp, isAvailable) {
    if (!selectedIds.includes(emp.id) && !isAvailable) {
      setPending(emp);
      return;
    }
    onToggle(emp.id);
  }

  function row(emp, isAvailable) {
    const selected = selectedIds.includes(emp.id);
    return (
      <li key={emp.id}>
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => press(emp, isAvailable)}
          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            selected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
              selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent'
            }`}
          >
            ✓
          </span>
          <span className="flex-1 font-medium text-slate-900">{emp.name}</span>
          {!isAvailable && selected && <span className="text-xs font-medium text-amber-700">⚠ unavailable</span>}
        </button>
      </li>
    );
  }

  return (
    <Modal
      title={`${DAYS[day]} · ${shift.name}`}
      subtitle={`${shiftRange(shift)} · ${fmtHours(shiftHours(shift))}`}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        {pending && (
          <div role="alertdialog" aria-label="Unavailable employee" className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">{pending.name} is not available for this shift.</p>
            <p className="mt-1 text-sm text-amber-800">
              They did not mark {DAYS[day]} {shift.name.toLowerCase()} as available. Assign them anyway?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className={btnWarn}
                onClick={() => {
                  onToggle(pending.id);
                  setPending(null);
                }}
              >
                Assign anyway
              </button>
              <button type="button" className={btnSecondary} onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Manager
          </h3>
          <ul className="space-y-1.5">{row({ ...admin, name: `${admin.name} (you)` }, true)}</ul>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Available ({available.length})
          </h3>
          {available.length === 0 ? (
            <p className="text-sm text-slate-500">Nobody marked this shift as available. You can cover it yourself.</p>
          ) : (
            <ul className="space-y-1.5">{available.map((e) => row(e, true))}</ul>
          )}
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Not available ({unavailable.length})
          </h3>
          {unavailable.length === 0 ? (
            <p className="text-sm text-slate-500">Everyone is available.</p>
          ) : (
            <ul className="space-y-1.5">{unavailable.map((e) => row(e, false))}</ul>
          )}
        </section>

        <div className="flex justify-end border-t border-slate-200 pt-4">
          <button type="button" className={btnPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}