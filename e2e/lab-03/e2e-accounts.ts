import { expect, type Page } from '@playwright/test';

/**
 * Dedicated E2E accounts (seeded users, reset to initial state by
 * global.setup.ts before AND after every run — owner's daily accounts
 * requester1/it1 are never touched by E2E).
 */
export const E2E = {
  requester: {
    email: 'requester2@toktickit.local',
    initial: 'Requester123!',
    changed: 'E2eReq123!'
  },
  staff: {
    email: 'it2@toktickit.local',
    initial: 'Itstaff123!',
    changed: 'E2eIt123!'
  },
  staffShots: {
    email: 'it3@toktickit.local',
    initial: 'Itstaff123!',
    changed: 'E2eIt3123!'
  },
  admin: {
    email: 'admin2@toktickit.local',
    initial: 'Admin123!',
    changed: 'E2eAdmin123!'
  },
  adminShots: {
    email: 'admin1@toktickit.local',
    initial: 'Admin123!',
    changed: 'E2eAdmin1123!'
  }
};

export async function login(page: Page, email: string, password: string) {
  // Wait for the auth round-trip: callers navigate/assert immediately after,
  // and an early unmount would swallow the response (lost alert/session).
  const authResponse = page
    .waitForResponse((r) => r.url().includes('/api/auth/login'), { timeout: 20000 })
    .catch(() => null);
  await page.goto('/login');
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await authResponse;
}

/** Assumes the app currently shows the forced Change Password screen. */
export async function changePassword(page: Page, current: string, next: string) {
  const changeResponse = page
    .waitForResponse((r) => r.url().includes('/api/auth/change-password'), { timeout: 20000 })
    .catch(() => null);
  await page.getByLabel(/current \(temporary\) password/i).fill(current);
  await page.getByLabel(/^new password/i).fill(next);
  await page.getByLabel(/confirm new password/i).fill(next);
  await page.getByRole('button', { name: /continue/i }).click();
  await changeResponse;
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /logout/i }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
}
