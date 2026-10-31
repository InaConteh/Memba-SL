import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Customers · Memba' };

export default function CustomersPage() {
  return <ComingSoon title="Customers">Your customers and what they owe will appear here.</ComingSoon>;
}
