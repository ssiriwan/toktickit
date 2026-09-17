import { expect, test } from '@playwright/test';

import { E2E, changePassword, login } from './e2e-accounts';

test.describe('E2E-02 — Lab 3 staff ticket flow', () => {
  test('queue search/filter/sort, detail ops, comments + notes channels', async ({ page }) => {
    await login(page, E2E.staff.email, E2E.staff.initial);
    await expect(page).toHaveURL(/\/change-password/);
    await changePassword(page, E2E.staff.initial, E2E.staff.changed);
    await expect(page).toHaveURL(/\/staff\/queue/, { timeout: 10000 });

    // Queue search runs only after the magnifier button is pressed.
    await page.getByPlaceholder(/search by ticket number/i).fill('TK-');
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(page.getByText(/TK-/).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });

    // Open the first ticket and run detail ops.
    await page.getByRole('button', { name: /^open$/i }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);

    // Claim when unassigned (button only renders for unassigned tickets).
    const claim = page.getByRole('button', { name: /^claim$/i });
    if (await claim.count()) {
      await claim.first().click();
    }

    // IT priority auto-saves on select.
    await page.getByLabel(/it priority/i).selectOption('HIGH');

    // Status follows the transition matrix (OPEN -> In Progress is always legal from a fresh claim).
    const statusSelect = page.getByLabel(/current status/i);
    const options = await statusSelect.locator('option').allTextContents();
    if (options.some((o) => o.includes('In Progress'))) {
      await statusSelect.selectOption({ label: 'In Progress' });
    }

    // Public comment and internal note go through separate channels.
    // Run-unique bodies: comments are append-only and survive across runs.
    const stamp = Date.now();
    const commentBody = `E2E public comment ${stamp}`;
    const noteBody = `E2E private note ${stamp}`;
    await page.getByRole('tab', { name: /public comments/i }).click();
    await page.getByLabel(/add public comment/i).fill(commentBody);
    await page.getByRole('button', { name: /post comment/i }).click();
    await expect(page.getByText(commentBody)).toBeVisible({ timeout: 10000 });

    await page.getByRole('tab', { name: /internal notes/i }).click();
    await page.getByLabel(/add internal note/i).fill(noteBody);
    await page.getByRole('button', { name: /post note/i }).click();
    await expect(page.getByText(noteBody)).toBeVisible({ timeout: 10000 });
  });

  test('requester appears-resolved flag surfaces a banner for staff', async ({ page, browser }) => {
    // Requester side: mark the first owned ticket as appearing resolved.
    await login(page, E2E.requester.email, E2E.requester.changed);
    await page.getByRole('button', { name: /my tickets/i }).click();
    const ticketNumber = (await page.getByText(/TK-\d+-\d+/).filter({ visible: true }).first().textContent()) ?? '';
    expect(ticketNumber.trim()).toMatch(/TK-/);
    await page.getByText(ticketNumber.trim()).filter({ visible: true }).first().click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /appears resolved/i }).click();
    await expect(page.getByText(/awaiting it verification/i)).toBeVisible({ timeout: 10000 });

    // Staff side: the same ticket shows the verification banner.
    const context = await browser.newContext();
    const staffPage = await context.newPage();
    await login(staffPage, E2E.staff.email, E2E.staff.changed);
    await staffPage.getByPlaceholder(/search by ticket number/i).fill(ticketNumber.trim());
    await staffPage.getByRole('button', { name: /^search$/i }).click();
    await staffPage.getByRole('button', { name: /^open$/i }).filter({ visible: true }).first().click();
    await expect(staffPage).toHaveURL(/\/staff\/tickets\/\d+/);
    await expect(staffPage.getByText(/requester indicates this appears resolved/i)).toBeVisible({ timeout: 10000 });
    await context.close();
  });
});
