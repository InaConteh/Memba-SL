'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, LayoutDashboard, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/today', label: 'Today', Icon: CalendarCheck },
  { href: '/customers', label: 'Customers', Icon: Users },
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', Icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-xs',
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
