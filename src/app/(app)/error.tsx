'use client';
import { Button } from '@/components/ui/button';

type Props = { error: Error & { digest?: string }; reset: () => void };

export default function AppError({ reset }: Props) {
  return (
    <div role="alert" className="flex flex-col gap-4 py-10 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        Check your connection and try again.
      </p>
      <Button onClick={reset} className="h-12 text-base">
        Try again
      </Button>
    </div>
  );
}
