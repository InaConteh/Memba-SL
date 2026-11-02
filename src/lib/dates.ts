/** Dates are 'YYYY-MM-DD' strings. Freetown is UTC+0 all year, so "today" is the UTC date. */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** '2026-10-23' → '23 Oct', or '23 Oct 2025' when it isn't this year. */
export function formatShortDate(iso: string, today: string = todayIso()): string {
  const [y, m, d] = iso.split('-').map(Number);
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return `${d} ${MONTHS[m - 1]}${sameYear ? '' : ` ${y}`}`;
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** 'Due today', '8 days overdue', 'Due in 3 days'. */
export function dueLabel(dueDate: string, today: string = todayIso()): string {
  const late = daysBetween(dueDate, today);
  if (late === 0) return 'Due today';
  if (late > 0) return `${late} ${late === 1 ? 'day' : 'days'} overdue`;
  return `Due in ${-late} ${late === -1 ? 'day' : 'days'}`;
}
