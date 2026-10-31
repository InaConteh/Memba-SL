export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3 py-2">
      <span className="sr-only">Loading…</span>
      <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded bg-muted" />
    </div>
  );
}
