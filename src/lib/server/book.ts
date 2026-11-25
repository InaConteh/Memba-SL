import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { startOfMonth } from '@/lib/dates';

// The API returns at most this many rows per request (supabase/config.toml max_rows)
const PAGE = 1000;

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/** Reads every page, so a total is never quietly cut off at the API's row limit. */
async function fetchAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error || !data) throw new Error('Could not load your totals.');
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

/** What the whole business is owed, whatever the list below it is filtered to. */
export async function bookTotals(supabase: SupabaseClient<Database>, today: string) {
  const [owing, collected, partPaid] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from('customer_balances')
        .select('id, owed_minor, overdue_minor')
        .is('archived_at', null)
        .gt('owed_minor', 0)
        .order('id')
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from('payments')
        .select('id, amount_minor')
        .is('voided_at', null)
        .gte('paid_on', startOfMonth(today))
        .order('id')
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from('invoice_balances')
        .select('id, customer_id')
        .eq('status', 'open')
        .gt('paid_minor', 0)
        .order('id')
        .range(from, to),
    ),
  ]);

  const overdue = owing.filter((c) => Number(c.overdue_minor) > 0);
  return {
    owedMinor: owing.reduce((sum, c) => sum + Number(c.owed_minor), 0),
    owingCount: owing.length,
    overdueMinor: overdue.reduce((sum, c) => sum + Number(c.overdue_minor), 0),
    overdueCount: overdue.length,
    collectedMinor: collected.reduce((sum, p) => sum + p.amount_minor, 0),
    partPaidCustomerIds: new Set(partPaid.map((i) => i.customer_id)),
  };
}
