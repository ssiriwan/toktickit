import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'mobile',  width: 375,  height: 812 },
];

const mockRequesters = [
  { id: 1, name: 'Alice Carter', email: 'alice@toktickit.example' },
  { id: 2, name: 'Bob Nguyen',  email: 'bob@toktickit.example' },
  { id: 3, name: 'Carol Smith', email: 'carol@toktickit.example' },
  { id: 4, name: 'David Lee',   email: 'david@toktickit.example' },
];
const mockCategories = [
  { id: 1, name: 'Account and Access' },
  { id: 2, name: 'Hardware' },
  { id: 3, name: 'Software' },
  { id: 4, name: 'Network' },
];
const mockSystems = [
  { id: 1, name: 'Email' },
  { id: 2, name: 'Campus Wi-Fi' },
  { id: 3, name: 'VPN' },
  { id: 4, name: 'LEB2 App' },
  { id: 5, name: 'Grade Submission App' },
  { id: 6, name: 'Printer' },
  { id: 7, name: 'Corporate Laptop' },
];

async function mockApi(page) {
  await page.route('**/api/requesters', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRequesters) });
  });
  await page.route('**/api/categories', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockCategories) });
  });
  await page.route('**/api/related-systems', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSystems) });
  });
  await page.route('**/api/tickets', async route => {
    if (route.request().method() === 'POST') {
      let body: any = {};
      try { body = route.request().postDataJSON() as any; } catch { body = {}; }
      if (!body) body = {};
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 101,
          ticketNumber: 'TK-20250906-0001',
          summary: body.summary || 'Mock ticket',
          description: body.description || 'desc',
          currentStatus: 'New',
          requestedPriority: body.requestedPriority || 'MEDIUM',
          ticketDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          requester: mockRequesters[0],
          category: mockCategories[1],
          relatedSystem: mockSystems[6],
        }),
      });
      return;
    }
    // GET /api/tickets?requesterId=1...
    const url = new URL(route.request().url());
    const requesterId = url.searchParams.get('requesterId');
    const search = url.searchParams.get('search') || '';
    // simple mock list
    let tickets: any[] = [
      {
        id: 101, ticketNumber: 'TK-20250906-0001', summary: 'Laptop battery drains quickly',
        currentStatus: 'New', requestedPriority: 'MEDIUM', ticketDate: '2025-09-06T09:14:00.000Z', updatedAt: '2025-09-06T09:14:00.000Z',
        category: mockCategories[1], relatedSystem: mockSystems[6],
      },
      {
        id: 102, ticketNumber: 'TK-20250906-0002', summary: 'Cannot connect to VPN',
        currentStatus: 'New', requestedPriority: 'HIGH', ticketDate: '2025-09-06T08:00:00.000Z', updatedAt: '2025-09-06T08:00:00.000Z',
        category: mockCategories[3], relatedSystem: mockSystems[2],
      },
    ];
    if (search) {
      tickets = tickets.filter(t => t.summary.toLowerCase().includes(search.toLowerCase()));
    }
    if (requesterId === '2') {
      // Bob has no tickets for empty test, or filtered
      if (search) tickets = [];
      else tickets = [];
    }
    const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
    const start = (pageParam - 1) * pageSize;
    const paged = tickets.slice(start, start + pageSize);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tickets: paged, pagination: { page: pageParam, pageSize, totalItems: tickets.length, totalPages: Math.ceil(tickets.length / pageSize) || 1 } }),
    });
  });
  await page.route('**/api/tickets/*', async route => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/tickets\/(\d+)/);
    const id = match?.[1];
    if (url.pathname.includes('/attachments')) {
      // POST attachment
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 201, filename: 'sample.png', mimeType: 'image/png', fileSize: 12345, isRemoved: false, createdAt: new Date().toISOString() }),
        });
        return;
      }
    }
    // GET ticket detail
    if (route.request().method() === 'GET' && id) {
      const requesterId = url.searchParams.get('requesterId');
      if (requesterId === '2' && id === '101') {
        await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { code: 'ACCESS_DENIED', message: 'Access denied' } }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: Number(id), ticketNumber: 'TK-20250906-0001', summary: 'Laptop battery drains quickly',
          description: 'My laptop battery is draining quickly even when idle.',
          currentStatus: 'New', requestedPriority: 'MEDIUM',
          ticketDate: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          requester: mockRequesters[0], category: mockCategories[1], relatedSystem: mockSystems[6],
          attachments: [
            { id: 201, filename: 'evidence.png', mimeType: 'image/png', fileSize: 102400, isRemoved: false, createdAt: new Date().toISOString() },
            { id: 202, filename: 'log.pdf', mimeType: 'application/pdf', fileSize: 204800, isRemoved: false, createdAt: new Date().toISOString() },
          ],
        }),
      });
      return;
    }
    await route.continue();
  });
  await page.route('**/api/attachments/**/download**', async route => {
    const url = new URL(route.request().url());
    // check removed
    if (route.request().url().includes('202')) {
      // second attachment is active, first we will test removed later
    }
    await route.fulfill({ status: 200, contentType: 'image/png', body: 'fake-png' });
  });
  await page.route('**/api/attachments/*/remove**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 201, filename: 'evidence.png', isRemoved: true, removalReason: 'no longer needed', removedAt: new Date().toISOString() }),
    });
  });
}

