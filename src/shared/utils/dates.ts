import type { DateRange, ReportPeriod } from '@/shared/types/domain';

/** Calendar-date helpers on YYYY-MM-DD strings (UTC arithmetic, no time zones involved). */

const DAY = 86_400_000;
const toTime = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fromTime = (t: number) => new Date(t).toISOString().slice(0, 10);

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const addDays = (date: string, days: number) => fromTime(toTime(date) + days * DAY);

export const daysInRange = (r: DateRange) => Math.round((toTime(r.to) - toTime(r.from)) / DAY) + 1;

export function isValidRange(r: DateRange): boolean {
  return ISO_DATE.test(r.from) && ISO_DATE.test(r.to) && r.from <= r.to;
}

export type RangePreset = 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'thisYear';

export function presetRange(preset: RangePreset, today: string): DateRange {
  const [y, m] = today.split('-').map(Number) as [number, number];
  const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
  switch (preset) {
    case 'last7':
      return { from: addDays(today, -6), to: today };
    case 'last30':
      return { from: addDays(today, -29), to: today };
    case 'last90':
      return { from: addDays(today, -89), to: today };
    case 'thisMonth':
      return { from: monthStart, to: today };
    case 'lastMonth': {
      const end = addDays(monthStart, -1);
      return { from: `${end.slice(0, 7)}-01`, to: end };
    }
    case 'thisYear':
      return { from: `${y}-01-01`, to: today };
  }
}

/**
 * Working week used for weekly reports: Saturday–Friday (Iraqi weekend is Friday).
 * PROVISIONAL until the local project confirms its reporting week.
 */
export const WEEK_START_DAY = 6;

/** The report period (week, month or year) containing `anchor`. */
export function periodRange(period: Exclude<ReportPeriod, 'custom'>, anchor: string): DateRange {
  const [y, m] = anchor.split('-').map(Number) as [number, number];
  if (period === 'yearly') return { from: `${y}-01-01`, to: `${y}-12-31` };
  if (period === 'monthly') {
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    return { from: `${y}-${String(m).padStart(2, '0')}-01`, to: addDays(next, -1) };
  }
  const dow = new Date(toTime(anchor)).getUTCDay();
  const from = addDays(anchor, -((dow - WEEK_START_DAY + 7) % 7));
  return { from, to: addDays(from, 6) };
}

/** Monday-independent week key (start date of the reporting week). */
export const weekKey = (date: string) => periodRange('weekly', date).from;
