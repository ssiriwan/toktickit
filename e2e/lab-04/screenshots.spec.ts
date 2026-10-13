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

    // Drill-down lands filtered with rows (My Open covers requester2's tickets).
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole('link', { name: /my open tickets/i }).click();
    await expect(page).toHaveURL(/\/tickets$/);
    await expect(page.getByText(/TK-/).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    // Settle StrictMode remount reloads before capturing.
    await expect(page.getByText(/loading tickets/i)).toHaveCount(0, { timeout: 15000 });
    await page.screenshot({ path: 'artifacts/lab-04/screenshots/requester-dashboard/drill-down-open.png' });
  });

  test('staff dashboard', async ({ page }) => {
    await loginAsStaffShots(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expect(page.getByRole('link', { name: /^new /i })).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: `artifacts/lab-04/screenshots/staff-dashboard/dashboard-${viewport.name}.png` });
    }

    // Drill-down lands on the filtered queue with rows (it3 owns nothing
    // active, so use the Unassigned card which always has seed rows).
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.getByRole('link', { name: /^unassigned /i }).click();
    await expect(page).toHaveURL(/\/staff\/queue\?owner=unassigned/);
    await expect(page.getByText(/TK-/).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'artifacts/lab-04/screenshots/staff-dashboard/drill-down-unassigned.png' });
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
    // Wait for the actions section to finish loading (not the skeleton text).
    await expect(page.getByText(/loading actions taken/i)).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByText(/actions taken \(\d+\)/i).first()).toBeVisible({ timeout: 10000 });

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.screenshot({
        path: `artifacts/lab-04/screenshots/actions-taken/detail-${viewport.name}.png`,
        fullPage: true
      });
    }

    // Add-action form state (scrolled into view so nothing is cut off).
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole('button', { name: /add action taken/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /^save action$/i }).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'artifacts/lab-04/screenshots/actions-taken/add-action-form.png',
      fullPage: true
    });
    await page.getByRole('button', { name: /^cancel$/i }).last().click();
  });

  test('actions taken read-only on requester ticket detail', async ({ page }) => {    await loginAsRequester(page);
    await page.getByRole('link', { name: /view my tickets/i }).click();
    await expect(page).toHaveURL(/\/tickets/);
    // requester2 owns TK-20260910-0006, which carries a seeded IN_PROGRESS action.
    await page.getByText('TK-20260910-0006').filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/tickets\/\d+/);
    await expect(page.getByText(/loading actions taken/i)).toHaveCount(0, { timeout: 15000 });
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

  test('workflow evidence (Part 6 edit + Part 7 gate/resolve/409)', async ({ page, browser }) => {
    await loginAsStaffShots(page);
    await page.setViewportSize({ width: 1280, height: 720 });

    // Part 6: edit-to-COMPLETED form filled (on seeded 0001 action), then cancel.
    await page.goto('/staff/queue');
    await expect(page.getByText(/TK-/).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder(/search by ticket number/i).fill('TK-20260910-0001');
    await page.getByRole('button', { name: /^search$/i }).click();
    await page.getByRole('button', { name: /^open$/i }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
    await expect(page.getByText(/loading actions taken/i)).toHaveCount(0, { timeout: 15000 });
    const seedCard = page.locator('article', { hasText: 'Replaced faulty RAM stick' });
    await seedCard.getByRole('button', { name: /^edit$/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^result/i).fill('Memory test passed 100%, battery drain back to normal.');
    await dialog.getByLabel(/^result/i).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'artifacts/lab-04/screenshots/actions-taken/edit-completed-form.png',
      fullPage: true
    });
    await dialog.getByRole('button', { name: /^cancel$/i }).last().click();

    // Part 6: performer dropdown shows active staff only (seeded inactive staff absent).
    await page.getByRole('button', { name: /add action taken/i }).click();
    await expect(dialog.getByLabel(/performed by/i)).toBeVisible({ timeout: 10000 });
    const performerOptions = await dialog.getByLabel(/performed by/i).locator('option').allTextContents();
    expect(performerOptions.join('|')).not.toMatch(/inactive/i);
    await page.screenshot({
      path: 'artifacts/lab-04/screenshots/actions-taken/performer-options.png',
      fullPage: true
    });
    await dialog.getByRole('button', { name: /^cancel$/i }).last().click();

    // Part 7: matrix-filtered status control on OPEN ticket 0008.
    await page.goto('/staff/queue');
    await page.getByPlaceholder(/search by ticket number/i).fill('TK-20260910-0008');
    await page.getByRole('button', { name: /^search$/i }).click();
    await page.getByRole('button', { name: /^open$/i }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
    await page.getByLabel(/current status/i).click();
    await page.screenshot({ path: 'artifacts/lab-04/screenshots/workflow/status-options.png' });

    // OPEN → IN_PROGRESS first (OPEN → RESOLVED is off-matrix).
    await page.getByLabel(/current status/i).selectOption('IN_PROGRESS');
    await expect(page.getByLabel(/current status/i)).toHaveValue('IN_PROGRESS', { timeout: 10000 });

    // Part 7: gate warning blocks RESOLVED with zero Completed actions.
    await page.getByLabel(/current status/i).selectOption('RESOLVED');
    await expect(page.getByText(/resolution gate/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: 'artifacts/lab-04/screenshots/workflow/gate-warning.png',
      fullPage: true
    });

    // Part 7: resolve succeeds once a COMPLETED action exists.
    const stamp = Date.now();
    await page.getByRole('button', { name: /add action taken/i }).click();
    await dialog.getByLabel(/description/i).fill(`E2E shot action ${stamp}`);
    await dialog.getByRole('button', { name: /^save action$/i }).click();
    await expect(page.getByText(`E2E shot action ${stamp}`)).toBeVisible({ timeout: 10000 });
    const shotCard = page.locator('article', { hasText: `E2E shot action ${stamp}` });
    await shotCard.getByRole('button', { name: /^edit$/i }).click();
    await dialog.getByLabel('Status').selectOption('IN_PROGRESS');
    await dialog.getByRole('button', { name: /^save action$/i }).click();
    await shotCard.getByRole('button', { name: /^edit$/i }).click();
    await dialog.getByLabel('Status').selectOption('COMPLETED');
    await dialog.getByLabel(/^result/i).fill(`E2E shot result ${stamp}`);
    await dialog.getByRole('button', { name: /^save action$/i }).click();
    await expect(shotCard.getByText('COMPLETED')).toBeVisible({ timeout: 10000 });
    await page.getByLabel(/current status/i).selectOption('RESOLVED');
    await expect(page.getByLabel(/current status/i)).toHaveValue('RESOLVED', { timeout: 10000 });
    await page.screenshot({
      path: 'artifacts/lab-04/screenshots/workflow/resolved-success.png',
      fullPage: true
    });

    // Part 7: stale 409 banner via two-context race on TK-20260910-0006.
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.setViewportSize({ width: 1280, height: 720 });
    await loginAsStaffShots(pageB);
    await page.goto('/staff/queue');
    await page.getByPlaceholder(/search by ticket number/i).fill('TK-20260910-0006');
    await page.getByRole('button', { name: /^search$/i }).click();
    await page.getByRole('button', { name: /^open$/i }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
    const ticketId = page.url().match(/\/staff\/tickets\/(\d+)/)?.[1] ?? '';
    await pageB.goto(`/staff/tickets/${ticketId}`);
    await expect(pageB.getByRole('heading', { name: /TK-20260910-0006/ })).toBeVisible({ timeout: 15000 });
    // B moves the ticket (bumps updatedAt); A then saves with a stale stamp.
    await pageB.getByLabel(/it priority/i).selectOption('HIGH');
    await expect(pageB.getByRole('heading', { name: /TK-20260910-0006/ })).toBeVisible({ timeout: 10000 });
    await page.getByLabel(/current status/i).selectOption('IN_PROGRESS');
    await expect(page.getByText(/updated elsewhere|refresh and retry/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: 'artifacts/lab-04/screenshots/workflow/concurrency-409.png',
      fullPage: true
    });
    await contextB.close();
  });
});
