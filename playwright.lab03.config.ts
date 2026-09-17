import { defineConfig, devices } from '@playwright/test';

/**
 * Lab 3 E2E (E2E-01..03 + VIS-01).
 * - workers: 1 — specs share seeded accounts on one database.
 * - globalSetup/Teardown pin E2E accounts (requester2/it2/it3/admin1/admin2)
 *   back to initial passwords + mustChange, before AND after the run.
 * Run: npm run e2e:lab3
 */
export default defineConfig({
  testDir: './e2e/lab-03',
  globalSetup: './e2e/lab-03/global.setup.ts',
  globalTeardown: './e2e/lab-03/global.setup.ts',
  timeout: 60 * 1000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: [
    {
      command: 'npm --workspace server run dev',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000
    },
    {
      command: 'npm --workspace client run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000
    }
  ]
});
