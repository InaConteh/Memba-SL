/**
 * A throwaway fictional business for end-to-end tests on memba-dev, made and
 * removed with the secret key so the seed data stays untouched. Test-only:
 * removing it deletes its payments, which the app itself never does.
 */
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/lib/database.types';
import { DEFAULT_TEMPLATES } from '../../../scripts/lib/default-templates';

export type TestBusiness = { businessId: string; userId: string; email: string; password: string };

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function createTestBusiness(): Promise<TestBusiness> {
  const admin = adminClient();
  if (!admin) throw new Error('SUPABASE_SECRET_KEY is not set');
  const stamp = Date.now().toString(36);
  const email = `e2e-${stamp}@example.test`;
  const password = randomBytes(12).toString('base64url');

  const { data: created, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userError || !created.user) throw new Error(`createUser: ${userError?.message}`);
  const userId = created.user.id;

  const { data: business, error } = await admin
    .from('businesses')
    .insert({ name: `E2E Test School ${stamp}`, segment: 'school', pay_instructions: 'Pay by Orange Money to merchant code 000000.' })
    .select('id')
    .single();
  if (error || !business) throw new Error(`business: ${error?.message}`);

  const steps = await Promise.all([
    admin.from('memberships').insert({ business_id: business.id, user_id: userId }),
    admin.from('schedules').insert({ business_id: business.id, name: 'Default', is_default: true }),
    admin.from('templates').insert(DEFAULT_TEMPLATES.map((t) => ({ business_id: business.id, language: 'en', tone: t.tone, body: t.body }))),
  ]);
  const failed = steps.find((s) => s.error);
  if (failed?.error) throw new Error(`setup: ${failed.error.message}`);

  return { businessId: business.id, userId, email, password };
}

/** Deletes in foreign-key order; every step is scoped to the test business. */
export async function deleteTestBusiness({ businessId, userId }: Pick<TestBusiness, 'businessId' | 'userId'>) {
  const admin = adminClient();
  if (!admin) return;
  for (const table of ['payments', 'reminders', 'invoices', 'customers', 'events', 'templates', 'schedules', 'memberships'] as const) {
    const { error } = await admin.from(table).delete().eq('business_id', businessId);
    if (error) throw new Error(`cleanup ${table}: ${error.message}`);
  }
  await admin.from('businesses').delete().eq('id', businessId);
  await admin.auth.admin.deleteUser(userId);
}
