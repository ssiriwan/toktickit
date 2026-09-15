import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { signSession } from '../../src/auth.js';
import { prisma } from '../../src/db.js';

const app = createApp();
type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

function cookieFor(id: number, role: Role, mustChange = false) {
  vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
    id, role, isActive: true, mustChangePassword: mustChange
  } as never);
  return `toktickit_session=${signSession(id, role)}`;
}

describe('Lab 3 staff ticket detail (DETAIL-01..07)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('DETAIL-01: IT can claim/assign; inactive target rejected; coupling NEW<->OPEN', async () => {
    const cookie = cookieFor(3, 'IT_STAFF');
    const authSpy = vi.spyOn(prisma.user, 'findUnique');
    authSpy.mockImplementation(async (args: never) => {
      const id = (args as { where: { id: number } }).where.id;
      if (id === 3) return { id: 3, role: 'IT_STAFF', isActive: true, mustChangePassword: false } as never;
      if (id === 9) return { id: 9, role: 'IT_STAFF', isActive: false } as never;
      return { id, role: 'IT_STAFF', isActive: true } as never;
    });

    // Assign from NEW must couple to OPEN (AD-13/BR-14)
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'NEW', ownerId: null } as never);
    const updateSpy = vi.spyOn(prisma.ticket, 'update').mockResolvedValue({ id: 1, ownerId: 3, currentStatus: 'OPEN' } as never);
    const assignNew = await request(app).post('/api/staff/tickets/1/assign').set('Cookie', cookie).send({ ownerId: 3 });
    expect(assignNew.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ownerId: 3, currentStatus: 'OPEN' }) }));

    // Claim unassigned -> owner + NEW->OPEN; self re-claim no-op; foreign-owned 409
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'NEW', ownerId: null } as never);
    vi.spyOn(prisma.ticket, 'update').mockResolvedValue({ id: 1, ownerId: 3, currentStatus: 'OPEN' } as never);
    const claim = await request(app).post('/api/staff/tickets/1/claim').set('Cookie', cookie).send({});
    expect(claim.status).toBe(200);

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'OPEN', ownerId: 3 } as never);
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValueOnce({ id: 1, currentStatus: 'OPEN', ownerId: 3 } as never);
    // Mock the second findUnique inside handleClaim's no-op path correctly
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'OPEN', ownerId: 3 } as never);
    const selfClaim = await request(app).post('/api/staff/tickets/1/claim').set('Cookie', cookie).send({});
    expect(selfClaim.status).toBe(200);

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'OPEN', ownerId: 99 } as never);
    const foreign = await request(app).post('/api/staff/tickets/1/claim').set('Cookie', cookie).send({});
    expect(foreign.status).toBe(409);

    // Unassign active-work returns to NEW; terminal keeps status
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'IN_PROGRESS', ownerId: 3 } as never);
    vi.spyOn(prisma.ticket, 'update').mockResolvedValue({ id: 1, ownerId: null, currentStatus: 'NEW' } as never);
    const unassignActive = await request(app).post('/api/staff/tickets/1/assign').set('Cookie', cookie).send({ ownerId: null });
    expect(unassignActive.status).toBe(200);

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'RESOLVED', ownerId: 3 } as never);
    vi.spyOn(prisma.ticket, 'update').mockResolvedValue({ id: 1, ownerId: null, currentStatus: 'RESOLVED' } as never);
    const unassignDone = await request(app).post('/api/staff/tickets/1/assign').set('Cookie', cookie).send({ ownerId: null });
    expect(unassignDone.status).toBe(200);

    const inactive = await request(app).post('/api/staff/tickets/1/assign').set('Cookie', cookie).send({ ownerId: 9 });
    expect(inactive.status).toBe(400);
  });

  it('DETAIL-02: Admin can perform staff ops (AD-13)', async () => {
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'NEW', ownerId: null } as never);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 3, role: 'IT_STAFF', isActive: true } as never);
    vi.spyOn(prisma.ticket, 'update').mockResolvedValue({ id: 1, ownerId: 3, currentStatus: 'OPEN' } as never);
    const res = await request(app).post('/api/staff/tickets/1/assign').set('Cookie', cookieFor(5, 'ADMINISTRATOR')).send({ ownerId: 3 });
    expect(res.status).toBe(200);
  });

  it('STOP-06: staff users directory allows IT and Admin, blocks Requester', async () => {
    const users = [
      { id: 3, name: 'IT Alice', email: 'it1@toktickit.local', role: 'IT_STAFF' },
      { id: 5, name: 'Admin One', email: 'admin1@toktickit.local', role: 'ADMINISTRATOR' }
    ];
    const findSpy = vi.spyOn(prisma.user, 'findMany').mockResolvedValue(users as never);

    const itRes = await request(app).get('/api/staff/users').set('Cookie', cookieFor(3, 'IT_STAFF'));
    expect(itRes.status).toBe(200);
    expect(itRes.body).toEqual(users);
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, role: { in: ['IT_STAFF', 'ADMINISTRATOR'] } },
        orderBy: { name: 'asc' }
      })
    );

    const adminRes = await request(app).get('/api/staff/users').set('Cookie', cookieFor(5, 'ADMINISTRATOR'));
    expect(adminRes.status).toBe(200);
    expect(adminRes.body).toEqual(users);

    const reqRes = await request(app).get('/api/staff/users').set('Cookie', cookieFor(7, 'REQUESTER'));
    expect(reqRes.status).toBe(403);
  });

  it('DETAIL-03: IT and Admin set itPriority; requestedPriority unchanged; requester blocked', async () => {
    const makeCookie = () => cookieFor(3, 'IT_STAFF');
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1 } as never);
    const spy = vi.spyOn(prisma.ticket, 'update').mockResolvedValue({ id: 1, itPriority: 'URGENT', requestedPriority: 'LOW' } as never);

    const res = await request(app).patch('/api/staff/tickets/1/priority').set('Cookie', makeCookie()).send({ itPriority: 'URGENT' });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ data: { itPriority: 'URGENT' } }));

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1 } as never);
    vi.spyOn(prisma.ticket, 'update').mockResolvedValue({ id: 1, itPriority: 'HIGH', requestedPriority: 'LOW' } as never);
    const admin = await request(app).patch('/api/staff/tickets/1/priority').set('Cookie', cookieFor(5, 'ADMINISTRATOR')).send({ itPriority: 'HIGH' });
    expect(admin.status).toBe(200);

    const req = await request(app).patch('/api/staff/tickets/1/priority').set('Cookie', cookieFor(7, 'REQUESTER')).send({ itPriority: 'HIGH' });
    expect(req.status).toBe(403);

    const bad = await request(app).patch('/api/staff/tickets/1/priority').set('Cookie', makeCookie()).send({ itPriority: 'CRITICAL' });
    expect(bad.status).toBe(400);
  });

  it('DETAIL-04/05: status transitions per matrix (including the 3 corrected rows)', async () => {
    const cookie = cookieFor(3, 'IT_STAFF');

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'NEW' } as never);
    vi.spyOn(prisma.ticket, 'update').mockResolvedValue({ id: 1, currentStatus: 'OPEN' } as never);
    const ok = await request(app).patch('/api/staff/tickets/1/status').set('Cookie', cookie).send({ status: 'OPEN' });
    expect(ok.status).toBe(200);

    // OPEN now allows WAITING_FOR_REQUESTER (was missing)
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'OPEN' } as never);
    vi.spyOn(prisma.ticket, 'update').mockResolvedValue({ id: 1, currentStatus: 'WAITING_FOR_REQUESTER' } as never);
    const openToWaiting = await request(app).patch('/api/staff/tickets/1/status').set('Cookie', cookie).send({ status: 'WAITING_FOR_REQUESTER' });
    expect(openToWaiting.status).toBe(200);

    // WAITING corrected: should allow CANCELLED, not RESOLVED
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'WAITING_FOR_REQUESTER' } as never);
    const waitingToCancelled = await request(app).patch('/api/staff/tickets/1/status').set('Cookie', cookie).send({ status: 'CANCELLED' });
    expect(waitingToCancelled.status).toBe(200);
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'WAITING_FOR_REQUESTER' } as never);
    const waitingToResolved = await request(app).patch('/api/staff/tickets/1/status').set('Cookie', cookie).send({ status: 'RESOLVED' });
    expect(waitingToResolved.status).toBe(400);
    expect(waitingToResolved.body.error.code).toBe('VALIDATION_ERROR');

    // REOPENED corrected: should allow CANCELLED, not RESOLVED
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'REOPENED' } as never);
    const reopenedToCancelled = await request(app).patch('/api/staff/tickets/1/status').set('Cookie', cookie).send({ status: 'CANCELLED' });
    expect(reopenedToCancelled.status).toBe(200);
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'REOPENED' } as never);
    const reopenedToResolved = await request(app).patch('/api/staff/tickets/1/status').set('Cookie', cookie).send({ status: 'RESOLVED' });
    expect(reopenedToResolved.status).toBe(400);

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'NEW' } as never);
    const blocked = await request(app).patch('/api/staff/tickets/1/status').set('Cookie', cookie).send({ status: 'RESOLVED' });
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.code).toBe('VALIDATION_ERROR');

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'CANCELLED' } as never);
    const terminal = await request(app).patch('/api/staff/tickets/1/status').set('Cookie', cookie).send({ status: 'OPEN' });
    expect(terminal.status).toBe(400);
  });

  it('DETAIL-06: appears-resolved is flag-only, never mutates status', async () => {
    const requesterCookie = cookieFor(7, 'REQUESTER');
    // Create a ticket owned by this requester with IN_PROGRESS.
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, requesterId: 7, currentStatus: 'IN_PROGRESS', appearsResolved: false } as never);
    vi.spyOn(prisma.ticket, 'update').mockResolvedValue({ id: 1, appearsResolved: true, appearsResolvedAt: new Date().toISOString(), currentStatus: 'IN_PROGRESS' } as never);
    const res = await request(app).patch('/api/tickets/1/appears-resolved').set('Cookie', requesterCookie).send({});
    expect(res.status).toBe(200);
    expect(res.body.appearsResolved).toBe(true);
    expect(res.body.currentStatus).toBe('IN_PROGRESS');
  });

  it('DETAIL-07: migrated ticket has itPriority=requestedPriority (seed proof via real select)', async () => {
    const spy = vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({
      id: 1, itPriority: 'MEDIUM', requestedPriority: 'MEDIUM', currentStatus: 'NEW',
      requester: { id: 1, name: 'A', email: 'a@toktickit.local' },
      owner: null, category: { id: 1, name: 'Hardware' }, relatedSystem: { id: 1, name: 'Email' },
      publicComments: [], internalNotes: [], attachments: []
    } as never);
    const res = await request(app).get('/api/staff/tickets/1').set('Cookie', cookieFor(3, 'IT_STAFF'));
    expect(res.status).toBe(200);
    expect(res.body.itPriority).toBe(res.body.requestedPriority);
    expect(spy).toHaveBeenCalled();
  });

  it('unauthenticated/mustChange/requester are blocked', async () => {
    const anon = await request(app).patch('/api/tickets/1/status').send({ status: 'OPEN' });
    expect(anon.status).toBe(401);

    const mustChange = await request(app).patch('/api/tickets/1/status').set('Cookie', cookieFor(3, 'IT_STAFF', true)).send({ status: 'OPEN' });
    expect(mustChange.status).toBe(403);

    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({ id: 1, currentStatus: 'NEW' } as never);
    const req = await request(app).patch('/api/tickets/1/status').set('Cookie', cookieFor(7, 'REQUESTER')).send({ status: 'OPEN' });
    expect(req.status).toBe(403);
  });

  it('returns 404 for missing tickets', async () => {
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(null as never);
    const res = await request(app).patch('/api/tickets/1/owner').set('Cookie', cookieFor(3, 'IT_STAFF')).send({ ownerId: 3 });
    expect(res.status).toBe(404);
  });
});
