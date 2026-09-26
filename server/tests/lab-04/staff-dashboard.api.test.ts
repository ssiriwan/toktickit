import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { signSession } from '../../src/auth.js';
import { prisma } from '../../src/db.js';

const app = createApp();
type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

const STAFF = { id: 3, role: 'IT_STAFF', isActive: true, mustChangePassword: false };
const ADMIN = { id: 5, role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false };
const REQUESTER = { id: 7, role: 'REQUESTER', isActive: true, mustChangePassword: false };

function mockUsers() {
  const rows: Record<number, object> = { 3: STAFF, 5: ADMIN, 7: REQUESTER };
  vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: never) => {
    const id = (args as { where: { id: number } }).where.id;
    return (rows[id] ?? null) as never;
  });
}

function cookieFor(id: number, role: Role) {
  return `toktickit_session=${signSession(id, role)}`;
}

const recentTickets = [
  {
    id: 1, ticketNumber: 'TK-20260910-0001', summary: 'Laptop battery', currentStatus: 'IN_PROGRESS',
    itPriority: 'HIGH', updatedAt: new Date().toISOString(), owner: { id: 3, name: 'IT Alice' }
  }
];

function mockDashboardDb() {
  vi.spyOn(prisma.ticket, 'count').mockImplementation(async (args: never) => {
    const where = (args as { where: Record<string, unknown> })?.where ?? {};
    if (where.currentStatus === 'NEW') return 2 as never;
    if (where.currentStatus === 'OPEN') return 3 as never;
    if (where.currentStatus === 'IN_PROGRESS') return 4 as never;
    if (where.currentStatus === 'WAITING_FOR_REQUESTER') return 1 as never;
    if ((where.ownerId as number) === 3) return 5 as never;
    if (typeof where.ownerId === 'number') return 5 as never;
    if (where.ownerId === null) return 6 as never;
    if ((where.itPriority as string) === 'URGENT') return 2 as never;
    return 0 as never;
  });
  vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue(recentTickets as never);
  vi.spyOn(prisma.user, 'count').mockImplementation(async (args: never) => {
    const where = (args as { where?: Record<string, unknown> })?.where ?? {};
    if (Object.keys(where).length === 0) return 12 as never;
    if (where.role === 'REQUESTER') return 5 as never;
    if (where.role === 'IT_STAFF') return 4 as never;
    if (where.role === 'ADMINISTRATOR') return 2 as never;
    if (where.isActive === false) return 1 as never;
    return 0 as never;
  });
}

describe('Lab 4 staff/admin dashboards (SD-01..03)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('SD-01: staff dashboard counts match DB filters', async () => {
    mockUsers();
    mockDashboardDb();
    const countSpy = vi.mocked(prisma.ticket.count);

    const res = await request(app).get('/api/staff/dashboard').set('Cookie', cookieFor(3, 'IT_STAFF'));

    expect(res.status).toBe(200);
    expect(res.body.metrics).toEqual({
      newCount: 2, openCount: 3, inProgressCount: 4, waitingForRequesterCount: 1,
      myAssignedCount: 5, unassignedCount: 6, urgentCount: 2
    });
    expect(res.body.recentTickets).toEqual(recentTickets);
    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ownerId: null }) })
    );
    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ownerId: 3 }) })
    );
    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ itPriority: 'URGENT' }) })
    );
  });

  it('SD-02: admin dashboard adds the user summary', async () => {
    mockUsers();
    mockDashboardDb();

    const res = await request(app).get('/api/admin/dashboard').set('Cookie', cookieFor(5, 'ADMINISTRATOR'));

    expect(res.status).toBe(200);
    expect(res.body.metrics.myAssignedCount).toBe(5);
    expect(res.body.userSummary).toEqual({
      totalUsers: 12, activeRequesters: 5, activeStaff: 4, activeAdmins: 2, inactiveUsers: 1
    });

    const staffForbidden = await request(app).get('/api/admin/dashboard').set('Cookie', cookieFor(3, 'IT_STAFF'));
    expect(staffForbidden.status).toBe(403);
  });

  it('SD-03: requester is forbidden on staff and admin dashboards', async () => {
    mockUsers();
    const staff = await request(app).get('/api/staff/dashboard').set('Cookie', cookieFor(7, 'REQUESTER'));
    expect(staff.status).toBe(403);
    const admin = await request(app).get('/api/admin/dashboard').set('Cookie', cookieFor(7, 'REQUESTER'));
    expect(admin.status).toBe(403);
  });
});
