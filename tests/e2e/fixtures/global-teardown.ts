import { existsSync, readFileSync, rmSync } from 'node:fs';
import { TEST_BUSINESS_FILE } from './global-setup';
import { deleteTestBusiness, type TestBusiness } from './test-business';

export default async function globalTeardown() {
  if (!existsSync(TEST_BUSINESS_FILE)) return;
  const business = JSON.parse(readFileSync(TEST_BUSINESS_FILE, 'utf8')) as TestBusiness;
  await deleteTestBusiness(business);
  rmSync(TEST_BUSINESS_FILE);
}
