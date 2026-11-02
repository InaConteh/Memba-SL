import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { writeOffInvoice } from '@/actions/invoices';
import { voidPayment } from '@/actions/payments';
import { ConfirmAction } from '@/components/confirm-action';
import { BackLink, StatusText, invoiceStatusLabel, isOverdue, minor, reminderLabel } from '@/components/display';
import { RecordPaymentSheet } from '@/components/record-payment-sheet';
import { formatShortDate, todayIso } from '@/lib/dates';
import { formatLeones } from '@/lib/money';
import { IdSchema, PAYMENT_METHOD_LABELS } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Invoice · Memba' };

export default async function InvoicePage({ params }: PageProps<'/invoices/[id]'>) {
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) notFound();
  const today = todayIso();
  const supabase = await createClient();

  const [invoiceResult, paymentsResult, remindersResult] = await Promise.all([
    supabase.from('invoice_balances').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('payments')
      .select('id, amount_minor, method, reference, paid_on, voided_at, void_reason')
      .eq('invoice_id', id)
      .order('paid_on', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('reminders').select('id, step, tone, status, skip_reason, due_on').eq('invoice_id', id).order('step', { ascending: false }),
  ]);
  if (invoiceResult.error || paymentsResult.error || remindersResult.error) throw new Error('Could not load this invoice.');
  const invoice = invoiceResult.data;
  if (!invoice) notFound();

  const { data: customer } = await supabase.from('customers').select('id, name').eq('id', invoice.customer_id as string).single();
  const balance = minor(invoice.balance_minor);
  const isOpen = invoice.status === 'open' && balance > 0;
  const label = invoiceStatusLabel(invoice, today);

  return (
    <div className="flex flex-col gap-5">
      <BackLink href={`/customers/${invoice.customer_id}`} label={customer?.name ?? 'Customer'} />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">{invoice.description}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-foreground px-2.5 py-1 font-mono text-base font-semibold">{invoice.reference}</span>
          <span className="text-sm text-muted-foreground">Payment reference the customer quotes</span>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5 rounded-xl bg-muted p-3">
          <dt className="text-xs text-muted-foreground">Amount</dt>
          <dd className="text-base font-semibold">{formatLeones(minor(invoice.amount_minor))}</dd>
        </div>
        <div className="flex flex-col gap-0.5 rounded-xl bg-muted p-3">
          <dt className="text-xs text-muted-foreground">Paid</dt>
          <dd className="text-base font-semibold">{formatLeones(minor(invoice.paid_minor))}</dd>
        </div>
        <div className="flex flex-col gap-0.5 rounded-xl bg-foreground p-3 text-background">
          <dt className="text-xs opacity-80">Balance</dt>
          <dd className="text-base font-bold">{formatLeones(Math.max(balance, 0))}</dd>
        </div>
      </dl>

      <p className="text-sm text-muted-foreground">
        Due {formatShortDate(invoice.due_date as string, today)} ·{' '}
        <StatusText label={label} overdue={isOpen && isOverdue(invoice.due_date, today)} className="text-sm" />
      </p>

      {isOpen && customer && (
        <RecordPaymentSheet
          invoice={{
            id,
            balanceMinor: balance,
            reference: invoice.reference as string,
            description: invoice.description as string,
            customerName: customer.name,
          }}
        />
      )}

      <section aria-labelledby="ipay-h" className="flex flex-col gap-2">
        <h2 id="ipay-h" className="text-base font-semibold">Payments</h2>
        {paymentsResult.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {paymentsResult.data.map((p) => (
              <li
                key={p.id}
                className={cn('flex items-center justify-between gap-3 rounded-xl border px-4 py-3', p.voided_at && 'border-dashed text-muted-foreground')}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={cn('text-base font-medium', p.voided_at && 'line-through')}>
                    {formatLeones(p.amount_minor)} · {PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] ?? p.method}
                  </span>
                  <span className="text-sm">
                    {[formatShortDate(p.paid_on, today), p.reference, p.voided_at && `voided: ${p.void_reason}`].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {!p.voided_at && (
                  <ConfirmAction
                    action={voidPayment}
                    fields={{ payment_id: p.id }}
                    triggerLabel="Void"
                    triggerClassName="h-10 shrink-0 px-3 text-sm"
                    title={`Void this ${formatLeones(p.amount_minor)} payment?`}
                    body="Voided payments stay on record, crossed out. The balance goes back up."
                    confirmLabel="Void payment"
                    reasonLabel="Why are you voiding it?"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="irem-h" className="flex flex-col gap-2">
        <h2 id="irem-h" className="text-base font-semibold">Reminders</h2>
        {remindersResult.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reminders yet. The first is made on the due date.</p>
        ) : (
          <ol className="flex flex-col gap-2 text-sm">
            {remindersResult.data.map((r) => (
              <li key={r.id} className="flex justify-between gap-3">
                <span>{r.step} · {reminderLabel(r)}</span>
                <span className="shrink-0 text-muted-foreground">{formatShortDate(r.due_on, today)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {invoice.status === 'open' && (
        <ConfirmAction
          action={writeOffInvoice}
          fields={{ id }}
          triggerLabel="Write off this invoice"
          triggerVariant="ghost"
          triggerClassName="w-fit px-2 text-destructive underline"
          title="Write off this invoice?"
          body={`${formatLeones(Math.max(balance, 0))} will no longer be counted as owed, and no more reminders are sent.`}
          confirmLabel="Write off"
        />
      )}
    </div>
  );
}
