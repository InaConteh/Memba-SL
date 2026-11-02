import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { updateCustomer } from '@/actions/customers';
import { CustomerForm } from '@/components/customer-form';
import { BackLink } from '@/components/display';
import { IdSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Edit customer · Memba' };

export default async function EditCustomerPage({ params }: PageProps<'/customers/[id]/edit'>) {
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, name, phone, group_label, notes')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Could not load this customer.');
  if (!customer) notFound();

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={`/customers/${id}`} label={customer.name} />
      <h1 className="text-xl font-semibold">Edit customer</h1>
      <CustomerForm action={updateCustomer} customer={customer} submitLabel="Save changes" />
    </div>
  );
}
