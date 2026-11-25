'use client';
import { useActionState, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { recordPayment } from '@/actions/payments';
import { Field, FormMessages, SubmitButton, inputClass } from '@/components/form-bits';
import { SheetDialog } from '@/components/sheet-dialog';
import { todayIso } from '@/lib/dates';
import type { FormState } from '@/lib/form-state';
import { balanceAfter, formatAmountInput, formatLeones, halfOf } from '@/lib/money';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/lib/schemas';
import { cn } from '@/lib/utils';

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
  const full = formatAmountInput(invoice.balanceMinor);
  const [amount, setAmount] = useState(full);
  const v = state.values;
  const today = todayIso();

  useEffect(() => {
    if (state.done) onDone();
  }, [state, onDone]);

  const half = halfOf(invoice.balanceMinor);
  const quickAmounts = [
    { label: 'Full balance', value: full },
    ...(half > 0 ? [{ label: 'Half', value: formatAmountInput(half) }] : []),
  ];
  const isOther = !quickAmounts.some((a) => a.value === amount);
  const left = balanceAfter(invoice.balanceMinor, amount);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="invoice_id" value={invoice.id} />

      <div role="group" aria-label="Quick amounts" className="grid grid-cols-2 gap-2">
        {quickAmounts.map((a) => (
          <button
            key={a.label}
            type="button"
            aria-pressed={amount === a.value}
            onClick={() => setAmount(a.value)}
            className={cn(
              'flex min-h-14 flex-col items-start justify-center rounded-2xl border px-4 py-2 text-left',
              amount === a.value ? 'border-ink bg-ink text-white' : 'bg-card',
            )}
          >
            <span className="text-xs">{a.label}</span>
            <span className="text-base font-bold">NLe {a.value}</span>
          </button>
        ))}
      </div>

      <Field label="Amount received" htmlFor="pay-amount" hint={`Still owed: ${formatLeones(invoice.balanceMinor)}.`}>
        <div className={cn('flex h-13 items-center rounded-2xl border-2 bg-card', isOther ? 'border-primary' : 'border-input')}>
          <span className="pr-2 pl-4 text-base text-muted-foreground">NLe</span>
          <input
            id="pay-amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-lg font-bold outline-none"
          />
        </div>
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">How did they pay?</legend>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <label
              key={m}
              className="flex h-13 items-center gap-2 rounded-2xl border bg-card px-3 text-[15px] whitespace-nowrap has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:font-semibold"
            >
              <input type="radio" name="method" value={m} defaultChecked={(v?.method ?? 'orange_money') === m} className="accent-primary" />
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

      {left !== null && (
        <p className="flex items-center gap-2 rounded-2xl bg-forest-mist px-4 py-3 text-sm text-forest-deep">
          <Check aria-hidden className="size-4 shrink-0" />
          {left === 0 ? 'Nothing left to pay: reminders for this invoice stop.' : `${formatLeones(left)} will still be owed.`}
        </p>
      )}
      <SubmitButton pendingText="Saving…" className="order-last h-13 rounded-2xl font-semibold">
        Save payment{left !== null && ` of ${formatLeones(invoice.balanceMinor - left)}`}
      </SubmitButton>
      <FormMessages state={state} />
    </form>
  );
}
