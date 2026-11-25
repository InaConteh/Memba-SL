'use client';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import type { FormState } from '@/lib/form-state';
import { cn } from '@/lib/utils';

type SubmitProps = {
  children: ReactNode;
  pendingText: string;
  variant?: 'default' | 'outline' | 'destructive';
  className?: string;
  name?: string;
  value?: string;
};

/** Disables itself and shows `pendingText` while its form is saving. */
export function SubmitButton({ children, pendingText, variant = 'default', className, name, value }: SubmitProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} name={name} value={value} className={cn('h-12 text-base', className)}>
      {pending ? pendingText : children}
    </Button>
  );
}

type MessagesProps = { state: FormState; confirmName?: string; confirmLabel?: string };

/**
 * The action's error, or its warning with a button that resubmits with confirmation.
 * Render it after the form's own SubmitButton (which gets `order-last`): Enter presses
 * the first submit button in the markup, and that must never be "Save anyway".
 */
export function FormMessages({ state, confirmName, confirmLabel = 'Save anyway' }: MessagesProps) {
  const ref = useRef<HTMLElement>(null);
  // On a small phone the message can appear below the fold, under the bottom nav
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center' });
  }, [state]);

  if (state.error) {
    return (
      <p ref={ref as RefObject<HTMLParagraphElement>} role="alert" className="scroll-mb-24 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state.warning) {
    return (
      <div
        ref={ref as RefObject<HTMLDivElement>}
        role="alert"
        className="flex scroll-mb-24 flex-col gap-3 rounded-lg bg-nudge-mist px-3 py-3 text-sm text-nudge-deep"
      >
        <p>{state.warning}</p>
        {confirmName && (
          <SubmitButton name={confirmName} value="1" variant="outline" pendingText="Saving…" className="h-11 bg-card">
            {confirmLabel}
          </SubmitButton>
        )}
      </div>
    );
  }
  return null;
}

type FieldProps = { label: string; htmlFor: string; hint?: string; children: ReactNode };

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const inputClass =
  'h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';
