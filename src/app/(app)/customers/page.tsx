import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Avatar, Pill, minor } from '@/components/display';
import { buttonVariants } from '@/components/ui/button';
import { DUE_SOON_DAYS, customerStatus } from '@/lib/customer-status';
import { addDays, monthName, todayIso } from '@/lib/dates';
import { formatLeones } from '@/lib/money';
import { formatSLPhone } from '@/lib/phone';
import { bookTotals } from '@/lib/server/book';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Customers · Memba' };

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'soon', label: 'Due soon' },
  { value: 'clear', label: 'Nothing owed' },
  { value: 'archived', label: 'Archived' },
] as const;
type Filter = (typeof FILTERS)[number]['value'];
const LIMIT = 200;
const NO_MATCH = '00000000-0000-0000-0000-000000000000';

export default async function CustomersPage({ searchParams }: PageProps<'/customers'>) {
  const params = await searchParams;
  const q = String(params.q ?? '').trim().slice(0, 60);
  const show: Filter = FILTERS.some((f) => f.value === params.show) ? (params.show as Filter) : 'all';
  const today = todayIso();
  const supabase = await createClient();

  let query = supabase
    .from('customer_balances')
    .select('id, name, phone, group_label, archived_at, owed_minor, overdue_minor, oldest_due_date')
    .order('overdue_minor', { ascending: false })
    .order('owed_minor', { ascending: false })
    .order('name')
    .limit(LIMIT);
  query = show === 'archived' ? query.not('archived_at', 'is', null) : query.is('archived_at', null);
  if (show === 'overdue') query = query.gt('overdue_minor', 0);
  if (show === 'soon') {
    query = query.gt('owed_minor', 0).eq('overdue_minor', 0).lte('oldest_due_date', addDays(today, DUE_SOON_DAYS));
  }
  if (show === 'clear') query = query.eq('owed_minor', 0);

  // Change 1: a reference search (M-4821, m4821, 4821 with the M-) finds the invoice and its customer
  const refMatch = q.match(/^m-?(\d{1,4})$/i);
  let invoiceMatches: { id: string; reference: string; description: string; status: string; customer_id: string }[] = [];
  if (refMatch) {
    const { data } = await supabase
      .from('invoices')
      .select('id, reference, description, status, customer_id')
      .ilike('reference', `M-${refMatch[1]}%`)
      .limit(20);
    invoiceMatches = data ?? [];
    query = query.in('id', invoiceMatches.length ? invoiceMatches.map((i) => i.customer_id) : [NO_MATCH]);
  } else if (q) {
    const name = q.replace(/[^\p{L}\p{N} .'-]/gu, '').trim();
    const digits = q.replace(/\D/g, '').replace(/^(00232|232|0)/, '');
    const terms = [name && `name.ilike."%${name}%"`, digits.length >= 3 && `phone.ilike."%${digits}%"`].filter(Boolean);
    query = terms.length ? query.or(terms.join(',')) : query.in('id', [NO_MATCH]);
  }

  const [{ data: customers, error }, totals] = await Promise.all([query, bookTotals(supabase, today)]);
  if (error) throw new Error('Could not load customers.');
  if (customers.length === 0 && !q && show === 'all') return <EmptyBook />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Customers</h1>

      <section aria-label="Totals" className="flex flex-col gap-3 rounded-2xl bg-forest p-5 text-white">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm">Customers owe you</p>
          <p className="font-heading text-4xl font-extrabold tracking-tight">{formatLeones(totals.owedMinor)}</p>
          <p className="text-sm">
            across {totals.owingCount} {totals.owingCount === 1 ? 'customer' : 'customers'}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-2">
          <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-forest-deep px-3 py-2.5">
            <dt className="text-xs">Overdue · {totals.overdueCount}</dt>
            <dd className="text-base font-bold">{formatLeones(totals.overdueMinor)}</dd>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-forest-deep px-3 py-2.5">
            <dt className="text-xs">Collected in {monthName(today)}</dt>
            <dd className="text-base font-bold">{formatLeones(totals.collectedMinor)}</dd>
          </div>
        </dl>
      </section>

      <form action="/customers" role="search" className="flex h-13 items-center gap-2 rounded-2xl border bg-card px-4">
        <Search aria-hidden className="size-5 text-muted-foreground" />
        <input type="hidden" name="show" value={show} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Name, phone or reference (M-…)"
          aria-label="Search customers"
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
        />
      </form>

      <nav aria-label="Filter customers" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={{ pathname: '/customers', query: { show: f.value, ...(q ? { q } : {}) } }}
            aria-current={show === f.value ? 'page' : undefined}
            className={cn(
              'flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap',
              show === f.value ? 'bg-foreground text-background' : 'border bg-card',
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {invoiceMatches.length > 0 && (
        <section aria-labelledby="inv-matches" className="flex flex-col gap-2">
          <h2 id="inv-matches" className="text-sm font-semibold">Invoices</h2>
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {invoiceMatches.map((i) => (
              <li key={i.id}>
                <Link href={`/invoices/${i.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0 truncate text-base">{i.description}</span>
                  <span className="shrink-0 font-mono text-sm font-semibold">{i.reference}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {customers.length === LIMIT && (
        <p className="text-sm text-muted-foreground">Showing the first {LIMIT}. Search to find others.</p>
      )}
      {customers.length === 0 ? (
        <NoMatches q={q} show={show} />
      ) : (
        <ul className="flex flex-col divide-y">
          {customers.map((c) => {
            const owed = minor(c.owed_minor);
            const status = customerStatus({ ...c, partPaid: totals.partPaidCustomerIds.has(c.id) }, today);
            const name = c.name ?? '';
            return (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="flex min-h-18 items-center gap-3 py-3">
                  <Avatar name={name} tone={status.tone} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-base font-semibold">{name}</span>
                    {c.phone ? (
                      <span className="truncate text-sm text-muted-foreground">
                        {[c.group_label, formatSLPhone(c.phone)].filter(Boolean).join(' · ')}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-nudge-deep">No phone: no reminders</span>
                    )}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {owed > 0 && <span className="text-base font-bold">{formatLeones(owed)}</span>}
                    <Pill label={status.label} tone={status.tone} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/customers/new"
        className="sticky bottom-20 ml-auto flex h-14 w-fit items-center gap-2 rounded-2xl bg-ink px-5 text-base font-semibold text-white shadow-lg"
      >
        <Plus aria-hidden className="size-5" />
        Add customer
      </Link>
    </div>
  );
}

const FIRST_STEPS = ['Add who owes you and how much', 'Memba tells you who to remind', 'Record what they pay'];

function EmptyBook() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-0.5 rounded-2xl border border-dashed border-input bg-card p-5">
        <p className="text-sm text-muted-foreground">Customers owe you</p>
        <p className="font-heading text-4xl font-extrabold text-muted-foreground">{formatLeones(0)}</p>
        <p className="text-sm text-muted-foreground">Your book is empty</p>
      </div>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">Move your credit book into Memba</h1>
        <p className="text-base text-muted-foreground">Start with the people who owe you the most.</p>
      </div>
      <ol className="flex flex-col gap-3">
        {FIRST_STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-base">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-forest-mist text-sm font-bold text-forest-deep"
            >
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <Link href="/customers/new" className={cn(buttonVariants(), 'h-14 text-base font-semibold')}>
        <Plus aria-hidden className="size-5" />
        Add your first customer
      </Link>
      <Link href="/customers?show=archived" className="flex h-11 items-center justify-center text-sm text-muted-foreground underline">
        See archived customers
      </Link>
    </div>
  );
}

const NO_MATCH_TEXT: Record<Filter, string> = {
  all: 'No customers yet.',
  overdue: 'Nobody is overdue.',
  soon: `Nothing is due in the next ${DUE_SOON_DAYS} days.`,
  clear: 'Everyone here still owes you something.',
  archived: 'No archived customers.',
};

function NoMatches({ q, show }: { q: string; show: Filter }) {
  return (
    <p className="rounded-2xl border border-dashed border-input px-4 py-8 text-center text-sm text-muted-foreground">
      {q ? `No customers match “${q}”.` : NO_MATCH_TEXT[show]}
    </p>
  );
}
