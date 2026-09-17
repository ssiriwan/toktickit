import { expect, test, type Page } from '@playwright/test';

import { E2E, changePassword, login } from './e2e-accounts';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 }
] as const;

/**
 * VIS-01 — one screenshot per screen group × viewport (12 files).
 * Self-contained: uses admin1/it3 (never touched by the E2E flow specs);
 * global setup/teardown pin those accounts back to initial state.
 * Logins tolerate an already-changed password (per-test contexts share one DB).
 */
async function loginWithKnownState(
  page: Page,
  email: string,
  initial: string,
  changed: string,
  home: RegExp
) {
  await login(page, email, initial);
  await page.waitForURL(/\/change-password/, { timeout: 8000 }).catch(() => null);
  if (!/\/change-password/.test(page.url())) {
    await login(page, email, changed);
    await expect(page).toHaveURL(home, { timeout: 15000 });
    return;
  }
  await changePassword(page, initial, changed);
  await expect(page).toHaveURL(home, { timeout: 15000 });
}

async function loginAsStaff(page: Page) {
  await loginWithKnownState(page, E2E.staffShots.email, E2E.staffShots.initial, E2E.staffShots.changed, /\/staff\/queue/);
}

async function loginAsAdmin(page: Page) {
  await loginWithKnownState(page, E2E.adminShots.email, E2E.adminShots.initial, E2E.adminShots.changed, /\/staff\/queue|\/change-password/);
  if (!/\/admin\/users/.test(page.url())) {
    await page.getByRole('link', { name: /^admin$/i }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
  }
}

test.describe('VIS-01 — Lab 3 responsive screenshots', () => {
  test('authentication screens', async ({ page }) => {
    let changedShown = false;
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.context().clearCookies();
      await page.goto('/login');
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
      await page.screenshot({ path: `artifacts/lab-03/screenshots/authentication/login-${viewport.name}.png` });

      if (!changedShown) {
        await login(page, E2E.adminShots.email, E2E.adminShots.initial);
        await expect(page).toHaveURL(/\/change-password/);
        await page.screenshot({ path: `artifacts/lab-03/screenshots/authentication/change-password-${viewport.name}.png` });
        changedShown = true;
      }
    }
  });

  test('staff queue', async ({ page }) => {
    await loginAsStaff(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/staff/queue');
      await expect(page.getByText(/TK-/).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
      await page.screenshot({ path: `artifacts/lab-03/screenshots/staff-queue/queue-${viewport.name}.png` });
    }
  });

  test('staff ticket detail', async ({ page }) => {
    await loginAsStaff(page);
    await page.getByRole('button', { name: /^open$/i }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
    // URL changes before the ticket payload arrives — wait for loaded content.
    await expect(page.getByRole('tab', { name: /public comments/i })).toBeVisible({ timeout: 15000 });
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.screenshot({ path: `artifacts/lab-03/screenshots/staff-ticket-detail/detail-${viewport.name}.png` });
    }
  });

  test('user management', async ({ page }) => {
    await loginAsAdmin(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expect(page.getByRole('row', { name: /admin one/i })).toBeVisible({ timeout: 15000 });
      await page.screenshot({ path: `artifacts/lab-03/screenshots/user-management/users-${viewport.name}.png` });
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole('button', { name: /create user/i }).click();
    await page.screenshot({ path: `artifacts/lab-03/screenshots/user-management/create-drawer-desktop.png` });
  });
});
