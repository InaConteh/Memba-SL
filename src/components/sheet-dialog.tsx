'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  triggerLabel: string;
  triggerVariant?: 'default' | 'outline' | 'ghost' | 'destructive';
  triggerClassName?: string;
  title: string;
  subtitle?: string;
  /** Rendered fresh on every open, so a form's state resets; call `close` when done. */
  children: (close: () => void) => ReactNode;
};

/**
 * A bottom sheet on the native <dialog>: focus is trapped, Esc and the phone's
 * Back gesture close it, and it needs no extra package.
 */
export function SheetDialog({ triggerLabel, triggerVariant = 'outline', triggerClassName, title, subtitle, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const titleId = `sheet-title-${openCount}`;

  // The dialog element follows React state; Esc/Back fire onClose, which updates the state
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const close = useCallback(() => setIsOpen(false), []);
  function open() {
    setOpenCount((n) => n + 1);
    setIsOpen(true);
  }

  return (
    <>
      <Button type="button" variant={triggerVariant} onClick={open} className={cn('h-12 text-base', triggerClassName)}>
        {triggerLabel}
      </Button>
      <dialog
        ref={ref}
        onClose={close}
        aria-labelledby={titleId}
        className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-md rounded-t-2xl bg-background p-0 text-foreground backdrop:bg-black/45"
      >
        <div className="flex flex-col gap-4 px-4 pt-3 pb-6">
          <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
          <div className="flex flex-col gap-0.5">
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {isOpen && <div key={openCount}>{children(close)}</div>}
          <Button type="button" variant="ghost" onClick={close} className="h-11 text-base">
            Cancel
          </Button>
        </div>
      </dialog>
    </>
  );
}
