'use client';
import { useActionState } from 'react';
import { createInvoice } from '@/actions/invoices';
import { Field, FormMessages, SubmitButton, inputClass } from '@/components/form-bits';
import { todayIso } from '@/lib/dates';
import type { FormState } from '@/lib/form-state';

export function InvoiceForm({ customerId }: { customerId: string }) {
  const [state, action] = useActionState<FormState, FormData>(createInvoice, {});
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="customer_id" value={customerId} />
      <Field label="What is it for?" htmlFor="i-desc">
        <input id="i-desc" name="description" required autoComplete="off" placeholder="Term 1 fees" defaultValue={v?.description} className={inputClass} />
      </Field>
      <Field label="Amount" htmlFor="i-amount" hint="In new Leones (NLe).">
        <div className="flex h-12 items-center rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <span className="pr-2 pl-3 text-base text-muted-foreground">NLe</span>
          <input id="i-amount" name="amount" inputMode="decimal" autoComplete="off" placeholder="1,500" defaultValue={v?.amount} className="h-full min-w-0 flex-1 bg-transparent text-base outline-none" />
        </div>
      </Field>
      <Field label="Due date" htmlFor="i-due" hint="Reminders start on this date, then after 3 and 7 days.">
        <input id="i-due" name="due_date" type="date" required defaultValue={v?.due_date ?? todayIso()} className={inputClass} />
      </Field>
      <FormMessages state={state} confirmName="confirm_large" confirmLabel="Yes, it’s in new Leones" />
      <SubmitButton pendingText="Saving…">Save invoice</SubmitButton>
    </form>
  );
}
