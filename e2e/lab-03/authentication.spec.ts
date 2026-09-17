import { expect, test } from '@playwright/test';

import { E2E, changePassword, login, logout } from './e2e-accounts';

test.describe('E2E-01 — Lab 3 authentication flow', () => {
  test('invalid login shows a safe error without enumeration', async ({ page }) => {
    await login(page, 'nobody@toktickit.local', 'Wrong123!');
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('inactive account gets a clear deactivated message', async ({ page }) => {
    await login(page, 'requester.inactive@toktickit.local', 'Requester123!');
    await expect(page.getByText(/deactivated/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('first login forces password change, then app, logout, and blocked re-entry', async ({ page }) => {
    await login(page, E2E.requester.email, E2E.requester.initial);
    await expect(page).toHaveURL(/\/change-password/);
    await expect(page.getByText(/must change your password/i)).toBeVisible();

    await changePassword(page, E2E.requester.initial, E2E.requester.changed);
    await expect(page.getByText(/toktickit/i).first()).toBeVisible({ timeout: 10000 });

    await logout(page);
    await expect(page).toHaveURL(/\/login/);

    // Direct access to a protected route bounces back to login.
    await page.goto('/tickets');
    await expect(page).toHaveURL(/\/login/);

    // The changed password works for the next login.
    await login(page, E2E.requester.email, E2E.requester.changed);
    await expect(page.getByRole('button', { name: /my tickets/i })).toBeVisible({ timeout: 10000 });
  });
});
