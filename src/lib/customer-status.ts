import { daysBetween, formatShortDate, todayIso } from './dates';

export type PillTone = 'overdue' | 'good' | 'neutral';

type Totals = {
  owed_minor: number | null;
  overdue_minor: number | null;
  oldest_due_date: string | null;
  /** Some money has been paid on an invoice that is still open. */
  partPaid: boolean;
};

export const DUE_SOON_DAYS = 7;

/** The one thing worth saying about a customer, for the pill beside their name. */
export function customerStatus(c: Totals, today: string = todayIso()): { label: string; tone: PillTone } {
  if (Number(c.owed_minor ?? 0) <= 0) return { label: 'Nothing owed', tone: 'good' };
  if (Number(c.overdue_minor ?? 0) > 0 && c.oldest_due_date) {
    return { label: `Overdue ${daysBetween(c.oldest_due_date, today)}d`, tone: 'overdue' };
  }
  if (c.partPaid) return { label: 'Part paid', tone: 'good' };
  if (!c.oldest_due_date) return { label: 'Owing', tone: 'neutral' };
  const days = daysBetween(today, c.oldest_due_date);
  if (days === 0) return { label: 'Due today', tone: 'neutral' };
  return { label: days <= DUE_SOON_DAYS ? 'Due soon' : `Due ${formatShortDate(c.oldest_due_date, today)}`, tone: 'neutral' };
}

/** 'Fatmata Kamara' → 'FK', for the avatar. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const first = [...words[0]][0];
  const last = words.length > 1 ? [...words[words.length - 1]][0] : '';
  return `${first}${last}`.toUpperCase();
}
