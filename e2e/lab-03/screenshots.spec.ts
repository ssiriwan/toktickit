import { expect, test, type Page } from '@playwright/test';

import { E2E, changePassword, login } from './e2e-accounts';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 }
] as const;

/**
 * VIS-01 — responsive screenshots and functional demonstration artifacts.
 * Self-contained: uses admin1/it3 (never touched by E2E flow specs);
 * global setup/teardown pin those accounts back to initial state.
 * Logins tolerate an already-changed password.
 */
async function loginWithKnownState(
  page: Page,
  email: string,
  initial: string,
  changed: string,
  home: RegExp
) {
  if (home.test(page.url())) return;
  await login(page, email, initial);
  await page.waitForURL(/\/change-password|.*staff.*|.*admin.*|.*tickets.*/, { timeout: 8000 }).catch(() => null);
  if (home.test(page.url())) return;
  if (/\/change-password/.test(page.url())) {
    await changePassword(page, initial, changed);
    await expect(page).toHaveURL(home, { timeout: 15000 });
    return;
  }
  await login(page, email, changed);
  await page.waitForURL(/\/change-password|.*staff.*|.*admin.*|.*tickets.*/, { timeout: 8000 }).catch(() => null);
  if (/\/change-password/.test(page.url())) {
    await changePassword(page, initial, changed);
  }
  await expect(page).toHaveURL(home, { timeout: 15000 });
}

async function loginAsStaff(page: Page) {
  await loginWithKnownState(page, E2E.staffShots.email, E2E.staffShots.initial, E2E.staffShots.changed, /\/staff\/queue/);
}

