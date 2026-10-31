import { expect, test } from '@playwright/test';

// Runs against memba-dev with its seeded, fictional Hilltop Academy login
const EMAIL = 'owner@hilltop.test';
const password = process.env.MEMBA_DEV_TEST_PASSWORD;

test('a signed-out visitor is sent to sign in', async ({ page }) => {
  await page.goto('/today');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Memba' })).toBeVisible();
});

test.describe('with the memba-dev test login', () => {
  test.skip(!password, 'Set MEMBA_DEV_TEST_PASSWORD in .env.local');

  test('a wrong password shows an error and keeps the email', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Scoped to the form: Next.js adds its own (empty) role="alert" route announcer
    await expect(page.locator('form').getByRole('alert')).toHaveText('Email or password is incorrect.');
    await expect(page.getByLabel('Email')).toHaveValue(EMAIL);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('an owner signs in, sees their business and the bottom nav, and signs out', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(password!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole('banner')).toHaveText('Hilltop Academy');
    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const tab of ['Today', 'Customers', 'Dashboard', 'Settings']) {
      await expect(nav.getByRole('link', { name: tab })).toBeVisible();
    }
    await expect(nav.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');

    // Signed in, /login goes straight to Today
    await page.goto('/login');
    await expect(page).toHaveURL(/\/today$/);

    await nav.getByRole('link', { name: 'Settings' }).click();
    await expect(nav.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/today');
    await expect(page).toHaveURL(/\/login$/);
  });
});
