/**
 * Creates a pilot business and its owner login (blueprint section 7): the auth
 * user, the business, the owner membership, the default {0,3,7} schedule and
 * the three English templates. Prints the login to hand over in person.
 *
 * Uses the secret key, so it lives in scripts/ and never in src/.
 * Run with: npx tsx --env-file=.env.local scripts/create-business.ts --help
 */
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '../src/lib/database.types';
import { parseBusinessArgs, USAGE, type BusinessArgs } from './lib/business-args';
import { DEFAULT_TEMPLATES } from './lib/default-templates';

const Env = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url('NEXT_PUBLIC_SUPABASE_URL is missing or not a URL'),
  SUPABASE_SECRET_KEY: z.string().min(1, 'SUPABASE_SECRET_KEY is missing (add it to .env.local)'),
});

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.length === 0) {
    console.log(USAGE);
    return;
  }
  const args = parseBusinessArgs(argv);
  const env = Env.parse(process.env);
  const admin = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const password = randomBytes(12).toString('base64url');
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: args.email,
    password,
    email_confirm: true,
  });
  if (userError || !created.user) throw new Error(`Could not create the login: ${userError?.message}`);
  const userId = created.user.id;

  let businessId: string;
  try {
    businessId = await createBusinessRows(admin, args, userId);
  } catch (error) {
    // createBusinessRows removes its own rows; remove the login too so the script can simply be run again
    await admin.auth.admin.deleteUser(userId);
    throw error;
  }

  console.log(`
Created ${args.name} (${args.segment})
  Business id: ${businessId}
  Login:       ${args.email}
  Password:    ${password}

Hand these over in person. The owner should change the password after signing in.`);
}

async function createBusinessRows(
  admin: ReturnType<typeof createClient<Database>>,
  args: BusinessArgs,
  userId: string,
): Promise<string> {
  const { data: business, error } = await admin
    .from('businesses')
    .insert({ name: args.name, segment: args.segment, phone: args.phone, pay_instructions: args.payInstructions ?? null })
    .select('id')
    .single();
  if (error || !business) throw new Error(`Could not create the business: ${error?.message}`);
  const businessId = business.id;

  const steps = await Promise.all([
    admin.from('memberships').insert({ business_id: businessId, user_id: userId, role: 'owner' }),
    admin.from('schedules').insert({ business_id: businessId, name: 'Default', is_default: true }),
    admin.from('templates').insert(
      DEFAULT_TEMPLATES.map((t) => ({ business_id: businessId, language: 'en', tone: t.tone, body: t.body })),
    ),
  ]);
  const failed = steps.find((s) => s.error);
  if (failed?.error) {
    await admin.from('businesses').delete().eq('id', businessId);
    throw new Error(`Could not finish setting up the business: ${failed.error.message}`);
  }

  const { error: eventError } = await admin.from('events').insert({
    business_id: businessId,
    type: 'business.created',
    entity_id: businessId,
    data: { owner_email: args.email, segment: args.segment, by: 'scripts/create-business.ts' },
  });
  if (eventError) console.warn(`Business created, but the audit event was not recorded: ${eventError.message}`);
  return businessId;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
