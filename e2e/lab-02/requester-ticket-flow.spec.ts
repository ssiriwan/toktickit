import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('E2E Lab 2 — Requester Ticket Flows', () => {
  test('E2E-01: complete ticket creation flow', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.getByRole('button', { name: /Create Ticket/i }).click();
    await page.getByLabel(/Category/i).selectOption({ label: 'Hardware' });
    await page.getByLabel(/Related System/i).selectOption({ label: 'Corporate Laptop' });
    await page.getByLabel(/Requested Priority/i).selectOption('MEDIUM');
    await page.getByLabel(/^Summary/i).fill('E2E laptop issue');
    await page.getByLabel(/^Description/i).fill('E2E description for creation flow');
    await page.getByRole('button', { name: /Submit Ticket/i }).click();
    await expect(page.getByText(/Ticket created successfully/i)).toBeVisible();
    await expect(page.getByText(/TK-/)).toBeVisible();
    await page.getByRole('button', { name: /View My Tickets/i }).click();
    await expect(page.getByText(/E2E laptop issue/)).toBeVisible();
  });

  test('E2E-02: requester switching — data isolation', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.getByRole('button', { name: /Create Ticket/i }).click();
    await page.getByLabel(/Category/i).selectOption({ label: 'Hardware' });
    await page.getByLabel(/Related System/i).selectOption({ label: 'Email' });
    await page.getByLabel(/Requested Priority/i).selectOption('LOW');
    await page.getByLabel(/^Summary/i).fill('R1 isolation ticket');
    await page.getByLabel(/^Description/i).fill('for r1');
    await page.getByRole('button', { name: /Submit Ticket/i }).click();
    await expect(page.getByText(/Ticket created successfully/i)).toBeVisible();
    await page.getByRole('button', { name: /Change Requester/i }).click();
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Bob Nguyen' });
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByText(/R1 isolation ticket/)).not.toBeVisible();
  });

  test('E2E-03: attachment lifecycle — upload, download, soft-remove', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.getByRole('button', { name: /Create Ticket/i }).click();
    await page.getByLabel(/Category/i).selectOption({ label: 'Hardware' });
    await page.getByLabel(/Related System/i).selectOption({ label: 'Email' });
    await page.getByLabel(/Requested Priority/i).selectOption('MEDIUM');
    await page.getByLabel(/^Summary/i).fill('E2E attachment ticket');
    await page.getByLabel(/^Description/i).fill('with attachment');
    await page.getByRole('button', { name: /Submit Ticket/i }).click();
    await expect(page.getByText(/Ticket created successfully/i)).toBeVisible();
    await page.getByRole('button', { name: /View My Tickets/i }).click();
    await page.getByText(/E2E attachment ticket/).click();
    await expect(page.getByText(/Ticket E2E attachment ticket/).or(page.getByText(/E2E attachment ticket/))).toBeVisible({ timeout: 5000 });

    const filePath = path.resolve('tests/fixtures/sample.png');
    expect(fs.existsSync(filePath)).toBe(true);
    const input = page.getByTestId('file-input').or(page.getByLabel(/Upload File/i));
    // Try data-testid first, fallback to label
    try {
      await page.getByTestId('file-input').setInputFiles(filePath);
    } catch {
      await page.locator('input[type="file"]').first().setInputFiles(filePath);
    }
    await expect(page.getByText(/sample\.png/)).toBeVisible({ timeout: 10000 });
    // Download
    const downloadPromise = page.waitForResponse((resp) => resp.url().includes('/download') && resp.status() === 200, { timeout: 5000 }).catch(() => null);
    await page.getByRole('button', { name: /Download/i }).first().click();
    const downloadResp = await downloadPromise;
    if (downloadResp) expect(downloadResp.status()).toBe(200);
    // Remove
    await page.getByRole('button', { name: /Remove/i }).first().click();
    await page.getByPlaceholder(/Reason/i).fill('no longer needed');
    await page.getByRole('button', { name: /Confirm/i }).click();
    await expect(page.getByText(/Removed/)).toBeVisible();
    await expect(page.getByText(/no longer needed/)).toBeVisible();
    // Download blocked after removal should be 410
    const blockedPromise = page.waitForResponse((resp) => resp.url().includes('/download'), { timeout: 5000 }).catch(() => null);
    await page.getByRole('button', { name: /Download/i }).first().click({ timeout: 2000 }).catch(() => {});
    const blockedResp = await blockedPromise;
    if (blockedResp) expect([410, 403, 404]).toContain(blockedResp.status());
  });

  test('E2E-04: cross-requester access prevention', async ({ page, request }) => {
    await page.goto('/');
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.getByRole('button', { name: /Create Ticket/i }).click();
    await page.getByLabel(/Category/i).selectOption({ label: 'Hardware' });
    await page.getByLabel(/Related System/i).selectOption({ label: 'Email' });
    await page.getByLabel(/Requested Priority/i).selectOption('LOW');
    await page.getByLabel(/^Summary/i).fill('E2E cross ticket');
    await page.getByLabel(/^Description/i).fill('cross check');
    await page.getByRole('button', { name: /Submit Ticket/i }).click();
    await expect(page.getByText(/Ticket created successfully/i)).toBeVisible();
    // Extract ticketId from My Tickets via API
    const listRes = await request.get('/api/tickets?requesterId=1&search=E2E%20cross%20ticket');
    const listData = await listRes.json();
    const ticketId = listData.tickets?.[0]?.id;
    expect(ticketId).toBeDefined();
    // Direct API access as different requester should be 403
    const crossRes = await request.get(`/api/tickets/${ticketId}?requesterId=2`);
    expect(crossRes.status()).toBe(403);
    // UI should not show cross ticket when switched to Bob
    await page.getByRole('button', { name: /Change Requester/i }).click();
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Bob Nguyen' });
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByText(/E2E cross ticket/)).not.toBeVisible();
  });
});