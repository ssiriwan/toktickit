import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { signSession } from '../../src/auth.js';
import { prisma } from '../../src/db.js';

const app = createApp();
type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

const OWNER = { id: 7, role: 'REQUESTER', isActive: true, mustChangePassword: false };
const STRANGER = { id: 8, role: 'REQUESTER', isActive: true, mustChangePassword: false };
const STAFF = { id: 3, role: 'IT_STAFF', isActive: true, mustChangePassword: false };
const ADMIN = { id: 5, role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false };

function mockUsers() {
  const rows: Record<number, object> = { 7: OWNER, 8: STRANGER, 3: STAFF, 5: ADMIN };
  vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: never) => {
    const id = (args as { where: { id: number } }).where.id;
    return (rows[id] ?? null) as never;
  });
}

function cookieFor(id: number, role: Role) {
  return `toktickit_session=${signSession(id, role)}`;
}

const recentTickets = [
  { id: 1, ticketNumber: 'TK-20260910-0001', summary: 'Laptop battery', currentStatus: 'IN_PROGRESS', requestedPriority: 'MEDIUM', updatedAt: new Date().toISOString() }
];

/** Route ticket.count by the requested filter shape. */
function mockRequesterCounts(selfCounts: Record<string, number>, otherCounts: Record<string, number>) {
  vi.spyOn(prisma.ticket, 'count').mockImplementation(async (args: never) => {
    const where = (args as { where: Record<string, unknown> })?.where ?? {};
    const table = where.requesterId === 7 ? selfCounts : otherCounts;
    const status = where.currentStatus as string | undefined;
    if (status === 'WAITING_FOR_REQUESTER') return table.waiting as never;
    if (status === 'RESOLVED') return table.resolved as never;
    if (status === 'CLOSED') return table.closed as never;
    if (where.updatedAt !== undefined) return table.updated as never;
    return table.open as never;
  });
  vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue(recentTickets as never);
}

describe('Lab 4 requester dashboard (RD-01..03)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('RD-01: requesters are isolated to self-only metrics', async () => {
    mockUsers();
    mockRequesterCounts(
      { open: 3, waiting: 1, updated: 2, resolved: 1, closed: 4 },
      { open: 0, waiting: 0, updated: 0, resolved: 0, closed: 0 }
    );

    const self = await request(app).get('/api/requester/dashboard').set('Cookie', cookieFor(7, 'REQUESTER'));
    expect(self.status).toBe(200);
    expect(self.body.metrics).toEqual({ totalOpen: 3, waitingForRequester: 1, recentlyUpdated: 2, recentlyResolved: 1, closed: 4 });

    const other = await request(app).get('/api/requester/dashboard').set('Cookie', cookieFor(8, 'REQUESTER'));
    expect(other.status).toBe(200);
    expect(other.body.metrics).toEqual({ totalOpen: 0, waitingForRequester: 0, recentlyUpdated: 0, recentlyResolved: 0, closed: 0 });
  });

  it('RD-02: counts use the contracted filters and recent list is capped at 5', async () => {
    mockUsers();
    mockRequesterCounts(
      { open: 3, waiting: 1, updated: 2, resolved: 1, closed: 4 },
      { open: 0, waiting: 0, updated: 0, resolved: 0, closed: 0 }
    );
    const countSpy = vi.mocked(prisma.ticket.count);
    const findSpy = vi.mocked(prisma.ticket.findMany);

    await request(app).get('/api/requester/dashboard').set('Cookie', cookieFor(7, 'REQUESTER'));

    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requesterId: 7,
          currentStatus: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] }
        })
      })
    );
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ requesterId: 7 }), take: 5 })
    );
  });

  it('RD-03: staff and admin are forbidden on the requester dashboard', async () => {
    mockUsers();
    const staff = await request(app).get('/api/requester/dashboard').set('Cookie', cookieFor(3, 'IT_STAFF'));
    expect(staff.status).toBe(403);
    const admin = await request(app).get('/api/requester/dashboard').set('Cookie', cookieFor(5, 'ADMINISTRATOR'));
    expect(admin.status).toBe(403);
  });
});
