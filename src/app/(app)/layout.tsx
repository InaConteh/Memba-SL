import type { ReactNode } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  // RLS returns only the signed-in user's business
  const { data: business, error } = await supabase
    .from('businesses')
    .select('name')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error('Could not load your business.');

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="border-b px-4 py-3">
        <p className="truncate text-base font-semibold">{business?.name ?? 'Memba'}</p>
      </header>
      <main className="flex-1 px-4 pt-4 pb-24">
        {business ? children : <NoBusiness />}
      </main>
      <BottomNav />
    </div>
  );
}

function NoBusiness() {
  return (
    <div className="flex flex-col gap-2 py-10 text-center">
      <h1 className="text-lg font-semibold">Your account isn&apos;t linked to a business yet</h1>
      <p className="text-sm text-muted-foreground">Please contact Memba support to finish setting up.</p>
    </div>
  );
}