async function loginAsAdmin(page: Page) {
  await loginWithKnownState(page, E2E.adminShots.email, E2E.adminShots.initial, E2E.adminShots.changed, /\/staff\/queue|\/admin\/users/);
  if (!/\/admin\/users/.test(page.url())) {
    await page.getByRole('link', { name: /^admin$/i }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
  }
}

test.describe('VIS-01 — Lab 3 responsive screenshots', () => {
  test('authentication screens', async ({ page }) => {
    // Login responsive viewports
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.context().clearCookies();
      await page.goto('/login');
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
      await page.screenshot({ path: `artifacts/lab-03/screenshots/authentication/login-${viewport.name}.png` });
    }

    // Invalid login error
    await page.getByLabel(/email address/i).fill('nobody@toktickit.local');
    await page.getByLabel(/^password/i).fill('WrongPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/authentication/login-invalid-error.png' });

    // Inactive account error
    await page.getByLabel(/email address/i).fill('requester.inactive@toktickit.local');
    await page.getByLabel(/^password/i).fill('Requester123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/deactivated/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/authentication/login-inactive-error.png' });

    // Reach /change-password using adminShots initial credentials
    await page.setViewportSize({ width: 1280, height: 720 });
    await login(page, E2E.adminShots.email, E2E.adminShots.initial);
    await expect(page).toHaveURL(/\/change-password/);
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();

    // Change password responsive viewports
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.screenshot({ path: `artifacts/lab-03/screenshots/authentication/change-password-${viewport.name}.png` });
    }

    // Change password validation feedback
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByLabel(/current \(temporary\) password/i).fill(E2E.adminShots.initial);
    await page.getByLabel(/^new password/i).fill('Short1!');
    await page.getByLabel(/confirm new password/i).fill('Mismatch99!');
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/authentication/change-password-validation.png' });

    // Complete password change to known changed state
    await changePassword(page, E2E.adminShots.initial, E2E.adminShots.changed);
    await expect(page).toHaveURL(/\/staff\/queue|\/admin\/users/, { timeout: 15000 });

    // App shell user & role display
    await page.goto('/staff/queue');
    await expect(page.getByText(/ADMINISTRATOR/).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/authentication/app-shell-role.png' });

    // Logout and blocked re-entry
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    await page.goto('/staff/queue');
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/authentication/logout-blocked.png' });
  });

  test('staff queue', async ({ page }) => {
    await loginAsStaff(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/staff/queue');
      await expect(page.getByText(/TK-/).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
      await page.screenshot({ path: `artifacts/lab-03/screenshots/staff-queue/queue-${viewport.name}.png` });
    }

    // Functional queue screenshots on desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByPlaceholder(/search by ticket number/i).fill('TK-');
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(page.getByText(/TK-/).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/staff-queue/queue-search.png' });

    await page.getByPlaceholder(/search by ticket number/i).fill('');
    await page.getByRole('button', { name: /^search$/i }).click();
    await page.locator('#q-status').selectOption('OPEN');
    await page.locator('#q-owner').selectOption('unassigned');
    await expect(page.getByText(/TK-/).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/staff-queue/queue-filters.png' });

    await page.locator('#q-status').selectOption('');
    await page.locator('#q-owner').selectOption('');
    await page.getByPlaceholder(/search by ticket number/i).fill('TK-NONEXISTENT-999999');
    await page.getByRole('button', { name: /^search$/i }).click();
    await expect(page.getByText(/no tickets match your filters|no tickets found/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/staff-queue/queue-no-results.png' });
  });

  test('staff ticket detail', async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/staff/queue');
    await expect(page.getByText(/TK-/).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /^open$/i }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
    await expect(page.getByRole('tab', { name: /public comments/i })).toBeVisible({ timeout: 15000 });

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.screenshot({ path: `artifacts/lab-03/screenshots/staff-ticket-detail/detail-${viewport.name}.png` });
    }

    // Detail actions & channels
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/staff-ticket-detail/detail-claim-action.png' });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/staff-ticket-detail/detail-priority-status.png' });

    const stamp = Date.now();
    await page.getByRole('tab', { name: /public comments/i }).click();
    await page.getByLabel(/add public comment/i).fill(`Public update for submission verification (${stamp})`);
    await page.getByRole('button', { name: /post comment/i }).click();
    await expect(page.getByText(String(stamp))).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/staff-ticket-detail/detail-public-comments.png' });

    await page.getByRole('tab', { name: /internal notes/i }).click();
    await page.getByLabel(/add internal note/i).fill(`Internal staff diagnosis note (${stamp})`);
    await page.getByRole('button', { name: /post note/i }).click();
    await expect(page.getByText(String(stamp))).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/staff-ticket-detail/detail-internal-notes.png' });
  });

  test('user management', async ({ page, browser }) => {
    await loginAsAdmin(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expect(page.getByRole('row', { name: /admin one/i })).toBeVisible({ timeout: 15000 });
      await page.screenshot({ path: `artifacts/lab-03/screenshots/user-management/users-${viewport.name}.png` });
    }

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole('button', { name: /create user/i }).click();
    await page.screenshot({ path: `artifacts/lab-03/screenshots/user-management/create-drawer-desktop.png` });

    // Duplicate email error
    await page.locator('#admin-name').fill('Duplicate User Test');
    await page.locator('#admin-email').fill('admin1@toktickit.local');
    await page.locator('#admin-user-role').selectOption('REQUESTER');
    await page.locator('#admin-initial-password').fill('Requester123!');
    await page.getByRole('button', { name: /save user/i }).click();
    await expect(page.locator('#admin-email')).toHaveClass(/is-invalid/);
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/user-management/user-duplicate-email-error.png' });
    await page.getByRole('button', { name: /cancel/i }).click();

    // Role filter
    await page.locator('#admin-role-filter').selectOption({ label: 'IT Staff' });
    await expect(page.getByRole('row', { name: /it/i }).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/user-management/users-search-filter.png' });
    await page.locator('#admin-role-filter').selectOption({ label: 'All roles' });

    // Edit drawer
    await page.getByRole('button', { name: /edit it carol/i }).click();
    await expect(page.getByRole('heading', { name: /edit user/i })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/user-management/user-edit-drawer.png' });
    await page.getByRole('button', { name: /cancel/i }).click();

    // Self-deactivate guard
    await page.getByRole('button', { name: /edit admin one/i }).click();
    const selfDeactivate = page.getByRole('button', { name: /deactivate user/i });
    await expect(selfDeactivate).toBeDisabled();
    await expect(selfDeactivate).toHaveAttribute('title', /own account/i);
    await page.screenshot({ path: 'artifacts/lab-03/screenshots/user-management/user-self-deactivate-guard.png' });
    await page.getByRole('button', { name: /cancel/i }).click();

    // Non-admin forbidden card
    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await staffPage.setViewportSize({ width: 1280, height: 720 });
    await loginAsStaff(staffPage);
    await staffPage.goto('/admin/users');
    await expect(staffPage.getByText(/you do not have access to user management/i)).toBeVisible({ timeout: 10000 });
    await staffPage.screenshot({ path: 'artifacts/lab-03/screenshots/user-management/user-forbidden-staff.png' });
    await staffContext.close();
  });
});
