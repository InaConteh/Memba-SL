'use server';
import { revalidatePath } from 'next/cache';
import { formValues, type FormState } from '@/lib/form-state';
import { formatLeones } from '@/lib/money';
import { PaymentSchema, VoidPaymentSchema, firstIssue } from '@/lib/schemas';
import { logEvent, requireMember, type Member } from '@/lib/server/member';

export async function recordPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ['amount', 'method', 'provider_reference', 'paid_on']);
  const parsed = PaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error), values };

  const { member, error } = await requireMember();
  if (!member) return { error, values };
  const { invoice_id, amount, method, provider_reference, paid_on } = parsed.data;

  const { data: invoice } = await member.supabase
    .from('invoice_balances')
    .select('status, balance_minor, reference, customer_id')
    .eq('id', invoice_id)
    .maybeSingle();
  if (!invoice) return { error: 'This invoice no longer exists.', values };
  if (invoice.status !== 'open' || !invoice.balance_minor || invoice.balance_minor <= 0) {
    return { error: 'This invoice has nothing left to pay.', values };
  }
  const balance = Number(invoice.balance_minor);
  if (amount > balance) return { error: overpaidMessage(balance), values };

  // The database also rejects an overpayment (0003), e.g. if two payments race
  const { data, error: insertError } = await member.supabase
    .from('payments')
    .insert({
      business_id: member.businessId,
      invoice_id,
      amount_minor: amount,
      method,
      reference: provider_reference,
      paid_on,
      recorded_by: member.user.id,
    })
    .select('id')
    .single();
  if (insertError?.code === '23514') return { error: await currentOverpaidMessage(invoice_id, member), values };
  if (insertError || !data) return { error: 'Could not save the payment. Try again.', values };

  await logEvent(member, 'payment.recorded', data.id, {
    invoice_id, invoice_reference: invoice.reference, amount_minor: amount, method,
  });
  revalidateInvoice(invoice_id, invoice.customer_id);
  return { done: true };
}

export async function voidPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = VoidPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error), values: formValues(formData, ['reason']) };

  const { member, error } = await requireMember();
  if (!member) return { error };
  const { payment_id, reason } = parsed.data;

  // Conditional update: a second tap can't void twice. Triggers reopen the invoice if needed.
  const { data, error: updateError } = await member.supabase
    .from('payments')
    .update({ voided_at: new Date().toISOString(), void_reason: reason })
    .eq('id', payment_id)
    .is('voided_at', null)
    .select('id, invoice_id, amount_minor');
  if (updateError || !data?.length) return { error: 'This payment can’t be voided. Refresh and try again.' };

  const { invoice_id, amount_minor } = data[0];
  await logEvent(member, 'payment.voided', payment_id, { invoice_id, amount_minor, reason });
  const { data: invoice } = await member.supabase.from('invoices').select('customer_id').eq('id', invoice_id).maybeSingle();
  revalidateInvoice(invoice_id, invoice?.customer_id ?? null);
  return { done: true };
}

function overpaidMessage(balance: number) {
  return `That’s more than the ${formatLeones(balance)} still owed.`;
}

async function currentOverpaidMessage(invoiceId: string, member: Member) {
  const { data } = await member.supabase.from('invoice_balances').select('balance_minor').eq('id', invoiceId).maybeSingle();
  return data?.balance_minor != null ? overpaidMessage(Number(data.balance_minor)) : 'That’s more than is still owed.';
}

function revalidateInvoice(invoiceId: string, customerId: string | null) {
  revalidatePath(`/invoices/${invoiceId}`);
  if (customerId) revalidatePath(`/customers/${customerId}`);
  revalidatePath('/customers');
  revalidatePath('/today');
}
