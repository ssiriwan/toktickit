import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { signSession } from '../../src/auth.js';
import { prisma } from '../../src/db.js';

const app = createApp();
type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

const STAFF = { id: 3, role: 'IT_STAFF', isActive: true, mustChangePassword: false };
const REQUESTER = { id: 7, role: 'REQUESTER', isActive: true, mustChangePassword: false };

function mockUsers() {
  const rows: Record<number, object> = { 3: STAFF, 7: REQUESTER };
  vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: never) => {
    const id = (args as { where: { id: number } }).where.id;
    return (rows[id] ?? null) as never;
  });
}

function cookieFor(id: number, role: Role) {
  return `toktickit_session=${signSession(id, role)}`;
}

const T0 = '2026-09-20T10:00:00.000Z';

function mockTicket(ticket: object, completedActions = 0) {
  vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(ticket as never);
  vi.spyOn(prisma.actionTaken, 'count').mockResolvedValue(completedActions as never);
  vi.spyOn(prisma.ticket, 'update').mockImplementation(async (args: never) => ({
    id: 1,
    currentStatus: (args as { data: { currentStatus: string } }).data.currentStatus,
    updatedAt: new Date().toISOString()
  }) as never);
}

describe('Lab 4 ticket workflow (WF-01..07)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('WF-01: RESOLVED without a COMPLETED action is blocked (400 RESOLUTION_GATE_VIOLATION)', async () => {
    mockUsers();
    mockTicket({ id: 1, currentStatus: 'IN_PROGRESS', updatedAt: T0 }, 0);

    const res = await request(app)
      .patch('/api/staff/tickets/1/status')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ status: 'RESOLVED', clientUpdatedAt: T0 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RESOLUTION_GATE_VIOLATION');
  });

  it('WF-02: RESOLVED with a COMPLETED action succeeds', async () => {
    mockUsers();
    const updateSpy = vi.spyOn(prisma.ticket, 'update').mockResolvedValue({ id: 1, currentStatus: 'RESOLVED', updatedAt: T0 } as never);
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'IN_PROGRESS', updatedAt: T0 } as never);
    vi.spyOn(prisma.actionTaken, 'count').mockResolvedValue(1 as never);

    const res = await request(app)
      .patch('/api/staff/tickets/1/status')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ status: 'RESOLVED', clientUpdatedAt: T0 });

    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentStatus: 'RESOLVED' }) })
    );
  });

  it('WF-03: off-matrix transitions are rejected (400 INVALID_TRANSITION)', async () => {
    mockUsers();
    mockTicket({ id: 1, currentStatus: 'NEW', updatedAt: T0 }, 5);

    const skip = await request(app)
      .patch('/api/staff/tickets/1/status')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ status: 'RESOLVED', clientUpdatedAt: T0 });
    expect(skip.status).toBe(400);
    expect(skip.body.error.code).toBe('INVALID_TRANSITION');

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'CANCELLED', updatedAt: T0 } as never);
    const terminal = await request(app)
      .patch('/api/staff/tickets/1/status')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ status: 'OPEN', clientUpdatedAt: T0 });
    expect(terminal.status).toBe(400);
    expect(terminal.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('WF-04: stale clientUpdatedAt is rejected (409 STALE_UPDATE)', async () => {
    mockUsers();
    mockTicket({ id: 1, currentStatus: 'OPEN', updatedAt: '2026-09-21T10:00:00.000Z' }, 0);

    const res = await request(app)
      .patch('/api/staff/tickets/1/status')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ status: 'IN_PROGRESS', clientUpdatedAt: T0 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('STALE_UPDATE');
  });

  it('WF-05: fresh clientUpdatedAt succeeds; missing/unparseable is 400', async () => {
    mockUsers();
    mockTicket({ id: 1, currentStatus: 'OPEN', updatedAt: T0 }, 0);

    const ok = await request(app)
      .patch('/api/staff/tickets/1/status')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ status: 'IN_PROGRESS', clientUpdatedAt: T0 });
    expect(ok.status).toBe(200);

    const missing = await request(app)
      .patch('/api/staff/tickets/1/status')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ status: 'IN_PROGRESS' });
    expect(missing.status).toBe(400);

    const bad = await request(app)
      .patch('/api/staff/tickets/1/status')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ status: 'IN_PROGRESS', clientUpdatedAt: 'not-a-date' });
    expect(bad.status).toBe(400);
  });

  it('WF-06: legacy ticket without actions lists empty and stays readable', async () => {
    mockUsers();
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 9, requesterId: 7 } as never);
    vi.spyOn(prisma.actionTaken, 'findMany').mockResolvedValue([]);

    const res = await request(app).get('/api/staff/tickets/9/actions').set('Cookie', cookieFor(3, 'IT_STAFF'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('WF-07: requester status writes are forbidden (403)', async () => {
    mockUsers();
    const staffRoute = await request(app)
      .patch('/api/staff/tickets/1/status')
      .set('Cookie', cookieFor(7, 'REQUESTER'))
      .send({ status: 'IN_PROGRESS', clientUpdatedAt: T0 });
    expect(staffRoute.status).toBe(403);

    const legacyRoute = await request(app)
      .patch('/api/tickets/1/status')
      .set('Cookie', cookieFor(7, 'REQUESTER'))
      .send({ status: 'IN_PROGRESS', clientUpdatedAt: T0 });
    expect(legacyRoute.status).toBe(403);
  });
});
