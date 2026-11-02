import { describe, expect, test } from 'vitest';
import { daysBetween, dueLabel, formatShortDate, todayIso } from '@/lib/dates';
import { formatAmountInput } from '@/lib/money';
import { formatSLPhone } from '@/lib/phone';
import { CustomerSchema, InvoiceSchema, PaymentSchema, VoidPaymentSchema } from '@/lib/schemas';

const ID = '3f1c2a9e-8b7d-4c6e-9a5b-1d2e3f4a5b6c';

describe('dates', () => {
  test('today is the UTC date (Freetown is UTC+0)', () => {
    expect(todayIso(new Date('2026-11-02T23:59:00Z'))).toBe('2026-11-02');
  });

  test('short dates drop the year only within the same year', () => {
    expect(formatShortDate('2026-10-23', '2026-11-02')).toBe('23 Oct');
    expect(formatShortDate('2025-12-01', '2026-11-02')).toBe('1 Dec 2025');
  });

  test('days between and due labels', () => {
    expect(daysBetween('2026-10-23', '2026-10-31')).toBe(8);
    expect(dueLabel('2026-10-23', '2026-10-31')).toBe('8 days overdue');
    expect(dueLabel('2026-10-30', '2026-10-31')).toBe('1 day overdue');
    expect(dueLabel('2026-10-31', '2026-10-31')).toBe('Due today');
    expect(dueLabel('2026-11-03', '2026-10-31')).toBe('Due in 3 days');
  });
});

describe('phone display', () => {
  test('groups an E.164 number for reading', () => {
    expect(formatSLPhone('+23276123456')).toBe('+232 76 123 456');
    expect(formatSLPhone('+447911123456')).toBe('+447911123456');
  });
});

describe('amount input', () => {
  test.each([[100000, '1,000'], [2550, '25.50'], [150050, '1,500.50']])('%i minor units shows as %s', (minor, text) => {
    expect(formatAmountInput(minor)).toBe(text);
  });
});

describe('customer form', () => {
  test('normalises the phone and turns empty optional fields into null', () => {
    expect(CustomerSchema.parse({ name: ' Fatmata Kamara ', phone: '076 123456', group_label: '', notes: '' })).toEqual({
      name: 'Fatmata Kamara', phone: '+23276123456', group_label: null, notes: null, confirm_duplicate: false,
    });
  });

  test('allows no phone', () => {
    expect(CustomerSchema.parse({ name: 'Abu Turay', phone: '' }).phone).toBeNull();
  });

  test('rejects a phone that is not a Sierra Leone mobile', () => {
    const result = CustomerSchema.safeParse({ name: 'X', phone: '+44 7911 123456' });
    expect(result.error?.issues[0].message).toMatch(/Sierra Leone mobile number/);
  });

  test('requires a name and reads the duplicate confirmation', () => {
    expect(CustomerSchema.safeParse({ name: '  ' }).error?.issues[0].message).toBe('Enter the customer’s name.');
    expect(CustomerSchema.parse({ name: 'X', confirm_duplicate: '1' }).confirm_duplicate).toBe(true);
  });
});

describe('invoice form', () => {
  test('parses the amount into minor units', () => {
    expect(InvoiceSchema.parse({ customer_id: ID, description: 'Term 1 fees', amount: '1,500', due_date: '2026-11-02' }))
      .toMatchObject({ amount: 150000, confirm_large: false });
  });

  test.each(['', 'abc', '-5', '1.234'])('rejects amount %j with a readable message', (amount) => {
    const result = InvoiceSchema.safeParse({ customer_id: ID, description: 'X', amount, due_date: '2026-11-02' });
    expect(result.error?.issues.map((i) => i.message)).toContain('Enter an amount like 1,500 or 25.50.');
  });

  test('rejects a malformed customer id', () => {
    expect(InvoiceSchema.safeParse({ customer_id: 'nope', description: 'X', amount: '1', due_date: '2026-11-02' }).success).toBe(false);
  });

  test('accepts any id Postgres accepts, including seed ids without an RFC version digit', () => {
    const seedId = '40000000-0000-0000-0000-000000000001';
    expect(InvoiceSchema.safeParse({ customer_id: seedId, description: 'X', amount: '1', due_date: '2026-11-02' }).success).toBe(true);
  });
});

describe('payment form', () => {
  const base = { invoice_id: ID, amount: '500', method: 'orange_money', provider_reference: '', paid_on: '2026-10-29' };

  test('accepts a payment with an empty provider reference', () => {
    expect(PaymentSchema.parse(base)).toEqual({ ...base, amount: 50000, provider_reference: null });
  });

  test('rejects an unknown method and a future date', () => {
    expect(PaymentSchema.safeParse({ ...base, method: 'bitcoin' }).error?.issues[0].message).toBe('Choose how they paid.');
    expect(PaymentSchema.safeParse({ ...base, paid_on: '2999-01-01' }).error?.issues[0].message)
      .toBe('The payment date can’t be in the future.');
  });

  test('voiding needs a reason', () => {
    expect(VoidPaymentSchema.safeParse({ payment_id: ID, reason: ' ' }).error?.issues[0].message)
      .toBe('Say why you are voiding this payment.');
  });
});
