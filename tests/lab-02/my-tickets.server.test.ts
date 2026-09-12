import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../server/src/app';
import { prisma } from '../../server/src/db';
import { cleanupTestUsers, loginAs, type TestSession } from './session.helper';

const app = createApp();

async function createTicket(cookie: string, overrides: Partial<Record<string, unknown>> = {}) {
  const base = {
    summary: 'Sample ticket',
    description: 'Description here',
    categoryId: 1,
    relatedSystemId: 1,
    requestedPriority: 'LOW' as const
  };
  const payload = { ...base, ...overrides };
  const res = await request(app).post('/api/tickets').set('Cookie', cookie).send(payload);
  if (res.status !== 201) throw new Error(`seed ticket failed: ${JSON.stringify(res.body)}`);
  return res.body as { id: number; ticketNumber: string };
}

describe('TokTickIT API GET /api/tickets — My Tickets', () => {
  let sessionA: TestSession;
  let sessionB: TestSession;

  beforeAll(async () => {
    await prisma.ticket.deleteMany({});
    sessionA = await loginAs('mytickets-a');
    sessionB = await loginAs('mytickets-b');
    await createTicket(sessionA.cookie, { summary: 'Laptop battery issue', description: 'battery drains fast', categoryId: 2, requestedPriority: 'MEDIUM' });
    await createTicket(sessionA.cookie, { summary: 'VPN not working', description: 'cannot connect to VPN', categoryId: 1, requestedPriority: 'HIGH' });
    await createTicket(sessionB.cookie, { summary: 'Email problem', description: 'email sync fails', categoryId: 1, requestedPriority: 'LOW' });
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({});
    await cleanupTestUsers();
  });

  it('returns only the session owner tickets', async () => {
    const res = await request(app).get('/api/tickets').set('Cookie', sessionA.cookie);
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBe(2);
    expect(res.body.tickets.every((t: { summary: string }) => t.summary !== 'Email problem')).toBe(true);
    expect(res.body.pagination.totalItems).toBe(2);
  });

  it('filters by session isolation', async () => {
    const res = await request(app).get('/api/tickets').set('Cookie', sessionB.cookie);
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBe(1);
    expect(res.body.tickets[0].summary).toBe('Email problem');
  });

  it('ignores forged requesterId query (AC-03)', async () => {
    const res = await request(app)
      .get('/api/tickets')
      .set('Cookie', sessionA.cookie)
      .query({ requesterId: 999999 });
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBe(2);
  });

  it('searches by summary case-insensitively', async () => {
    const res = await request(app).get('/api/tickets').set('Cookie', sessionA.cookie).query({ search: 'laptop' });
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBe(1);
    expect(res.body.tickets[0].summary).toMatch(/Laptop/i);
  });

  it('searches in description field', async () => {
    const res = await request(app).get('/api/tickets').set('Cookie', sessionA.cookie).query({ search: 'battery' });
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBe(1);
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/tickets').set('Cookie', sessionA.cookie).query({ categoryId: 2 });
    expect(res.status).toBe(200);
    expect(res.body.tickets.every((t: { category: { id: number } }) => t.category.id === 2)).toBe(true);
  });

  it('filters by priority', async () => {
    const res = await request(app).get('/api/tickets').set('Cookie', sessionA.cookie).query({ priority: 'HIGH' });
    expect(res.status).toBe(200);
    expect(res.body.tickets.every((t: { requestedPriority: string }) => t.requestedPriority === 'HIGH')).toBe(true);
  });

  it('sorts by ticketDate desc by default', async () => {
    const res = await request(app).get('/api/tickets').set('Cookie', sessionA.cookie);
    expect(res.status).toBe(200);
    const dates = res.body.tickets.map((t: { ticketDate: string }) => t.ticketDate);
    const sorted = [...dates].sort((a, b) => (a < b ? 1 : -1));
    expect(dates).toEqual(sorted);
  });

  it('paginates correctly', async () => {
    const res = await request(app).get('/api/tickets').set('Cookie', sessionA.cookie).query({ page: 1, pageSize: 1 });
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBe(1);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.page).toBe(1);
  });

  it('returns empty array when session owner has no tickets', async () => {
    const fresh = await loginAs('mytickets-empty');
    const res = await request(app).get('/api/tickets').set('Cookie', fresh.cookie);
    expect(res.status).toBe(200);
    expect(res.body.tickets).toEqual([]);
    expect(res.body.pagination.totalItems).toBe(0);
  });

  it('returns 401 without session', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(401);
  });
});
