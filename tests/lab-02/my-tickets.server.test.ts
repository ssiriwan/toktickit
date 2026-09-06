import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../server/src/app';
import { prisma } from '../../server/src/db';

const app = createApp();

async function createTicket(overrides: Partial<Record<string, unknown>> = {}) {
  const base = {
    requesterId: 1,
    summary: 'Sample ticket',
    description: 'Description here',
    categoryId: 1,
    relatedSystemId: 1,
    requestedPriority: 'LOW' as const
  };
  const payload = { ...base, ...overrides };
  const res = await request(app).post('/api/tickets').send(payload);
  if (res.status !== 201) throw new Error(`seed ticket failed: ${JSON.stringify(res.body)}`);
  return res.body as { id: number; ticketNumber: string };
}

describe('TokTickIT API GET /api/tickets — My Tickets', () => {
  const ticketIds: number[] = [];

  beforeAll(async () => {
    await prisma.ticket.deleteMany({});
    const t1 = await createTicket({ requesterId: 3, summary: 'Laptop battery issue', description: 'battery drains fast', categoryId: 2, requestedPriority: 'MEDIUM' });
    const t2 = await createTicket({ requesterId: 3, summary: 'VPN not working', description: 'cannot connect to VPN', categoryId: 1, requestedPriority: 'HIGH' });
    const t3 = await createTicket({ summary: 'Email problem', description: 'email sync fails', categoryId: 1, requestedPriority: 'LOW', requesterId: 2 });
    ticketIds.push(t1.id, t2.id, t3.id);
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({});
  });

  it('returns only the specified requester tickets', async () => {
    const res = await request(app).get('/api/tickets').query({ requesterId: 3 });
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBe(2);
    expect(res.body.tickets.every((t: { summary: string }) => t.summary !== 'Email problem')).toBe(true);
    expect(res.body.pagination.totalItems).toBe(2);
  });

  it('filters by requester isolation', async () => {
    const res = await request(app).get('/api/tickets').query({ requesterId: 2 });
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBe(1);
    expect(res.body.tickets[0].summary).toBe('Email problem');
  });

  it('searches by summary case-insensitively', async () => {
    const res = await request(app).get('/api/tickets').query({ requesterId: 3, search: 'laptop' });
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBe(1);
    expect(res.body.tickets[0].summary).toMatch(/Laptop/i);
  });

  it('searches in description field', async () => {
    const res = await request(app).get('/api/tickets').query({ requesterId: 3, search: 'battery' });
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBe(1);
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/tickets').query({ requesterId: 3, categoryId: 2 });
    expect(res.status).toBe(200);
    expect(res.body.tickets.every((t: { category: { id: number } }) => t.category.id === 2)).toBe(true);
  });

  it('filters by priority', async () => {
    const res = await request(app).get('/api/tickets').query({ requesterId: 3, priority: 'HIGH' });
    expect(res.status).toBe(200);
    expect(res.body.tickets.every((t: { requestedPriority: string }) => t.requestedPriority === 'HIGH')).toBe(true);
  });

  it('sorts by ticketDate desc by default', async () => {
    const res = await request(app).get('/api/tickets').query({ requesterId: 3 });
    expect(res.status).toBe(200);
    const dates = res.body.tickets.map((t: { ticketDate: string }) => t.ticketDate);
    const sorted = [...dates].sort((a, b) => (a < b ? 1 : -1));
    expect(dates).toEqual(sorted);
  });

  it('paginates correctly', async () => {
    const res = await request(app).get('/api/tickets').query({ requesterId: 3, page: 1, pageSize: 1 });
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBe(1);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.page).toBe(1);
  });

  it('returns empty array when requester has no tickets', async () => {
    const res = await request(app).get('/api/tickets').query({ requesterId: 4 });
    expect(res.status).toBe(200);
    expect(res.body.tickets).toEqual([]);
    expect(res.body.pagination.totalItems).toBe(0);
  });

  it('returns 400 for missing requesterId', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_QUERY');
  });
});