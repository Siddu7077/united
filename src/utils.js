// Shared constants and date helpers. Weeks are identified by the ISO date of their Monday.

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const pad = (n) => String(n).padStart(2, '0');

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export const currentWeek = () => toISO(mondayOf());

export function addWeeks(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + 7 * n);
  return toISO(d);
}

export function dayDate(weekIso, dayIndex) {
  const d = parseISO(weekIso);
  d.setDate(d.getDate() + dayIndex);
  return d;
}

export const fmtDate = (d) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

export function weekLabel(weekIso) {
  const start = dayDate(weekIso, 0);
  const end = dayDate(weekIso, 6);
  return `${fmtDate(start)} – ${fmtDate(end)} ${end.getFullYear()}`;
}

/** "14:00:00" -> "2:00 PM" */
export function fmtTime(t) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** "6:30 AM – 2:00 PM", with "(+1 day)" for shifts that run past midnight. */
export function shiftRange(shift) {
  const crossesMidnight = shift.end_time <= shift.start_time;
  return `${fmtTime(shift.start_time)} – ${fmtTime(shift.end_time)}${crossesMidnight ? ' (+1 day)' : ''}`;
}

// Full class names (not built dynamically) so Tailwind can see them.
const SHIFT_STYLES = {
  1: { chip: 'border-amber-200 bg-amber-50 text-amber-900', dot: 'bg-amber-400' },
  2: { chip: 'border-sky-200 bg-sky-50 text-sky-900', dot: 'bg-sky-400' },
  3: { chip: 'border-indigo-200 bg-indigo-50 text-indigo-900', dot: 'bg-indigo-400' },
};
const FALLBACK_STYLE = { chip: 'border-slate-200 bg-slate-50 text-slate-900', dot: 'bg-slate-400' };

export const shiftStyle = (shiftId) => SHIFT_STYLES[shiftId] || FALLBACK_STYLE;
