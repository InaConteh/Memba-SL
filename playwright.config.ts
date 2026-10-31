import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Same variables the dev server reads (e.g. MEMBA_DEV_TEST_PASSWORD)
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // Pilot owners use small Android phones
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
