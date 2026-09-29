import { expect, test } from '@playwright/test';

import { loginRequester, loginStaff } from './e2e-helpers';

test.describe('E2E-01 — Lab 4 actions taken flow (AC-19)', () => {
  test('staff creates + completes an action; requester sees it read-only', async ({ page, browser }) => {
    const stamp = Date.now();
    const description = `E2E action ${stamp}`;

    // Staff side: add an action to requester2's OPEN ticket with zero actions.
    await loginStaff(page);
    await page.getByPlaceholder(/search by ticket number/i).fill('TK-20260910-0002');
    await page.getByRole('button', { name: /^search$/i }).click();
    await page.getByRole('button', { name: /^open$/i }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);

    await page.getByRole('button', { name: /add action taken/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/description/i).fill(description);
    await dialog.getByRole('button', { name: /^save action$/i }).click();
    await expect(page.getByText(description)).toBeVisible({ timeout: 10000 });

    // Complete it with a result through the Edit form (lifecycle: PENDING → IN_PROGRESS → COMPLETED).
    const card = page.locator('article', { hasText: description });
    await card.getByRole('button', { name: /^edit$/i }).click();
    await dialog.getByLabel('Status').selectOption('IN_PROGRESS');
    await dialog.getByRole('button', { name: /^save action$/i }).click();
    await expect(card.getByText('IN PROGRESS')).toBeVisible({ timeout: 10000 });

    await card.getByRole('button', { name: /^edit$/i }).click();
    await dialog.getByLabel('Status').selectOption('COMPLETED');
    await dialog.getByLabel(/^result/i).fill(`E2E result ${stamp}`);
    await dialog.getByRole('button', { name: /^save action$/i }).click();
    await expect(card.getByText('COMPLETED')).toBeVisible({ timeout: 10000 });

    // Requester side: the same action is visible, with no mutation controls.
    const context = await browser.newContext();
    const requesterPage = await context.newPage();
    await loginRequester(requesterPage);
    await requesterPage.getByRole('link', { name: /view my tickets/i }).click();
    await expect(requesterPage).toHaveURL(/\/tickets/);
    await requesterPage.getByText('TK-20260910-0002').filter({ visible: true }).first().click();
    await expect(requesterPage).toHaveURL(/\/tickets\/\d+/);
    await expect(requesterPage.getByText(description)).toBeVisible({ timeout: 10000 });
    await expect(requesterPage.getByRole('button', { name: /add action taken/i })).toHaveCount(0);
    await expect(requesterPage.getByRole('button', { name: /^edit$/i })).toHaveCount(0);
    await context.close();
  });
});
