import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { signSession } from '../../src/auth.js';
import { prisma } from '../../src/db.js';

const app = createApp();
type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

interface MockUser {
  id: number;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

const STAFF: MockUser = { id: 3, role: 'IT_STAFF', isActive: true, mustChangePassword: false };
const ADMIN: MockUser = { id: 5, role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false };
const OWNER: MockUser = { id: 7, role: 'REQUESTER', isActive: true, mustChangePassword: false };
const STRANGER: MockUser = { id: 8, role: 'REQUESTER', isActive: true, mustChangePassword: false };
const INACTIVE_STAFF: MockUser = { id: 9, role: 'IT_STAFF', isActive: false, mustChangePassword: false };

/** requireAuth loads the caller from DB — serve per-id rows. */
function mockUsers(extra: Record<number, MockUser> = {}) {
  const rows: Record<number, MockUser> = {
    [STAFF.id]: STAFF,
    [ADMIN.id]: ADMIN,
    [OWNER.id]: OWNER,
    [STRANGER.id]: STRANGER,
    [INACTIVE_STAFF.id]: INACTIVE_STAFF,
    ...extra
  };
  vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: never) => {
    const id = (args as { where: { id: number } }).where.id;
    return (rows[id] ?? null) as never;
  });
}

function cookieFor(id: number, role: Role) {
  return `toktickit_session=${signSession(id, role)}`;
}

function mockTicket(ticket: object | null = { id: 1, requesterId: 7 }) {
  vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(ticket as never);
}

