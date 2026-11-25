import Image from 'next/image';
import { cn } from '@/lib/utils';

// Geometry matches public/brand/memba-mark-*.svg (48-unit grid). Kept inline so it
// inherits no extra request and can be sized with classes.
const BUBBLE = 'M10 4h28a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H18l-8 7v-7a6 6 0 0 1-6-6V10a6 6 0 0 1 6-6z';
const LETTER = 'M16.5 26v-8a3.75 3.75 0 0 1 7.5 0v8M24 18a3.75 3.75 0 0 1 7.5 0v8';

/** The Memba mark. Decorative: pair it with visible text that names the business or app. */
export function MembaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={cn('size-6 shrink-0', className)}>
      <defs>
        <mask id="memba-mark-cut" maskUnits="userSpaceOnUse" x="-4" y="-4" width="56" height="56">
          <rect x="-4" y="-4" width="56" height="56" fill="#fff" />
          <circle cx="40" cy="8" r="9" fill="#000" />
        </mask>
      </defs>
      <path d={BUBBLE} fill="var(--color-forest)" mask="url(#memba-mark-cut)" />
      <path d={LETTER} fill="none" stroke="var(--color-paper)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40" cy="8" r="5.5" fill="var(--color-nudge)" />
    </svg>
  );
}

/** Full horizontal logo (mark + outlined wordmark). Its alt text is "Memba". */
export function MembaLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/memba-logo-horizontal-primary.svg"
      alt="Memba"
      width={172}
      height={56}
      priority={priority}
      className={cn('h-10 w-auto', className)}
    />
  );
}
