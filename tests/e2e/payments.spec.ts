import { existsSync, readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { TEST_BUSINESS_FILE } from './fixtures/global-setup';
import { adminClient, type TestBusiness } from './fixtures/test-business';

// Blueprint Nov 2-3: create invoice → part payment → full payment, in a throwaway business
const business: TestBusiness | null = existsSync(TEST_BUSINESS_FILE)
  ? JSON.parse(readFileSync(TEST_BUSINESS_FILE, 'utf8'))
  : null;

test.skip(!business, 'Set SUPABASE_SECRET_KEY in .env.local to run this flow in its own test business');
test.describe.configure({ mode: 'serial' });

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(business!.email);
  await page.getByLabel('Password').fill(business!.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Sign-in makes two round trips to Supabase Auth plus the audit insert
  await expect(page).toHaveURL(/\/today$/, { timeout: 30_000 });
}

const balance = (page: Page) => page.locator('dt', { hasText: 'Balance' }).locator('+ dd');

test('customer → invoice → part payment → full payment → void', async ({ page }) => {
  await signIn(page);

  // Add a customer (fictional, unallocated +232 00 number)
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Customers' }).click();
  await expect(page.getByText('Add your first customer')).toBeVisible();
  await page.getByRole('link', { name: 'Add', exact: true }).click();
  await page.getByLabel('Name').fill('Kadiatu Testcase');
  await page.getByLabel('WhatsApp number').fill('000 000 999');
  await page.getByLabel('Class, route or group (optional)').fill('JSS 3');
  await page.getByRole('button', { name: 'Save customer' }).click();
  await expect(page.getByRole('heading', { name: 'Kadiatu Testcase' })).toBeVisible();
  await expect(page.getByText('+232 00 000 999 · JSS 3')).toBeVisible();

  // Create an invoice; the database issues the reference
  await page.getByRole('link', { name: 'New invoice' }).click();
  await page.getByLabel('What is it for?').fill('Term 1 fees');
  await page.getByLabel('Amount').fill('1,500');
  await page.getByRole('button', { name: 'Save invoice' }).click();
  await expect(page.getByRole('heading', { name: 'Term 1 fees' })).toBeVisible();
  const reference = (await page.getByText(/^M-\d{4}$/).textContent())!.trim();
  await expect(balance(page)).toHaveText('NLe 1,500');

  // Part payment: change the prefilled balance to 500, pay in cash
  await page.getByRole('button', { name: 'Record payment' }).click();
  const sheet = page.getByRole('dialog', { name: 'Record payment' });
  await expect(sheet.getByLabel('Amount received')).toHaveValue('1,500');
  await sheet.getByLabel('Amount received').fill('500');
  await sheet.getByLabel('Cash').check();
  await sheet.getByRole('button', { name: 'Save payment' }).click();
  await expect(sheet).toBeHidden();
  await expect(balance(page)).toHaveText('NLe 1,000');

  // More than the balance is refused in Leones, not minor units
  await page.getByRole('button', { name: 'Record payment' }).click();
  await sheet.getByLabel('Amount received').fill('2,000');
  await sheet.getByRole('button', { name: 'Save payment' }).click();
  await expect(sheet.getByRole('alert')).toHaveText('That’s more than the NLe 1,000 still owed.');

  // Full payment: the prefilled balance, Orange Money with a transaction ID
  await sheet.getByLabel('Amount received').fill('1,000');
  await sheet.getByLabel('Transaction ID (optional)').fill('TEST-OM-E2E');
  await sheet.getByRole('button', { name: 'Save payment' }).click();
  await expect(sheet).toBeHidden();
  await expect(balance(page)).toHaveText('NLe 0');
  // The status line ("Due 2 Nov · Paid"), not the "Paid" amount label
  await expect(page.getByText(/^Due .+ · Paid$/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Record payment' })).toHaveCount(0);

  // Voiding the 500 reopens the invoice
  await page.getByRole('listitem').filter({ hasText: 'NLe 500 · Cash' }).getByRole('button', { name: 'Void' }).click();
  const confirm = page.getByRole('dialog', { name: /Void this NLe 500 payment/ });
  await confirm.getByLabel('Why are you voiding it?').fill('Entered by mistake');
  await confirm.getByRole('button', { name: 'Void payment' }).click();
  await expect(confirm).toBeHidden();
  await expect(balance(page)).toHaveText('NLe 500');
  await expect(page.getByText(/voided: Entered by mistake/)).toBeVisible();

  // Change 1: searching customers by the reference finds the invoice
  await page.goto(`/customers?q=${reference}`);
  await expect(page.getByRole('link', { name: new RegExp(`Term 1 fees.*${reference}`) })).toBeVisible();
  await expect(page.getByRole('link', { name: /Kadiatu Testcase/ })).toBeVisible();

  // Every action left an audit event
  const { data: events } = await adminClient()!.from('events').select('type').eq('business_id', business!.businessId);
  const types = (events ?? []).map((e) => e.type).sort();
  expect(types).toEqual(
    expect.arrayContaining(['auth.signed_in', 'customer.created', 'invoice.created', 'payment.recorded', 'payment.recorded', 'payment.voided']),
  );
  expect(types.filter((t) => t === 'payment.recorded')).toHaveLength(2);
});
