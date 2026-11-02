'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { formValues, type FormState } from '@/lib/form-state';
import { formatLeones } from '@/lib/money';
import { IdSchema, InvoiceSchema, firstIssue } from '@/lib/schemas';
import { logEvent, requireMember } from '@/lib/server/member';

export async function createInvoice(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ['description', 'amount', 'due_date']);
  const parsed = InvoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error), values };

  const { member, error } = await requireMember();
  if (!member) return { error, values };
  const { customer_id, description, amount, due_date, confirm_large } = parsed.data;

  const [business, schedule, customer] = await Promise.all([
    member.supabase.from('businesses').select('large_amount_warning_minor').eq('id', member.businessId).single(),
    member.supabase.from('schedules').select('id').eq('is_default', true).limit(1).maybeSingle(),
    member.supabase.from('customers').select('id, archived_at').eq('id', customer_id).maybeSingle(),
  ]);
  if (!customer.data) return { error: 'This customer no longer exists.', values };
  if (customer.data.archived_at) return { error: 'This customer is archived. Unarchive them first.', values };
  // Without a schedule the reminder generator would silently skip the invoice
  if (!schedule.data) return { error: 'Your business has no reminder schedule yet. Please contact support.', values };

  const limit = business.data?.large_amount_warning_minor;
  if (limit && amount > limit && !confirm_large) {
    return {
      warning: `${formatLeones(amount)} is more than ${formatLeones(limit)}. Is this in new Leones? Old-Leone amounts are 1,000 times bigger.`,
      values,
    };
  }

  const { data, error: insertError } = await member.supabase
    .from('invoices')
    .insert({
      business_id: member.businessId,
      customer_id,
      schedule_id: schedule.data.id,
      description,
      amount_minor: amount,
      due_date,
      created_by: member.user.id,
    })
    .select('id, reference')
    .single();
  if (insertError || !data) return { error: 'Could not save the invoice. Try again.', values };

  await logEvent(member, 'invoice.created', data.id, { reference: data.reference, amount_minor: amount });
  revalidatePath(`/customers/${customer_id}`);
  revalidatePath('/customers');
  redirect(`/invoices/${data.id}`);
}

export async function writeOffInvoice(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = IdSchema.safeParse(formData.get('id'));
  if (!id.success) return { error: firstIssue(id.error) };

  const { member, error } = await requireMember();
  if (!member) return { error };

  // The trigger from 0003 cancels the invoice's open reminders
  const { data, error: updateError } = await member.supabase
    .from('invoices')
    .update({ status: 'written_off', updated_at: new Date().toISOString() })
    .eq('id', id.data)
    .eq('status', 'open')
    .select('id, customer_id, reference');
  if (updateError || !data?.length) return { error: 'This invoice can’t be written off. Refresh and try again.' };

  await logEvent(member, 'invoice.written_off', id.data, { reference: data[0].reference });
  revalidatePath(`/invoices/${id.data}`);
  revalidatePath(`/customers/${data[0].customer_id}`);
  revalidatePath('/customers');
  return { done: true };
}
