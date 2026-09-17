import { expect, test } from '@playwright/test';

import { E2E, changePassword, login } from './e2e-accounts';

test.describe('E2E-03 — Lab 3 user administration flow', () => {
  test('admin create, duplicate, edit, reset, guards, and non-admin forbidden', async ({ page }) => {
    await login(page, E2E.admin.email, E2E.admin.initial);
    await expect(page).toHaveURL(/\/change-password/);
    await changePassword(page, E2E.admin.initial, E2E.admin.changed);
    await page.getByRole('link', { name: /^admin$/i }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByRole('row', { name: /admin one/i })).toBeVisible({ timeout: 10000 });

    // Create with a run-unique email (teardown resets passwords, not rows).
    const email = `e2etemp+${Date.now()}@toktickit.local`;
    await page.getByRole('button', { name: /create user/i }).click();
    await page.getByLabel(/full name/i).fill('E2E Temp');
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/user role/i).selectOption('REQUESTER');
    await page.getByLabel(/initial password/i).fill('Requester123!');
    await page.getByRole('button', { name: /save user/i }).click();
    await expect(page.getByText(/user created/i)).toBeVisible({ timeout: 10000 });

    // Duplicate email is rejected with a field-level error.
    await page.getByRole('button', { name: /create user/i }).click();
    await page.getByLabel(/full name/i).fill('E2E Clone');
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/user role/i).selectOption('REQUESTER');
    await page.getByLabel(/initial password/i).fill('Requester123!');
    await page.getByRole('button', { name: /save user/i }).click();
    await expect(page.getByLabel(/email address/i)).toHaveClass(/is-invalid/);
    await page.getByRole('button', { name: /cancel/i }).click();

    // Edit the name, then reset the initial password (must-change enforced).
    // Rows are scoped by this run's unique email (prior runs are cleaned in setup).
    await page.getByRole('row', { name: email }).getByRole('button', { name: /^edit /i }).click();
    await page.getByLabel(/full name/i).fill('E2E Temp Renamed');
    await page.getByRole('button', { name: /save user/i }).click();
    await expect(page.getByText(/user updated/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('row', { name: email }).getByRole('button', { name: /^edit /i }).click();
    await page.getByLabel(/set initial password/i).fill('BrandNew123!');
    await page.getByRole('button', { name: /reset/i }).click();
    await expect(page.getByText(/must change it at next login/i)).toBeVisible({ timeout: 10000 });

    // Deactivate the temp user again to leave the list tidy.
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /deactivate user/i }).click();
    await expect(page.getByText(/user deactivated/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /cancel/i }).click();

    // Self-deactivate is disabled with an explanatory tooltip.
    await page.getByRole('button', { name: /edit admin two/i }).click();
    const selfDeactivate = page.getByRole('button', { name: /deactivate user/i });
    await expect(selfDeactivate).toBeDisabled();
    await expect(selfDeactivate).toHaveAttribute('title', /own account/i);
    await page.getByRole('button', { name: /cancel/i }).click();

    // Demoting Admin One leaves the signed-in admin as the last active
    // administrator; demoting self after that is blocked (409, no change).
    await page.getByRole('button', { name: /edit admin one/i }).click();
    await page.getByLabel(/user role/i).selectOption('REQUESTER');
    await page.getByRole('button', { name: /save user/i }).click();
    await expect(page.getByText(/user updated/i)).toBeVisible({ timeout: 10000 });
    // NOTE: successful save closes the drawer, so there is no Cancel to press.

    await page.getByRole('button', { name: /edit admin two/i }).click();
    await page.getByLabel(/user role/i).selectOption('IT_STAFF');
    await page.getByRole('button', { name: /save user/i }).click();
    await expect(page.getByText(/at least one active administrator/i)).toBeVisible({ timeout: 10000 });
  });

  test('non-admin staff gets the forbidden card on the admin route', async ({ browser }) => {
    // Fresh context: proves the 403 with a clean staff session.
    const context = await browser.newContext();
    const staffPage = await context.newPage();
    await login(staffPage, E2E.staff.email, E2E.staff.changed);
    await staffPage.goto('/admin/users');
    await expect(staffPage.getByText(/you do not have access to user management/i)).toBeVisible({ timeout: 10000 });
    await context.close();
  });
});