/** prisma.actionTaken does not exist until the Lab 4 migration — stub it per test. */
function mockActions(stubs: Record<string, unknown> = {}) {
  const m = {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    ...(stubs as object)
  };
  (prisma as unknown as Record<string, unknown>).actionTaken = m;
  return m as {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

describe('Lab 4 actions taken foundation (ACT-01..12)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (prisma as unknown as Record<string, unknown>).actionTaken;
  });

  it('ACT-01: staff creates action with defaults (self performer, PENDING, now)', async () => {
    mockUsers();
    mockTicket();
    const created = {
      id: 11, ticketId: 1, actionDateTime: new Date().toISOString(),
      description: 'Replaced faulty RAM stick', result: null, status: 'PENDING',
      performedBy: { id: 3, name: 'IT Alice', role: 'IT_STAFF' },
      followUpRequired: false, followUpNote: null, attachmentNotes: null
    };
    const actions = mockActions({ create: vi.fn().mockResolvedValue(created) });

    const res = await request(app)
      .post('/api/staff/tickets/1/actions')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ description: 'Replaced faulty RAM stick' });

    expect(res.status).toBe(201);
    expect(res.body.ticketId).toBe(1);
    expect(res.body.performedBy.id).toBe(3);
    expect(res.body.status).toBe('PENDING');
    expect(actions.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ ticketId: 1, performedById: 3, status: 'PENDING' })
    }));
  });

  it('ACT-02: staff lists actions asc with performer object', async () => {
    mockUsers();
    mockTicket();
    const rows = [
      { id: 11, ticketId: 1, actionDateTime: '2026-09-20T10:00:00.000Z', description: 'First', status: 'COMPLETED', performedBy: { id: 3, name: 'IT Alice', role: 'IT_STAFF' } },
      { id: 12, ticketId: 1, actionDateTime: '2026-09-21T10:00:00.000Z', description: 'Second', status: 'PENDING', performedBy: { id: 5, name: 'Admin One', role: 'ADMINISTRATOR' } }
    ];
    const actions = mockActions({ findMany: vi.fn().mockResolvedValue(rows) });

    const res = await request(app).get('/api/staff/tickets/1/actions').set('Cookie', cookieFor(3, 'IT_STAFF'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
    expect(actions.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ticketId: 1 },
      orderBy: { actionDateTime: 'asc' }
    }));
  });

  it('ACT-03: assigning an inactive staffer is rejected (400 INACTIVE_ASSIGNEE)', async () => {
    mockUsers();
    mockTicket();
    mockActions();

    const res = await request(app)
      .post('/api/staff/tickets/1/actions')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ description: 'Inspect socket', performedById: 9 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INACTIVE_ASSIGNEE');
  });

  it('ACT-04: followUpRequired=true without note is rejected', async () => {
    mockUsers();
    mockTicket();
    mockActions();

    const res = await request(app)
      .post('/api/staff/tickets/1/actions')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ description: 'Inspect socket', followUpRequired: true });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'followUpNote' })])
    );
  });

  it('ACT-05: followUpRequired=false accepts null note', async () => {
    mockUsers();
    mockTicket();
    const actions = mockActions({
      create: vi.fn().mockImplementation(async (args: never) => ({
        id: 13, followUpRequired: false, followUpNote: null,
        ...(args as { data: object }).data
      }))
    });

    const res = await request(app)
      .post('/api/staff/tickets/1/actions')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ description: 'Routine check', followUpRequired: false, followUpNote: null });

    expect(res.status).toBe(201);
    expect(actions.create).toHaveBeenCalled();
  });

  it('ACT-06: requester create/update on actions is forbidden (403)', async () => {
    mockUsers();
    mockTicket();
    mockActions();

    const post = await request(app)
      .post('/api/staff/tickets/1/actions')
      .set('Cookie', cookieFor(7, 'REQUESTER'))
      .send({ description: 'Sneaky write' });
    expect(post.status).toBe(403);

    const patch = await request(app)
      .patch('/api/staff/tickets/1/actions/11')
      .set('Cookie', cookieFor(7, 'REQUESTER'))
      .send({ status: 'COMPLETED', result: 'done' });
    expect(patch.status).toBe(403);
  });

  it('ACT-07: requester reading another owner ticket is forbidden (403)', async () => {
    mockUsers();
    mockTicket({ id: 1, requesterId: 7 });
    mockActions();

    const res = await request(app)
      .get('/api/tickets/1/actions')
      .set('Cookie', cookieFor(8, 'REQUESTER'));

    expect(res.status).toBe(403);
  });

  it('ACT-08: owner requester reads own actions (200 read-only array)', async () => {
    mockUsers();
    mockTicket({ id: 1, requesterId: 7 });
    const rows = [
      { id: 11, ticketId: 1, description: 'Replaced RAM', status: 'COMPLETED', performedBy: { id: 3, name: 'IT Alice', role: 'IT_STAFF' } }
    ];
    mockActions({ findMany: vi.fn().mockResolvedValue(rows) });

    const res = await request(app)
      .get('/api/tickets/1/actions')
      .set('Cookie', cookieFor(7, 'REQUESTER'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
  });

  it('ACT-09: PATCH action to COMPLETED with result succeeds', async () => {
    mockUsers();
    mockTicket();
    const actions = mockActions({
      findFirst: vi.fn().mockResolvedValue({ id: 11, ticketId: 1, status: 'IN_PROGRESS', result: null }),
      update: vi.fn().mockImplementation(async (args: never) => ({
        id: 11, ticketId: 1, ...(args as { data: object }).data
      }))
    });

    const res = await request(app)
      .patch('/api/staff/tickets/1/actions/11')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ status: 'COMPLETED', result: 'Memory test passed 100%' });

    expect(res.status).toBe(200);
    expect(actions.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'COMPLETED', result: 'Memory test passed 100%' })
    }));
  });

  it('ACT-10: PATCH to COMPLETED without result is rejected', async () => {
    mockUsers();
    mockTicket();
    mockActions({
      findFirst: vi.fn().mockResolvedValue({ id: 11, ticketId: 1, status: 'IN_PROGRESS', result: null })
    });

    const res = await request(app)
      .patch('/api/staff/tickets/1/actions/11')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'result' })])
    );
  });

  it('ACT-11: blank or over-2000 description is rejected', async () => {
    mockUsers();
    mockTicket();
    mockActions();

    const blank = await request(app)
      .post('/api/staff/tickets/1/actions')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ description: '   ' });
    expect(blank.status).toBe(400);

    const long = await request(app)
      .post('/api/staff/tickets/1/actions')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ description: 'x'.repeat(2001) });
    expect(long.status).toBe(400);
  });

  it('ACT-12: invalid ISO or >24h-future actionDateTime is rejected (BR-29)', async () => {
    mockUsers();
    mockTicket();
    mockActions();

    const invalid = await request(app)
      .post('/api/staff/tickets/1/actions')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ description: 'Check', actionDateTime: 'not-a-date' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'actionDateTime' })])
    );

    const future = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const farFuture = await request(app)
      .post('/api/staff/tickets/1/actions')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ description: 'Check', actionDateTime: future });
    expect(farFuture.status).toBe(400);
  });
});
