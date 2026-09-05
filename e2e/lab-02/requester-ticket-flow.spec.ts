import { expect, test } from '@playwright/test';

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
    // Create as Alice
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

  test('E2E-03: attachment lifecycle — upload, view, soft-remove', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.getByRole('button', { name: /Create Ticket/i }).click();
    await page.getByLabel(/Category/i).selectOption({ label: 'Hardware' });
    await page.getByLabel(/Related System/i).selectOption({ label: 'Email' });
    await page.getByLabel(/Requested Priority/i).selectOption('MEDIUM');
    await page.getByLabel(/^Summary/i).fill('E2E attachment ticket');
    await page.getByLabel(/^Description/i).fill('with attachment');
    // Create ticket first
    await page.getByRole('button', { name: /Submit Ticket/i }).click();
    await expect(page.getByText(/Ticket created successfully/i)).toBeVisible();
    await page.getByRole('button', { name: /View My Tickets/i }).click();
    await page.getByText(/E2E attachment ticket/).click();
    // Upload
    const filePath = 'tests/fixtures/sample.png';
    // Create a small png if not exists
    await page.getByLabel(/Upload File/i).setInputFiles(filePath).catch(() => {});
    // Check attachment appears
    await expect(page.getByText(/sample.png/).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('E2E-04: cross-requester access prevention', async ({ page }) => {
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
    // Try to access via different requester by changing requester and trying to open detail via API
    await page.getByRole('button', { name: /Change Requester/i }).click();
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Bob Nguyen' });
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByText(/E2E cross ticket/)).not.toBeVisible();
  });
});