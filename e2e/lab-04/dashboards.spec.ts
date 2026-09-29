import { expect, test } from '@playwright/test';

import { loginRequester, loginStaff } from './e2e-helpers';

test.describe('E2E-02 — Lab 4 dashboard drill-down (AC-20)', () => {
  test('requester card lands on filtered My Tickets', async ({ page }) => {
    await loginRequester(page);
    await page.getByRole('link', { name: /closed/i }).click();
    await expect(page).toHaveURL(/\/tickets\?status=CLOSED/, { timeout: 10000 });
  });

  test('staff card lands on filtered queue', async ({ page }) => {
    await loginStaff(page);
    await page.goto('/');
    await expect(page.getByText(/welcome back/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('link', { name: /^new /i }).click();
    await expect(page).toHaveURL(/\/staff\/queue\?status=NEW/, { timeout: 10000 });
    await expect(page.getByText(/TK-/).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
  });
});
