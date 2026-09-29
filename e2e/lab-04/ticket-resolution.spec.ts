import { expect, test } from '@playwright/test';

import { loginStaff } from './e2e-helpers';

test.describe('E2E-03 — Lab 4 ticket resolution flow (AC-06, AC-07, AC-19)', () => {
  test('gate blocks RESOLVED, then complete → resolve → close succeeds', async ({ page }) => {
    const stamp = Date.now();
    await loginStaff(page);

    // TK-20260910-0008 is reset to OPEN with zero actions by global setup.
    await page.getByPlaceholder(/search by ticket number/i).fill('TK-20260910-0008');
    await page.getByRole('button', { name: /^search$/i }).click();
    await page.getByRole('button', { name: /^open$/i }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);

    // OPEN → IN_PROGRESS first (OPEN → RESOLVED is off-matrix).
    await page.getByLabel(/current status/i).selectOption('IN_PROGRESS');

    // Add a working action, then attempt RESOLVED: the gate must block.
    await page.getByRole('button', { name: /add action taken/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/description/i).fill(`E2E resolution action ${stamp}`);
    await dialog.getByRole('button', { name: /^save action$/i }).click();
    await expect(page.getByText(`E2E resolution action ${stamp}`)).toBeVisible({ timeout: 10000 });

    await page.getByLabel(/current status/i).selectOption('RESOLVED');
    await expect(page.getByText(/resolution gate/i)).toBeVisible({ timeout: 10000 });

    // Complete the action (lifecycle: PENDING → IN_PROGRESS → COMPLETED), then RESOLVED succeeds.
    const card = page.locator('article', { hasText: `E2E resolution action ${stamp}` });
    await card.getByRole('button', { name: /^edit$/i }).click();
    await dialog.getByLabel('Status').selectOption('IN_PROGRESS');
    await dialog.getByRole('button', { name: /^save action$/i }).click();
    await expect(card.getByText('IN PROGRESS')).toBeVisible({ timeout: 10000 });

    await card.getByRole('button', { name: /^edit$/i }).click();
    await dialog.getByLabel('Status').selectOption('COMPLETED');
    await dialog.getByLabel(/^result/i).fill(`E2E resolution result ${stamp}`);
    await dialog.getByRole('button', { name: /^save action$/i }).click();
    await expect(card.getByText('COMPLETED')).toBeVisible({ timeout: 10000 });

    await page.getByLabel(/current status/i).selectOption('RESOLVED');
    await expect(page.getByLabel(/current status/i)).toHaveValue('RESOLVED', { timeout: 10000 });

    // Full flow ends at CLOSED.
    await page.getByLabel(/current status/i).selectOption('CLOSED');
    await expect(page.getByLabel(/current status/i)).toHaveValue('CLOSED', { timeout: 10000 });
  });
});
