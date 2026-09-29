import { expect, type Page } from '@playwright/test';

import { E2E, changePassword, login } from '../lab-03/e2e-accounts';

/**
 * Lab 4 login that tolerates an already-changed password (specs in one file
 * share accounts across tests; global setup pins them only per run).
 */
export async function loginStaff(page: Page) {
  await login(page, E2E.staff.email, E2E.staff.initial);
  await page.waitForURL(/\/change-password|\/staff\/queue|\/$/, { timeout: 8000 }).catch(() => null);
  if (/\/change-password/.test(page.url())) {
    await changePassword(page, E2E.staff.initial, E2E.staff.changed);
  } else if (!/\/(staff\/queue|$)/.test(page.url())) {
    await login(page, E2E.staff.email, E2E.staff.changed);
    await page.waitForURL(/\/change-password|\/staff\/queue|\/$/, { timeout: 8000 }).catch(() => null);
    if (/\/change-password/.test(page.url())) {
      await changePassword(page, E2E.staff.initial, E2E.staff.changed);
    }
  }
  await page.goto('/staff/queue');
  await expect(page.getByText(/TK-/).filter({ visible: true }).first()).toBeVisible({ timeout: 15000 });
}

export async function loginRequester(page: Page) {
  await login(page, E2E.requester.email, E2E.requester.initial);
  await page.waitForURL(/\/change-password|\/$|\/tickets/, { timeout: 8000 }).catch(() => null);
  if (/\/change-password/.test(page.url())) {
    await changePassword(page, E2E.requester.initial, E2E.requester.changed);
  } else if (!/\/($|tickets)/.test(page.url())) {
    await login(page, E2E.requester.email, E2E.requester.changed);
    await page.waitForURL(/\/change-password|\/$|\/tickets/, { timeout: 8000 }).catch(() => null);
    if (/\/change-password/.test(page.url())) {
      await changePassword(page, E2E.requester.initial, E2E.requester.changed);
    }
  }
  await expect(page.getByText(/welcome back/i)).toBeVisible({ timeout: 15000 });
}
