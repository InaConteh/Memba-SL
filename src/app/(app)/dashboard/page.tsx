import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Dashboard · Memba' };

export default function DashboardPage() {
  return <ComingSoon title="Dashboard">Money owed, overdue and collected will appear here.</ComingSoon>;
}
