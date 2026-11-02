'use client';
import { useActionState, useEffect } from 'react';
import { Field, FormMessages, SubmitButton, inputClass } from '@/components/form-bits';
import { SheetDialog } from '@/components/sheet-dialog';
import type { FormState } from '@/lib/form-state';

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Hidden fields sent with the action, e.g. { id }. */
  fields: Record<string, string>;
  triggerLabel: string;
  triggerVariant?: 'outline' | 'ghost' | 'destructive';
  triggerClassName?: string;
  title: string;
  body: string;
  confirmLabel: string;
  /** Asks for a reason, sent as `reason`. */
  reasonLabel?: string;
};

/** Confirms an action that is hard to undo: void, write off, archive. */
export function ConfirmAction({ action, fields, triggerLabel, triggerVariant = 'outline', triggerClassName, title, body, confirmLabel, reasonLabel }: Props) {
  return (
    <SheetDialog triggerLabel={triggerLabel} triggerVariant={triggerVariant} triggerClassName={triggerClassName} title={title} subtitle={body}>
      {(close) => (
        <ConfirmForm action={action} fields={fields} confirmLabel={confirmLabel} reasonLabel={reasonLabel} onDone={close} />
      )}
    </SheetDialog>
  );
}

type FormProps = Pick<Props, 'action' | 'fields' | 'confirmLabel' | 'reasonLabel'> & { onDone: () => void };

function ConfirmForm({ action, fields, confirmLabel, reasonLabel, onDone }: FormProps) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  useEffect(() => {
    if (state.done) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {reasonLabel && (
        <Field label={reasonLabel} htmlFor="confirm-reason">
          <input id="confirm-reason" name="reason" required autoComplete="off" defaultValue={state.values?.reason} className={inputClass} />
        </Field>
      )}
      <FormMessages state={state} />
      <SubmitButton variant="destructive" pendingText="Working…">{confirmLabel}</SubmitButton>
    </form>
  );
}
