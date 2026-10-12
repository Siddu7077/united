// Shift-length helpers. Works with HH:MM strings (or numbers) under any of the common field names.
const START_KEYS = ['start_time', 'startTime', 'start', 'starts_at', 'start_hour'];
const END_KEYS = ['end_time', 'endTime', 'end', 'ends_at', 'end_hour'];

function toMinutes(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v <= 24 ? v * 60 : v;
  const m = String(v).match(/(\d{1,2}):(\d{2})/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number(v);
  return Number.isNaN(n) ? null : toMinutes(n);
}

const pick = (obj, keys) => keys.map((k) => obj[k]).find((v) => v != null);

/** Length of a shift in hours (handles shifts that run past midnight). */
export function shiftHours(shift) {
  if (!shift) return 0;
  const s = toMinutes(pick(shift, START_KEYS));
  const e = toMinutes(pick(shift, END_KEYS));
  if (s == null || e == null) return 0;
  let diff = e - s;
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

export const fmtHours = (h) => `${Math.round(h * 10) / 10}h`;

/** entries: [{ user_id, shift_id }] -> per-person and overall totals. */
export function tallyHours(entries, shifts) {
  const byShift = Object.fromEntries(shifts.map((s) => [s.id, s]));
  const per = {};
  let total = 0;
  let count = 0;
  for (const e of entries) {
    const s = byShift[e.shift_id];
    if (!s) continue;
    const h = shiftHours(s);
    const p = (per[e.user_id] ||= { hours: 0, shifts: 0 });
    p.hours += h;
    p.shifts += 1;
    total += h;
    count += 1;
  }
  return { per, total, count };
}