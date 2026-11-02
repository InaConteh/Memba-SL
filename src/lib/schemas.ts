import { z } from 'zod';
import { todayIso } from './dates';
import { parseLeones } from './money';
import { normalizeSLPhone } from './phone';

export const SignInSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address.')),
  password: z.string().min(1, 'Enter your password.'),
});
export type SignInInput = z.infer<typeof SignInSchema>;

// Any id Postgres accepts as a uuid; z.uuid() also checks the RFC version digit, which seed ids don't have
export const IdSchema = z.guid('Something went wrong. Refresh the page and try again.');

export const PAYMENT_METHODS = ['orange_money', 'afrimoney', 'cash', 'bank', 'other'] as const;
export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  orange_money: 'Orange Money',
  afrimoney: 'Afrimoney',
  cash: 'Cash',
  bank: 'Bank',
  other: 'Other',
};

/** Empty strings from a form become null. */
const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} is too long.`).optional().transform((v) => v || null);

/** A form checkbox or confirm button sends '1'. */
const confirmFlag = z.string().optional().transform((v) => v === '1');

const Amount = z.string().transform((raw, ctx) => {
  try {
    return parseLeones(raw);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Enter an amount like 1,500 or 25.50.' });
    return z.NEVER;
  }
});

export const CustomerSchema = z.object({
  name: z.string().trim().min(1, 'Enter the customer’s name.').max(120, 'Name is too long.'),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((raw, ctx) => {
      if (!raw) return null;
      const phone = normalizeSLPhone(raw);
      if (!phone) {
        ctx.addIssue({ code: 'custom', message: 'Enter a Sierra Leone mobile number, like 076 123456.' });
        return z.NEVER;
      }
      return phone;
    }),
  group_label: optionalText(60, 'Class or group'),
  notes: optionalText(500, 'Notes'),
  confirm_duplicate: confirmFlag,
});

export const InvoiceSchema = z.object({
  customer_id: IdSchema,
  description: z.string().trim().min(1, 'Say what the money is for.').max(200, 'Description is too long.'),
  amount: Amount,
  due_date: z.iso.date('Pick a due date.'),
  confirm_large: confirmFlag,
});

export const PaymentSchema = z.object({
  invoice_id: IdSchema,
  amount: Amount,
  method: z.enum(PAYMENT_METHODS, 'Choose how they paid.'),
  provider_reference: optionalText(80, 'Transaction ID'),
  paid_on: z.iso.date('Pick the date they paid.').refine((d) => d <= todayIso(), 'The payment date can’t be in the future.'),
});

export const VoidPaymentSchema = z.object({
  payment_id: IdSchema,
  reason: z.string().trim().min(3, 'Say why you are voiding this payment.').max(200, 'Reason is too long.'),
});

/** The first validation message, for showing above a form. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Check the form and try again.';
}
