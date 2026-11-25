import Link from 'next/link';
import { ArrowDown, ArrowUp, Bell } from 'lucide-react';
import { reminderLabel } from '@/components/display';
import { formatShortDate } from '@/lib/dates';
import { formatLeones } from '@/lib/money';
import { PAYMENT_METHOD_LABELS } from '@/lib/schemas';
import { cn } from '@/lib/utils';

type Invoice = { id: string; description: string; reference: string; amountMinor: number; createdOn: string };
type Payment = {
  id: string;
  invoice_id: string;
  amount_minor: number;
  method: string;
  reference: string | null;
  paid_on: string;
  voided_at: string | null;
};
type Reminder = { id: string; tone: string; status: string; skip_reason: string | null; due_on: string; sent_at: string | null };

type Entry = {
  key: string;
  kind: 'invoice' | 'payment' | 'reminder';
  date: string;
  title: string;
  detail: string[];
  amount?: string;
  href?: string;
  voided?: boolean;
};

type Props = { invoices: Invoice[]; payments: Payment[]; reminders: Reminder[]; today: string };

/** Invoices, payments and reminders in one list, newest first. */
export function CustomerHistory({ invoices, payments, reminders, today }: Props) {
  const referenceOf = new Map(invoices.map((i) => [i.id, i.reference]));
  const entries: Entry[] = [
    ...invoices.map((i): Entry => ({
      key: `i-${i.id}`,
      kind: 'invoice',
      date: i.createdOn,
      title: i.description,
      detail: [i.reference],
      amount: `+ ${formatLeones(i.amountMinor)}`,
      href: `/invoices/${i.id}`,
    })),
    ...payments.map((p): Entry => ({
      key: `p-${p.id}`,
      kind: 'payment',
      date: p.paid_on,
      title: `Paid by ${PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] ?? p.method}`,
      detail: [p.reference, referenceOf.get(p.invoice_id), p.voided_at && 'voided'].filter((d): d is string => Boolean(d)),
      amount: `− ${formatLeones(p.amount_minor)}`,
      href: `/invoices/${p.invoice_id}`,
      voided: Boolean(p.voided_at),
    })),
    ...reminders.map((r): Entry => ({
      key: `r-${r.id}`,
      kind: 'reminder',
      date: r.sent_at?.slice(0, 10) ?? r.due_on,
      title: `Reminder: ${reminderLabel(r)}`,
      detail: [],
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>;
  return (
    <ul className="flex flex-col divide-y">
      {entries.map((e) => (
        <li key={e.key}>
          {e.href ? (
            <Link href={e.href} className="flex items-center gap-3 py-3">
              <EntryRow entry={e} today={today} />
            </Link>
          ) : (
            <div className="flex items-center gap-3 py-3">
              <EntryRow entry={e} today={today} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

const ICONS = {
  invoice: { Icon: ArrowUp, className: 'bg-nudge-mist text-nudge-deep' },
  payment: { Icon: ArrowDown, className: 'bg-forest-mist text-forest-deep' },
  reminder: { Icon: Bell, className: 'bg-secondary text-muted-foreground' },
} as const;

function EntryRow({ entry, today }: { entry: Entry; today: string }) {
  const { Icon, className } = ICONS[entry.kind];
  return (
    <>
      <span aria-hidden className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', className)}>
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('text-base font-semibold', entry.voided && 'text-muted-foreground line-through')}>{entry.title}</span>
        <span className="text-sm text-muted-foreground">
          {[formatShortDate(entry.date, today), ...entry.detail].map((d) => d.replace(/^M-/, 'M‑')).join(' · ')}
        </span>
      </span>
      {entry.amount && (
        <span
          className={cn(
            'shrink-0 text-base font-bold',
            entry.kind === 'payment' && 'text-primary',
            entry.voided && 'text-muted-foreground line-through',
          )}
        >
          {entry.amount}
        </span>
      )}
    </>
  );
}
