import type { Metadata } from 'next';
import { createCustomer } from '@/actions/customers';
import { CustomerForm } from '@/components/customer-form';
import { BackLink } from '@/components/display';

export const metadata: Metadata = { title: 'Add customer · Memba' };

export default function NewCustomerPage() {
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/customers" label="Customers" />
      <h1 className="text-xl font-semibold">Add a customer</h1>
      <CustomerForm action={createCustomer} submitLabel="Save customer" />
    </div>
  );
}