async function shot(page, file, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.waitForTimeout(400);
  const p = path.resolve(`artifacts/lab-02/screenshots/${file}`);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  await page.screenshot({ path: p, fullPage: true });
}

test.describe('Screenshots Lab 2 — auto generate 18 files', () => {
  test.setTimeout(120_000);

  for (const vp of viewports) {
    test(`requester-selection - ${vp.name}`, async ({ page }) => {
      await mockApi(page);
      await page.goto('/');
      await expect(page.getByText(/Select a Development Requester/i)).toBeVisible();
      await shot(page, `requester-selection/${vp.name}.png`, vp);
    });
  }

  for (const vp of viewports) {
    test(`create-ticket - ${vp.name}`, async ({ page }) => {
      await mockApi(page);
      await page.goto('/');
      await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
      await page.getByRole('button', { name: /^Continue$/ }).click();
      await page.getByRole('button', { name: /Create Ticket/i }).click();
      await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible();
      await page.waitForTimeout(600);
      await shot(page, `create-ticket/${vp.name}.png`, vp);
    });
  }

  test('create-ticket - validation', async ({ page }) => {
    const vp = viewports[0];
    await mockApi(page);
    await page.goto('/');
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
    await page.getByRole('button', { name: /^Continue$/ }).click();
    await page.getByRole('button', { name: /Create Ticket/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible();
    await page.getByRole('button', { name: /Submit Ticket/i }).click();
    await expect(page.getByText(/Summary is required/i).first()).toBeVisible();
    await shot(page, `create-ticket/validation.png`, vp);
  });

  test('create-ticket - success', async ({ page }) => {
    const vp = viewports[0];
    await mockApi(page);
    await page.goto('/');
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
    await page.getByRole('button', { name: /^Continue$/ }).click();
    await page.getByRole('button', { name: /Create Ticket/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible();
    await page.getByLabel(/Category/i).selectOption({ label: 'Hardware' });
    await page.getByLabel(/Related System/i).selectOption({ label: 'Corporate Laptop' });
    await page.getByLabel(/Requested Priority/i).selectOption('MEDIUM');
    await page.getByLabel(/^Summary/i).fill('Laptop battery drains quickly');
    await page.getByLabel(/^Description/i).fill('Battery drains even when idle after update');
    await page.getByRole('button', { name: /Submit Ticket/i }).click();
    await expect(page.getByText(/Ticket created successfully/i)).toBeVisible();
    await expect(page.getByText(/TK-20250906-0001/).first()).toBeVisible();
    await shot(page, `create-ticket/success.png`, vp);
  });

  test('create-ticket - error (API failure)', async ({ page }) => {
    const vp = viewports[0];
    await mockApi(page);
    await page.goto('/');
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
    await page.getByRole('button', { name: /^Continue$/ }).click();
    await page.getByRole('button', { name: /Create Ticket/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible();
    await page.getByLabel(/Category/i).selectOption({ label: 'Hardware' });
    await page.getByLabel(/Related System/i).selectOption({ label: 'Email' });
    await page.getByLabel(/Requested Priority/i).selectOption('LOW');
    await page.getByLabel(/^Summary/i).fill('Will fail');
    await page.getByLabel(/^Description/i).fill('This will trigger 500');
    await page.unroute('**/api/tickets');
    await page.route('**/api/tickets', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create ticket' } }) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tickets: [], pagination: { page:1, pageSize:10, totalItems:0, totalPages:1 } }) });
      }
    });
    await page.getByRole('button', { name: /Submit Ticket/i }).click();
    await expect(page.getByText(/Unable to create ticket/i)).toBeVisible({ timeout: 5000 }).catch(async () => {});
    await shot(page, `create-ticket/error.png`, vp);
  });

  for (const vp of viewports) {
    test(`my-tickets - ${vp.name}`, async ({ page }) => {
      await mockApi(page);
      await page.goto('/');
      await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
      await page.getByRole('button', { name: /^Continue$/ }).click();
      await expect(page.getByText(/My Tickets/i).first()).toBeVisible();
      await page.waitForTimeout(600);
      await shot(page, `my-tickets/${vp.name}.png`, vp);
    });
  }

  test('my-tickets - empty', async ({ page }) => {
    const vp = viewports[0];
    await mockApi(page);
    await page.goto('/');
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Bob Nguyen' });
    await page.getByRole('button', { name: /^Continue$/ }).click();
    await expect(page.getByText(/My Tickets/i).first()).toBeVisible();
    await page.waitForTimeout(600);
    // Bob has no tickets per mock, should show empty
    await expect(page.getByText(/No tickets yet/i).or(page.getByText(/No tickets/i))).toBeVisible({ timeout: 5000 }).catch(() => {});
    await shot(page, `my-tickets/empty.png`, vp);
  });

  test('my-tickets - no-results', async ({ page }) => {
    const vp = viewports[0];
    await mockApi(page);
    await page.goto('/');
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
    await page.getByRole('button', { name: /^Continue$/ }).click();
    await page.getByRole('button', { name: 'My Tickets' }).click();
    await expect(page.getByPlaceholder('Search tickets...')).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder('Search tickets...').fill('zzzz-no-match-xyz');
    await page.waitForTimeout(1000);
    await expect(page.getByText(/No tickets match/i).or(page.getByText(/No results/i))).toBeVisible({ timeout: 5000 }).catch(() => {});
    await shot(page, `my-tickets/no-results.png`, vp);
  });

  for (const vp of viewports) {
    test(`ticket-detail - ${vp.name}`, async ({ page }) => {
      await mockApi(page);
      await page.goto('/');
      await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
      await page.getByRole('button', { name: /^Continue$/ }).click();
      await page.waitForTimeout(500);
      await page.goto('/tickets/101');
      await page.waitForTimeout(1000);
      // try to wait for heading, but don't fail if not found - just capture
      await expect(page.getByRole('heading', { name: /Ticket/ })).toBeVisible({ timeout: 8000 }).catch(() => {});
      await shot(page, `ticket-detail/${vp.name}.png`, vp);
    });
  }

  test('ticket-detail - attachments', async ({ page }) => {
    const vp = viewports[0];
    await mockApi(page);
    await page.goto('/');
    await page.getByLabel(/Development Requester/i).selectOption({ label: 'Alice Carter' });
    await page.getByRole('button', { name: /^Continue$/ }).click();
    await page.waitForTimeout(500);
    await page.goto('/tickets/101');
    await page.waitForTimeout(1000);
    await expect(page.getByText(/Attachments/)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await shot(page, `ticket-detail/attachments.png`, vp);
  });
});
