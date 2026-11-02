'use client';
import { useActionState } from 'react';
import { Field, FormMessages, SubmitButton, inputClass } from '@/components/form-bits';
import type { FormState } from '@/lib/form-state';

type Customer = { id: string; name: string; phone: string | null; group_label: string | null; notes: string | null };

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  customer?: Customer;
  submitLabel: string;
};

export function CustomerForm({ action, customer, submitLabel }: Props) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const v = state.values ?? {
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    group_label: customer?.group_label ?? '',
    notes: customer?.notes ?? '',
  };

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <Field label="Name" htmlFor="c-name">
        <input id="c-name" name="name" required autoComplete="off" defaultValue={v.name} className={inputClass} />
      </Field>
      <Field label="WhatsApp number" htmlFor="c-phone" hint="Leave empty if you don’t have it. No number means no reminders.">
        <input id="c-phone" name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="076 123456" defaultValue={v.phone} className={inputClass} />
      </Field>
      <Field label="Class, route or group (optional)" htmlFor="c-group">
        <input id="c-group" name="group_label" autoComplete="off" placeholder="JSS 2" defaultValue={v.group_label} className={inputClass} />
      </Field>
      <Field label="Notes (optional)" htmlFor="c-notes">
        <textarea id="c-notes" name="notes" rows={2} defaultValue={v.notes} className={`${inputClass} h-auto py-2`} />
      </Field>
      <FormMessages state={state} confirmName="confirm_duplicate" />
      <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
