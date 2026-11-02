import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { archiveCustomer } from '@/actions/customers';
import { ConfirmAction } from '@/components/confirm-action';
import { BackLink, StatusText, invoiceStatusLabel, isOverdue, minor, reminderLabel } from '@/components/display';
import { RecordPaymentSheet } from '@/components/record-payment-sheet';
import { buttonVariants } from '@/components/ui/button';
import { dueLabel, formatShortDate, todayIso } from '@/lib/dates';
import { formatLeones } from '@/lib/money';
import { formatSLPhone } from '@/lib/phone';
import { IdSchema, PAYMENT_METHOD_LABELS } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Customer · Memba' };

export default async function CustomerPage({ params }: PageProps<'/customers/[id]'>) {
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) notFound();
  const today = todayIso();
  const supabase = await createClient();

  const [customerResult, invoicesResult] = await Promise.all([
    supabase.from('customer_balances').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('invoice_balances')
      .select('id, reference, description, amount_minor, balance_minor, due_date, status')
      .eq('customer_id', id)
      .order('due_date', { ascending: false }),
  ]);
  if (customerResult.error || invoicesResult.error) throw new Error('Could not load this customer.');
  const customer = customerResult.data;
  if (!customer) notFound();
  const invoices = invoicesResult.data;
  const invoiceIds = invoices.map((i) => i.id as string);
  const referenceOf = new Map(invoices.map((i) => [i.id, i.reference]));

  const [paymentsResult, remindersResult] = invoiceIds.length
    ? await Promise.all([
        supabase
          .from('payments')
          .select('id, invoice_id, amount_minor, method, reference, paid_on, voided_at')
          .in('invoice_id', invoiceIds)
          .order('paid_on', { ascending: false })
          .limit(20),
        supabase
          .from('reminders')
          .select('id, invoice_id, tone, status, skip_reason, due_on')
          .in('invoice_id', invoiceIds)
          .order('due_on', { ascending: false })
          .limit(10),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (paymentsResult.error || remindersResult.error) throw new Error('Could not load this customer’s history.');

  const owed = minor(customer.owed_minor);
  // Record payment goes to the oldest invoice still owing; each invoice page has its own button too
  const oldestOpen = [...invoices]
    .filter((i) => i.status === 'open' && minor(i.balance_minor) > 0)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0];

  return (
    <div className="flex flex-col gap-5">
      <BackLink href="/customers" label="Customers" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-xl font-semibold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[customer.phone ? formatSLPhone(customer.phone) : 'No phone: no reminders', customer.group_label].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Link href={`/customers/${id}/edit`} className={cn(buttonVariants({ variant: 'outline' }), 'h-11 shrink-0 px-4 text-base')}>
          Edit
        </Link>
      </div>

      {customer.archived_at && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">Archived. No new reminders are made for this customer.</p>
      )}

      <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">Owes</span>
          <span className="text-2xl font-bold">{formatLeones(owed)}</span>
        </div>
        {owed > 0 && customer.oldest_due_date && (
          <StatusText label={dueLabel(customer.oldest_due_date, today)} overdue={minor(customer.overdue_minor) > 0} className="text-sm" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {oldestOpen ? (
          <RecordPaymentSheet
            invoice={{
              id: oldestOpen.id as string,
              balanceMinor: minor(oldestOpen.balance_minor),
              reference: oldestOpen.reference as string,
              description: oldestOpen.description as string,
              customerName: customer.name as string,
            }}
          />
        ) : (
          <span />
        )}
        {!customer.archived_at && (
          <Link href={`/invoices/new?customer=${id}`} className={cn(buttonVariants({ variant: 'outline' }), 'h-12 text-base')}>
            New invoice
          </Link>
        )}
      </div>

      <section aria-labelledby="inv-h" className="flex flex-col gap-2">
        <h2 id="inv-h" className="text-base font-semibold">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No invoices yet. Create one for what this customer owes.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invoices.map((i) => {
              const balance = minor(i.balance_minor);
              const label = invoiceStatusLabel(i, today);
              return (
                <li key={i.id}>
                  <Link href={`/invoices/${i.id}`} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-base font-semibold">{i.description}</span>
                      <span className="text-sm text-muted-foreground">
                        <span className="font-mono">{i.reference}</span> · {formatLeones(minor(i.amount_minor))}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-base font-semibold">{balance > 0 && i.status === 'open' ? formatLeones(balance) : ''}</span>
                      <StatusText label={label} overdue={i.status === 'open' && balance > 0 && isOverdue(i.due_date, today)} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="pay-h" className="flex flex-col gap-2">
        <h2 id="pay-h" className="text-base font-semibold">Payments</h2>
        {paymentsResult.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {paymentsResult.data.map((p) => (
              <li key={p.id} className={cn('flex justify-between gap-3 px-4 py-3', p.voided_at && 'text-muted-foreground')}>
                <span className="flex flex-col gap-0.5">
                  <span className={cn('text-base', p.voided_at && 'line-through')}>
                    {PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] ?? p.method}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {[formatShortDate(p.paid_on, today), p.reference, referenceOf.get(p.invoice_id), p.voided_at && 'voided']
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className={cn('text-base font-semibold', p.voided_at && 'line-through')}>{formatLeones(p.amount_minor)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="rem-h" className="flex flex-col gap-2">
        <h2 id="rem-h" className="text-base font-semibold">Reminders</h2>
        {remindersResult.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reminders yet.</p>
        ) : (
          <ol className="flex flex-col gap-2 text-sm">
            {remindersResult.data.map((r) => (
              <li key={r.id} className="flex justify-between gap-3">
                <span>{reminderLabel(r)}</span>
                <span className="shrink-0 text-muted-foreground">{formatShortDate(r.due_on, today)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {!customer.archived_at && (
        <ConfirmAction
          action={archiveCustomer}
          fields={{ id }}
          triggerLabel="Archive customer"
          triggerVariant="ghost"
          triggerClassName="w-fit px-2 text-muted-foreground underline"
          title={`Archive ${customer.name}?`}
          body="They leave your lists and get no more reminders. Their invoices and payments are kept."
          confirmLabel="Archive"
        />
      )}
    </div>
  );
}
