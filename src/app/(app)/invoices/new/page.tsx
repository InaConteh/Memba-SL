import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { BackLink } from '@/components/display';
import { InvoiceForm } from '@/components/invoice-form';
import { IdSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'New invoice · Memba' };

export default async function NewInvoicePage({ searchParams }: PageProps<'/invoices/new'>) {
  const { customer: customerId } = await searchParams;
  // Invoices are created from a customer's page
  if (typeof customerId !== 'string' || !IdSchema.safeParse(customerId).success) redirect('/customers');

  const supabase = await createClient();
  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, name, archived_at')
    .eq('id', customerId)
    .maybeSingle();
  if (error) throw new Error('Could not load this customer.');
  if (!customer) notFound();
  if (customer.archived_at) redirect(`/customers/${customer.id}`);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/customers/${customer.id}`} label={customer.name} />
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold">New invoice</h1>
        <p className="text-sm text-muted-foreground">For {customer.name}. Memba adds a payment reference (M-…) when you save.</p>
      </div>
      <InvoiceForm customerId={customer.id} />
    </div>
  );
}
