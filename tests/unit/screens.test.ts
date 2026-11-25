import { describe, expect, test } from 'vitest';
import { customerStatus, initials } from '@/lib/customer-status';
import { addDays, endOfMonth, monthName, startOfMonth } from '@/lib/dates';
import { balanceAfter, halfOf } from '@/lib/money';

const TODAY = '2026-11-25';
const base = { owed_minor: 50000, overdue_minor: 0, oldest_due_date: '2026-11-28', partPaid: false };

describe('customer status pill', () => {
  test('overdue wins over part paid and counts days from the oldest due date', () => {
    expect(customerStatus({ ...base, overdue_minor: 50000, oldest_due_date: '2026-11-16', partPaid: true }, TODAY))
      .toEqual({ label: 'Overdue 9d', tone: 'overdue' });
  });

  test('part paid when nothing is overdue yet', () => {
    expect(customerStatus({ ...base, partPaid: true }, TODAY)).toEqual({ label: 'Part paid', tone: 'good' });
  });

  test.each([['2026-11-25', 'Due today'], ['2026-12-02', 'Due soon'], ['2026-12-03', 'Due 3 Dec']])(
    'due %s shows as %s',
    (oldest_due_date, label) => {
      expect(customerStatus({ ...base, oldest_due_date }, TODAY)).toEqual({ label, tone: 'neutral' });
    },
  );

  test('nothing owed', () => {
    expect(customerStatus({ ...base, owed_minor: 0, oldest_due_date: null }, TODAY)).toEqual({ label: 'Nothing owed', tone: 'good' });
  });

  test('treats null totals as zero', () => {
    expect(customerStatus({ owed_minor: null, overdue_minor: null, oldest_due_date: null, partPaid: false }, TODAY).label).toBe('Nothing owed');
  });
});

describe('initials', () => {
  test.each([['Fatmata Kamara', 'FK'], ['Mariama Bah Shop', 'MS'], ['  abu ', 'A'], ['', '?'], ['Ériq Öz', 'ÉÖ']])('%j → %s', (name, text) => {
    expect(initials(name)).toBe(text);
  });
});

describe('payment helpers', () => {
  test('half stays in whole minor units and never exceeds the balance', () => {
    expect(halfOf(100000)).toBe(50000);
    expect(halfOf(2551)).toBe(1275);
    expect(halfOf(1)).toBe(0);
  });

  test('balance after a typed amount', () => {
    expect(balanceAfter(100000, '400')).toBe(60000);
    expect(balanceAfter(100000, '1,000')).toBe(0);
  });

  test('no preview for an invalid amount or an overpayment', () => {
    expect(balanceAfter(100000, '')).toBeNull();
    expect(balanceAfter(100000, 'abc')).toBeNull();
    expect(balanceAfter(100000, '2,000')).toBeNull();
  });
});

describe('date shortcuts', () => {
  test('adds days across month and year ends', () => {
    expect(addDays('2026-11-25', 7)).toBe('2026-12-02');
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08');
  });

  test('month start and end, including February in a leap year', () => {
    expect(monthName('2026-11-25')).toBe('Nov');
    expect(startOfMonth('2026-11-25')).toBe('2026-11-01');
    expect(endOfMonth('2026-11-25')).toBe('2026-11-30');
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
  });
});
