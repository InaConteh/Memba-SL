import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Phone } from 'lucide-react';
import { archiveCustomer } from '@/actions/customers';
import { ConfirmAction } from '@/components/confirm-action';
import { CustomerHistory } from '@/components/customer-history';
import { BackLink, Pill, StatusText, invoiceStatusLabel, isOverdue, minor } from '@/components/display';
import { RecordPaymentSheet } from '@/components/record-payment-sheet';
import { buttonVariants } from '@/components/ui/button';
import { customerStatus } from '@/lib/customer-status';
import { todayIso } from '@/lib/dates';
import { formatLeones } from '@/lib/money';
import { formatSLPhone } from '@/lib/phone';
import { IdSchema } from '@/lib/schemas';
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
      .select('id, reference, description, amount_minor, paid_minor, balance_minor, due_date, status, created_at')
      .eq('customer_id', id)
      .order('due_date'),
  ]);
  if (customerResult.error || invoicesResult.error) throw new Error('Could not load this customer.');
  const customer = customerResult.data;
  if (!customer) notFound();
  const invoices = invoicesResult.data;
  const invoiceIds = invoices.map((i) => i.id as string);

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
          .select('id, tone, status, skip_reason, due_on, sent_at')
          .in('invoice_id', invoiceIds)
          .order('due_on', { ascending: false })
          .limit(10),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (paymentsResult.error || remindersResult.error) throw new Error('Could not load this customer’s history.');

  const name = customer.name ?? '';
  const owed = minor(customer.owed_minor);
  // Oldest first, so Record payment goes to the invoice that has waited longest
  const open = invoices.filter((i) => i.status === 'open' && minor(i.balance_minor) > 0);
  const openTotal = open.reduce((sum, i) => sum + minor(i.amount_minor), 0);
  const openPaid = open.reduce((sum, i) => sum + minor(i.paid_minor), 0);
  const status = customerStatus({ ...customer, partPaid: openPaid > 0 }, today);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/customers" label="Customers" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-sm text-muted-foreground">
            {[customer.phone ? formatSLPhone(customer.phone) : 'No phone: no reminders', customer.group_label].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              aria-label={`Call ${name}`}
              className="flex size-11 items-center justify-center rounded-xl border bg-card"
            >
              <Phone aria-hidden className="size-5" />
            </a>
          )}
          <Link href={`/customers/${id}/edit`} className={cn(buttonVariants({ variant: 'outline' }), 'h-11 rounded-xl bg-card px-4 text-base')}>
            Edit
          </Link>
        </div>
      </div>

      {customer.archived_at && (
        <p className="rounded-xl bg-secondary px-4 py-3 text-sm">Archived. No new reminders are made for this customer.</p>
      )}

      <section aria-label="Balance" className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Still owes you</span>
            <span className="font-heading text-4xl font-extrabold tracking-tight">{formatLeones(owed)}</span>
          </div>
          <Pill label={status.label} tone={status.tone} />
        </div>
        {openPaid > 0 && (
          <div className="flex flex-col gap-1.5">
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((openPaid / openTotal) * 100)}%` }} />
            </div>
            <p className="flex justify-between text-sm text-muted-foreground">
              <span>{formatLeones(openPaid)} paid</span>
              <span>of {formatLeones(openTotal)}</span>
            </p>
          </div>
        )}
      </section>

      <div className="flex gap-2 *:flex-1">
        {open[0] && (
          <RecordPaymentSheet
            triggerClassName="rounded-2xl"
            invoice={{
              id: open[0].id as string,
              balanceMinor: minor(open[0].balance_minor),
              reference: open[0].reference as string,
              description: open[0].description as string,
              customerName: name,
            }}
          />
        )}
        {!customer.archived_at && (
          <Link
            href={`/invoices/new?customer=${id}`}
            className={cn(buttonVariants({ variant: open[0] ? 'outline' : 'default' }), 'h-12 rounded-2xl text-base', open[0] && 'bg-card')}
          >
            New invoice
          </Link>
        )}
      </div>

      {open.length > 0 && (
        <section aria-labelledby="inv-h" className="flex flex-col gap-2">
          <h2 id="inv-h" className="text-base font-semibold">Open invoices</h2>
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {open.map((i) => (
              <li key={i.id}>
                <Link href={`/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-base font-semibold">{i.description}</span>
                    <span className="font-mono text-sm text-muted-foreground">{i.reference}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-base font-bold">{formatLeones(minor(i.balance_minor))}</span>
                    <StatusText label={invoiceStatusLabel(i, today)} overdue={isOverdue(i.due_date, today)} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="hist-h" className="flex flex-col gap-1">
        <h2 id="hist-h" className="text-base font-semibold">History</h2>
        <CustomerHistory
          today={today}
          payments={paymentsResult.data}
          reminders={remindersResult.data}
          invoices={invoices.map((i) => ({
            id: i.id as string,
            description: i.description as string,
            reference: i.reference as string,
            amountMinor: minor(i.amount_minor),
            createdOn: String(i.created_at).slice(0, 10),
          }))}
        />
      </section>

      {!customer.archived_at && (
        <ConfirmAction
          action={archiveCustomer}
          fields={{ id }}
          triggerLabel="Archive customer"
          triggerVariant="ghost"
          triggerClassName="w-fit px-2 text-muted-foreground underline"
          title={`Archive ${name}?`}
          body="They leave your lists and get no more reminders. Their invoices and payments are kept."
          confirmLabel="Archive"
        />
      )}
    </div>
  );
}
