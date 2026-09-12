import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { signSession } from '../../src/auth.js';
import { prisma } from '../../src/db.js';

const app = createApp();

type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

function cookieFor(id: number, role: Role, mustChangePassword = false) {
  vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
    id,
    role,
    isActive: true,
    mustChangePassword
  } as never);
  return `toktickit_session=${signSession(id, role)}`;
}

const ROWS = [
  { id: 1, ticketNumber: 'TK-20260910-0001', summary: 'VPN down', currentStatus: 'OPEN' },
  { id: 2, ticketNumber: 'TK-20260910-0002', summary: 'Printer offline', currentStatus: 'NEW' }
];

describe('Lab 3 staff queue (QUEUE-01..06)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('QUEUE-01: default list returns tickets with pagination metadata', async () => {
    const cookie = cookieFor(3, 'IT_STAFF');
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(2 as never);
    vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue(ROWS as never);

    const res = await request(app).get('/api/staff/tickets').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.tickets).toHaveLength(2);
    expect(res.body.pagination).toEqual({ page: 1, pageSize: 10, totalItems: 2, totalPages: 1 });
  });

  it('QUEUE-02: search matches number, summary, and description', async () => {
    const cookie = cookieFor(3, 'IT_STAFF');
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1 as never);
    const findSpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([ROWS[0]] as never);

    const res = await request(app).get('/api/staff/tickets').set('Cookie', cookie).query({ search: 'vpn' });

    expect(res.status).toBe(200);
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ ticketNumber: expect.anything() }),
            expect.objectContaining({ summary: expect.anything() }),
            expect.objectContaining({ description: expect.anything() })
          ])
        })
      })
    );
  });

  it('QUEUE-03: filters narrow the queue', async () => {
    const cookie = cookieFor(3, 'IT_STAFF');
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(1 as never);
    const findSpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([ROWS[0]] as never);

    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Cookie', cookie)
      .query({ status: 'OPEN', categoryId: 3, relatedSystemId: 3, reqPriority: 'HIGH', itPriority: 'HIGH', owner: 'me' });

    expect(res.status).toBe(200);
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          currentStatus: 'OPEN',
          categoryId: 3,
          relatedSystemId: 3,
          requestedPriority: 'HIGH',
          itPriority: 'HIGH',
          ownerId: 3
        })
      })
    );

    const unassigned = await request(app)
      .get('/api/staff/tickets')
      .set('Cookie', cookie)
      .query({ owner: 'unassigned' });
    expect(unassigned.status).toBe(200);
    expect(findSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ownerId: null }) })
    );
  });

  it('QUEUE-04: sorting and pagination are honored', async () => {
    const cookie = cookieFor(3, 'IT_STAFF');
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(25 as never);
    const findSpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue(ROWS as never);

    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Cookie', cookie)
      .query({ sort: 'ticketDate', order: 'asc', page: 2, pageSize: 10 });

    expect(res.status).toBe(200);
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { ticketDate: 'asc' }, skip: 10, take: 10 })
    );
    expect(res.body.pagination).toEqual({ page: 2, pageSize: 10, totalItems: 25, totalPages: 3 });
  });

  it('QUEUE-05: invalid queries are rejected', async () => {
    const cookie = cookieFor(3, 'IT_STAFF');
    const bad = [
      { status: 'BOGUS' },
      { categoryId: 'NaN' },
      { relatedSystemId: '0' },
      { reqPriority: 'CRITICAL' },
      { owner: 'someone' },
      { sort: 'hacker' },
      { order: 'hacker' },
      { page: '0' },
      { pageSize: '51' }
    ];
    for (const q of bad) {
      const res = await request(app).get('/api/staff/tickets').set('Cookie', cookie).query(q);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_QUERY');
    }
  });

  it('QUEUE-06: requester forbidden, admin read-only allowed, auth enforced', async () => {    const staffRes = await request(app)
      .get('/api/staff/tickets')
      .set('Cookie', cookieFor(4, 'REQUESTER'));
    expect(staffRes.status).toBe(403);

    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(0 as never);
    vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([] as never);
    const adminRes = await request(app)
      .get('/api/staff/tickets')
      .set('Cookie', cookieFor(5, 'ADMINISTRATOR'));
    expect(adminRes.status).toBe(200);

    const anon = await request(app).get('/api/staff/tickets');
    expect(anon.status).toBe(401);

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1 } as never);
    const detail = await request(app)
      .get('/api/staff/tickets/1')
      .set('Cookie', cookieFor(3, 'IT_STAFF'));
    expect(detail.status).toBe(200);

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(null as never);
    const missing = await request(app)
      .get('/api/staff/tickets/999999')
      .set('Cookie', cookieFor(3, 'IT_STAFF'));
    expect(missing.status).toBe(404);
  });

  it('QUEUE-02b: mustChange users are blocked from the queue', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Cookie', cookieFor(3, 'IT_STAFF', true));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });
});
