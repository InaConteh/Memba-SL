import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Today · Memba' };

export default function TodayPage() {
  return <ComingSoon title="Today">Your reminder queue will appear here.</ComingSoon>;
}
