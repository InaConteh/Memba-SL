'use client';
import { useActionState, useEffect } from 'react';
import { recordPayment } from '@/actions/payments';
import { Field, FormMessages, SubmitButton, inputClass } from '@/components/form-bits';
import { SheetDialog } from '@/components/sheet-dialog';
import { todayIso } from '@/lib/dates';
import type { FormState } from '@/lib/form-state';
import { formatAmountInput, formatLeones } from '@/lib/money';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/lib/schemas';

type Invoice = {
  id: string;
  balanceMinor: number;
  reference: string;
  description: string;
  customerName: string;
};

type Props = { invoice: Invoice; triggerLabel?: string; triggerVariant?: 'default' | 'outline'; triggerClassName?: string };

/** Change 2: amount prefilled with the balance, method, optional provider reference. */
export function RecordPaymentSheet({ invoice, triggerLabel = 'Record payment', triggerVariant = 'default', triggerClassName }: Props) {
  return (
    <SheetDialog
      triggerLabel={triggerLabel}
      triggerVariant={triggerVariant}
      triggerClassName={triggerClassName}
      title="Record payment"
      // Non-breaking hyphen: a reference must never wrap as "M-" / "4821"
      subtitle={`${invoice.customerName} · ${invoice.description} · ${invoice.reference.replace('-', '‑')}`}
    >
      {(close) => <PaymentForm invoice={invoice} onDone={close} />}
    </SheetDialog>
  );
}

function PaymentForm({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const [state, action] = useActionState<FormState, FormData>(recordPayment, {});
  const v = state.values;
  const today = todayIso();

  useEffect(() => {
    if (state.done) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="invoice_id" value={invoice.id} />
      <Field label="Amount received" htmlFor="pay-amount" hint={`Still owed: ${formatLeones(invoice.balanceMinor)}. Change it for a part payment.`}>
        <div className="flex h-12 items-center rounded-lg border-2 border-foreground">
          <span className="pr-2 pl-3 text-base text-muted-foreground">NLe</span>
          <input
            id="pay-amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={v?.amount ?? formatAmountInput(invoice.balanceMinor)}
            className="h-full min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none"
          />
        </div>
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Paid by</legend>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <label
              key={m}
              className="flex h-12 items-center gap-2 rounded-lg border border-input px-3 text-[15px] whitespace-nowrap has-[:checked]:border-2 has-[:checked]:border-foreground has-[:checked]:font-semibold"
            >
              <input type="radio" name="method" value={m} defaultChecked={(v?.method ?? 'orange_money') === m} className="accent-foreground" />
              {PAYMENT_METHOD_LABELS[m]}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Transaction ID (optional)" htmlFor="pay-ref" hint="From the Orange Money or Afrimoney SMS.">
        <input id="pay-ref" name="provider_reference" autoComplete="off" defaultValue={v?.provider_reference} className={inputClass} />
      </Field>

      <Field label="Paid on" htmlFor="pay-date">
        <input id="pay-date" name="paid_on" type="date" max={today} defaultValue={v?.paid_on ?? today} className={inputClass} />
      </Field>

      <FormMessages state={state} />
      <SubmitButton pendingText="Saving…">Save payment</SubmitButton>
    </form>
  );
}
