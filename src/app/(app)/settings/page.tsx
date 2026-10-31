import type { Metadata } from 'next';
import { signOut } from '@/actions/auth';
import { ComingSoon } from '@/components/coming-soon';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Settings · Memba' };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <ComingSoon title="Settings">Business details, payment instructions and message templates will appear here.</ComingSoon>
      <form action={signOut}>
        <Button type="submit" variant="outline" className="h-12 w-full text-base">
          Sign out
        </Button>
      </form>
    </div>
  );
}
