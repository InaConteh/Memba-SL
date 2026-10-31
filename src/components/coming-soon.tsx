import type { ReactNode } from 'react';

type Props = { title: string; children: ReactNode };

/** Placeholder until the screen's own block is built. */
export function ComingSoon({ title, children }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
