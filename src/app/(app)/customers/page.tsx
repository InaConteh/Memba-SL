import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { StatusText, minor } from '@/components/display';
import { buttonVariants } from '@/components/ui/button';
import { dueLabel, todayIso } from '@/lib/dates';
import { formatLeones } from '@/lib/money';
import { formatSLPhone } from '@/lib/phone';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Customers · Memba' };

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'owing', label: 'Owing' },
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
  if (show === 'owing') query = query.gt('owed_minor', 0);

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

  const { data: customers, error } = await query;
  if (error) throw new Error('Could not load customers.');
  const owedTotal = customers.reduce((sum, c) => sum + minor(c.owed_minor), 0);
  const hasFilter = Boolean(q) || show !== 'all';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold">Customers</h1>
          {customers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {customers.length === LIMIT ? `First ${LIMIT}` : customers.length} {customers.length === 1 ? 'customer' : 'customers'}
              {' · '}
              {formatLeones(owedTotal)} owed
            </p>
          )}
        </div>
        <Link href="/customers/new" className={cn(buttonVariants(), 'h-11 gap-1.5 px-4 text-base')}>
          <Plus aria-hidden className="size-4" />
          Add
        </Link>
      </div>

      <form action="/customers" role="search" className="flex h-11 items-center gap-2 rounded-lg border border-input px-3">
        <Search aria-hidden className="size-4 text-muted-foreground" />
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

      <nav aria-label="Filter customers" className="flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={{ pathname: '/customers', query: { show: f.value, ...(q ? { q } : {}) } }}
            aria-current={show === f.value ? 'page' : undefined}
            className={cn(
              'flex h-9 items-center rounded-full px-4 text-sm',
              show === f.value ? 'bg-foreground font-medium text-background' : 'border border-input',
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {invoiceMatches.length > 0 && (
        <section aria-labelledby="inv-matches" className="flex flex-col gap-2">
          <h2 id="inv-matches" className="text-sm font-semibold">Invoices</h2>
          <ul className="flex flex-col divide-y rounded-xl border">
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

      {customers.length === 0 ? (
        <EmptyState q={q} show={show} hasFilter={hasFilter} />
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {customers.map((c) => {
            const owed = minor(c.owed_minor);
            const overdue = minor(c.overdue_minor) > 0;
            const status = c.oldest_due_date ? dueLabel(c.oldest_due_date, today) : '';
            return (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-2.5">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-base font-semibold">{c.name}</span>
                    {c.phone ? (
                      <span className="truncate text-sm text-muted-foreground">
                        {[c.group_label, formatSLPhone(c.phone)].filter(Boolean).join(' · ')}
                      </span>
                    ) : (
                      <span className="truncate text-sm font-medium text-amber-800">
                        {[c.group_label, 'No phone: no reminders'].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-base font-semibold">{owed > 0 ? formatLeones(owed) : 'Nothing owed'}</span>
                    {owed > 0 && status && <StatusText label={status} overdue={overdue} />}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ q, show, hasFilter }: { q: string; show: Filter; hasFilter: boolean }) {
  if (!hasFilter) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center">
        <p className="text-base font-semibold">Add your first customer</p>
        <p className="text-sm text-muted-foreground">Then create an invoice for what they owe. Importing a list from Excel is coming soon.</p>
        <Link href="/customers/new" className={cn(buttonVariants(), 'h-12 px-5 text-base')}>Add a customer</Link>
      </div>
    );
  }
  const message = q
    ? `No customers match “${q}”.`
    : show === 'owing'
      ? 'Nobody owes you money right now.'
      : 'No archived customers.';
  return <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{message}</p>;
}
