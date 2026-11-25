'use client';
import { useActionState, useState } from 'react';
import { createInvoice } from '@/actions/invoices';
import { Field, FormMessages, SubmitButton, inputClass } from '@/components/form-bits';
import { addDays, endOfMonth, todayIso } from '@/lib/dates';
import type { FormState } from '@/lib/form-state';
import { cn } from '@/lib/utils';

export function InvoiceForm({ customerId }: { customerId: string }) {
  const [state, action] = useActionState<FormState, FormData>(createInvoice, {});
  const today = todayIso();
  const [dueDate, setDueDate] = useState(today);
  const v = state.values;

  const shortcuts = [
    { label: 'Today', date: today },
    { label: '1 week', date: addDays(today, 7) },
    { label: '2 weeks', date: addDays(today, 14) },
    { label: 'Month end', date: endOfMonth(today) },
  ];

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="customer_id" value={customerId} />
      <Field label="Amount" htmlFor="i-amount" hint="In new Leones (NLe).">
        <div className="flex h-16 items-center rounded-2xl border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <span className="pr-2 pl-4 text-xl font-semibold text-muted-foreground">NLe</span>
          <input
            id="i-amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="1,500"
            defaultValue={v?.amount}
            className="h-full min-w-0 flex-1 bg-transparent font-heading text-3xl font-extrabold outline-none placeholder:text-muted-foreground/40"
          />
        </div>
      </Field>
      <Field label="What is it for?" htmlFor="i-desc">
        <input id="i-desc" name="description" required autoComplete="off" placeholder="Term 1 fees" defaultValue={v?.description} className={inputClass} />
      </Field>
      <div className="flex flex-col gap-2">
        <Field label="Due date" htmlFor="i-due">
          <input
            id="i-due"
            name="due_date"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div role="group" aria-label="Due date shortcuts" className="flex flex-wrap gap-2">
          {shortcuts.map((s) => (
            <button
              key={s.label}
              type="button"
              aria-pressed={dueDate === s.date}
              onClick={() => setDueDate(s.date)}
              className={cn(
                'h-11 rounded-full px-4 text-sm font-semibold',
                dueDate === s.date ? 'bg-ink text-white' : 'border bg-card',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Reminders follow your schedule, starting from this date.</p>
      </div>
      <SubmitButton pendingText="Saving…" className="order-last h-13 rounded-2xl font-semibold">Save invoice</SubmitButton>
      <FormMessages state={state} confirmName="confirm_large" confirmLabel="Yes, it’s in new Leones" />
    </form>
  );
}
