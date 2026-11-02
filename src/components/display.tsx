import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { dueLabel, daysBetween, todayIso } from '@/lib/dates';
import { cn } from '@/lib/utils';

/** Views return numeric/bigint sums as number | null; treat null as zero. */
export function minor(value: number | null | undefined): number {
  return Number(value ?? 0);
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="-ml-2 flex h-11 w-fit items-center gap-1 px-2 text-base font-medium">
      <ChevronLeft aria-hidden className="size-5" />
      {label}
    </Link>
  );
}

type InvoiceStatus = { status: string | null; balance_minor: number | null; due_date: string | null };

/** 'Paid', 'Written off', '8 days overdue', 'Due today', 'Due in 3 days'. */
export function invoiceStatusLabel({ status, balance_minor, due_date }: InvoiceStatus, today = todayIso()): string {
  if (status === 'written_off') return 'Written off';
  if (status === 'paid' || minor(balance_minor) <= 0) return 'Paid';
  return due_date ? dueLabel(due_date, today) : '';
}

export function isOverdue(dueDate: string | null, today = todayIso()): boolean {
  return Boolean(dueDate) && daysBetween(dueDate as string, today) > 0;
}

export function StatusText({ label, overdue, className }: { label: string; overdue: boolean; className?: string }) {
  return (
    <span className={cn('text-xs', overdue ? 'font-semibold text-destructive' : 'text-muted-foreground', className)}>
      {label}
    </span>
  );
}

const TONES: Record<string, string> = { gentle: 'Gentle', firm: 'Firm', final: 'Final' };

/** 'Final · ready to send', 'Firm · you sent it', 'Gentle · cancelled (paid)'. */
export function reminderLabel(r: { tone: string; status: string; skip_reason: string | null }): string {
  const tone = TONES[r.tone] ?? r.tone;
  const status: Record<string, string> = {
    prepared: 'ready to send',
    opened: 'opened, not confirmed',
    owner_confirmed_sent: 'you sent it',
    skipped: r.skip_reason === 'superseded' ? 'replaced by a later reminder' : 'skipped',
    cancelled: r.skip_reason === 'written_off' ? 'cancelled (written off)' : 'cancelled (paid)',
  };
  return `${tone} · ${status[r.status] ?? r.status}`;
}
