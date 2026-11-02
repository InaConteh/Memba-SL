'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { FormState } from '@/lib/form-state';
import { formValues } from '@/lib/form-state';
import { CustomerSchema, IdSchema, firstIssue } from '@/lib/schemas';
import { logEvent, requireMember, type Member } from '@/lib/server/member';

const FIELDS = ['name', 'phone', 'group_label', 'notes'];

export async function createCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, FIELDS);
  const parsed = CustomerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error), values };

  const { member, error } = await requireMember();
  if (!member) return { error, values };

  const { confirm_duplicate, ...customer } = parsed.data;
  const duplicate = await findDuplicatePhone(member, customer.phone, null);
  if (duplicate && !confirm_duplicate) {
    return { warning: `${duplicate} already has this phone number. Save anyway?`, values };
  }

  const { data, error: insertError } = await member.supabase
    .from('customers')
    .insert({ ...customer, business_id: member.businessId })
    .select('id')
    .single();
  if (insertError || !data) return { error: 'Could not save the customer. Try again.', values };

  await logEvent(member, 'customer.created', data.id, { name: customer.name });
  revalidatePath('/customers');
  redirect(`/customers/${data.id}`);
}

export async function updateCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, FIELDS);
  const id = IdSchema.safeParse(formData.get('id'));
  const parsed = CustomerSchema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { error: firstIssue(id.error), values };
  if (!parsed.success) return { error: firstIssue(parsed.error), values };

  const { member, error } = await requireMember();
  if (!member) return { error, values };

  const { confirm_duplicate, ...customer } = parsed.data;
  const duplicate = await findDuplicatePhone(member, customer.phone, id.data);
  if (duplicate && !confirm_duplicate) {
    return { warning: `${duplicate} already has this phone number. Save anyway?`, values };
  }

  // RLS limits the update to the member's own business
  const { data, error: updateError } = await member.supabase
    .from('customers')
    .update(customer)
    .eq('id', id.data)
    .select('id');
  if (updateError || !data?.length) return { error: 'Could not save the changes. Refresh and try again.', values };

  await logEvent(member, 'customer.updated', id.data, { name: customer.name });
  revalidatePath('/customers');
  revalidatePath(`/customers/${id.data}`);
  redirect(`/customers/${id.data}`);
}

export async function archiveCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = IdSchema.safeParse(formData.get('id'));
  if (!id.success) return { error: firstIssue(id.error) };

  const { member, error } = await requireMember();
  if (!member) return { error };

  // Open invoices stay; the reminder generator skips archived customers
  const { data, error: updateError } = await member.supabase
    .from('customers')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id.data)
    .is('archived_at', null)
    .select('id');
  if (updateError || !data?.length) return { error: 'Could not archive this customer. Refresh and try again.' };

  await logEvent(member, 'customer.archived', id.data);
  revalidatePath('/customers');
  redirect('/customers');
}

/** Name of another active customer in the business with this phone, if any. */
async function findDuplicatePhone(member: Member, phone: string | null, exceptId: string | null) {
  if (!phone) return null;
  let query = member.supabase.from('customers').select('name').eq('phone', phone).is('archived_at', null);
  if (exceptId) query = query.neq('id', exceptId);
  const { data } = await query.limit(1).maybeSingle();
  return data?.name ?? null;
}
