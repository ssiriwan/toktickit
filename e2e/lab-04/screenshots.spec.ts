import { expect, test, type Page } from '@playwright/test';

import { E2E, changePassword, login } from '../lab-03/e2e-accounts';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 }
] as const;

/**
 * VIS-01 — Lab 4 responsive screenshots + functional demonstration artifacts.
 * Read-only flows use it3 (staffShots) and requester2; global setup/teardown
 * pin those accounts back to initial state. Logins tolerate changed passwords.
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
  await page.waitForURL(/\/change-password|\/$|.*staff.*|.*tickets.*/, { timeout: 8000 }).catch(() => null);
  if (home.test(page.url())) return;
  if (/\/change-password/.test(page.url())) {
    await changePassword(page, initial, changed);
    await expect(page).toHaveURL(home, { timeout: 15000 });
    return;
  }
  await login(page, email, changed);
  await page.waitForURL(/\/change-password|\/$|.*staff.*|.*tickets.*/, { timeout: 8000 }).catch(() => null);
  if (/\/change-password/.test(page.url())) {
    await changePassword(page, initial, changed);
  }
  await expect(page).toHaveURL(home, { timeout: 15000 });
}

async function loginAsRequester(page: Page) {
  await loginWithKnownState(page, E2E.requester.email, E2E.requester.initial, E2E.requester.changed, /\/($|tickets)/);
  await page.goto('/');
  await expect(page.getByText(/welcome back/i)).toBeVisible({ timeout: 15000 });
}

async function loginAsStaffShots(page: Page) {
  await loginWithKnownState(
    page,
    E2E.staffShots.email,
    E2E.staffShots.initial,
    E2E.staffShots.changed,
    /\/staff\/queue|\/$/
  );
  await page.goto('/');
  await expect(page.getByText(/welcome back/i)).toBeVisible({ timeout: 15000 });
}

test.describe('VIS-01 — Lab 4 responsive screenshots', () => {
  test('requester dashboard', async ({ page }) => {
    await loginAsRequester(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expect(page.getByText(/my open tickets/i)).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: `artifacts/lab-04/screenshots/requester-dashboard/dashboard-${viewport.name}.png` });
    }

    // Drill-down lands filtered.
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole('link', { name: /closed/i }).click();
    await expect(page).toHaveURL(/\/tickets\?status=CLOSED/);
    await page.screenshot({ path: 'artifacts/lab-04/screenshots/requester-dashboard/drill-down-closed.png' });
  });

  test('staff dashboard', async ({ page }) => {
    await loginAsStaffShots(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expect(page.getByRole('link', { name: /^new /i })).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: `artifacts/lab-04/screenshots/staff-dashboard/dashboard-${viewport.name}.png` });
    }

    // Drill-down lands on the filtered queue.
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.getByRole('link', { name: /^my assigned/i }).click();
    await expect(page).toHaveURL(/\/staff\/queue\?owner=me/);
    await page.screenshot({ path: 'artifacts/lab-04/screenshots/staff-dashboard/drill-down-my-assigned.png' });
  });

  test('actions taken on staff ticket detail', async ({ page }) => {
    await loginAsStaffShots(page);
    await page.goto('/staff/queue');
    await expect(page.getByText(/TK-/).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    // TK-20260910-0001 carries a seeded COMPLETED action.
    await page.getByPlaceholder(/search by ticket number/i).fill('TK-20260910-0001');
    await page.getByRole('button', { name: /^search$/i }).click();
    await page.getByRole('button', { name: /^open$/i }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
    await expect(page.getByText(/actions taken/i).first()).toBeVisible({ timeout: 15000 });

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.screenshot({
        path: `artifacts/lab-04/screenshots/actions-taken/detail-${viewport.name}.png`,
        fullPage: true
      });
    }

    // Add-action form state.
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole('button', { name: /add action taken/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'artifacts/lab-04/screenshots/actions-taken/add-action-form.png' });
    await page.getByRole('button', { name: /^cancel$/i }).last().click();
  });

  test('actions taken read-only on requester ticket detail', async ({ page }) => {
    await loginAsRequester(page);
    await page.getByRole('link', { name: /view my tickets/i }).click();
    await expect(page).toHaveURL(/\/tickets/);
    // requester2 owns TK-20260910-0006, which carries a seeded IN_PROGRESS action.
    await page.getByText('TK-20260910-0006').filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/tickets\/\d+/);
    await expect(page.getByText(/actions taken/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /add action taken/i })).toHaveCount(0);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.screenshot({
        path: `artifacts/lab-04/screenshots/actions-taken/requester-readonly-${viewport.name}.png`,
        fullPage: true
      });
    }
  });
});
