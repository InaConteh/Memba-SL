import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { adminClient, createTestBusiness } from './test-business';

export const TEST_BUSINESS_FILE = 'test-results/e2e-business.json';

/** Creates the throwaway business once per run; specs read it from the file. */
export default async function globalSetup() {
  if (!adminClient()) {
    console.warn('SUPABASE_SECRET_KEY not set: tests that need their own business will be skipped.');
    return;
  }
  const business = await createTestBusiness();
  mkdirSync(dirname(TEST_BUSINESS_FILE), { recursive: true });
  writeFileSync(TEST_BUSINESS_FILE, JSON.stringify(business));
}
