import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { signSession } from '../../src/auth.js';
import { prisma } from '../../src/db.js';

const app = createApp();
type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

function adminCookie(id: number) {
  return `toktickit_session=${signSession(id, 'ADMINISTRATOR')}`;
}

function cookieFor(id: number, role: Role, mustChange = false) {
  vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
    id, role, isActive: true, mustChangePassword: mustChange
  } as never);
  return `toktickit_session=${signSession(id, role)}`;
}

/** findUnique serves both requireAuth and target lookups — branch per id. */
function mockUsersById(records: Record<number, unknown>) {
  vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: never) => {
    const id = (args as { where: { id: number } }).where.id;
    return (records[id] ?? null) as never;
  });
}

const adminAuth = { id: 5, role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false };

describe('Lab 3 admin user management (ADMIN-01..07)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ADMIN-01: list ordered by name; search matches name/email; role filter; invalid role 400', async () => {
    mockUsersById({ 5: adminAuth });
    const users = [
      { id: 5, name: 'Admin One', email: 'admin1@toktickit.local', role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false, createdAt: '2026-09-10T00:00:00.000Z' }
    ];
    const findSpy = vi.spyOn(prisma.user, 'findMany').mockResolvedValue(users as never);

    const list = await request(app).get('/api/admin/users').set('Cookie', adminCookie(5));
    expect(list.status).toBe(200);
    expect(list.body).toEqual({ users });
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'asc' } })
    );

    await request(app).get('/api/admin/users?search=admin1').set('Cookie', adminCookie(5));
    expect(findSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: 'admin1', mode: 'insensitive' } },
            { email: { contains: 'admin1', mode: 'insensitive' } }
          ]
        })
      })
    );

    await request(app).get('/api/admin/users?role=IT_STAFF').set('Cookie', adminCookie(5));
    expect(findSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ role: 'IT_STAFF' }) })
    );

    const bad = await request(app).get('/api/admin/users?role=SUPERUSER').set('Cookie', adminCookie(5));
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INVALID_QUERY');
  });

  it('ADMIN-02: create returns 201 with mustChangePassword, no hash leaked', async () => {
    mockUsersById({ 5: adminAuth });
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);
    const createSpy = vi.spyOn(prisma.user, 'create').mockImplementation(async (args: never) => {
      const data = (args as { data: Record<string, unknown> }).data;
      return { id: 20, ...data, createdAt: new Date('2026-09-10T00:00:00.000Z') } as never;
    });

    const res = await request(app).post('/api/admin/users').set('Cookie', adminCookie(5)).send({
      name: 'New Hire', email: 'New.Hire@toktickit.local', role: 'IT_STAFF', isActive: true, initialPassword: 'Itstaff123!'
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'New Hire', email: 'new.hire@toktickit.local', role: 'IT_STAFF', mustChangePassword: true });
    expect(res.body).not.toHaveProperty('passwordHash');
    const saved = createSpy.mock.calls[0][0] as unknown as { data: { passwordHash: string; email: string } };
    expect(saved.data.email).toBe('new.hire@toktickit.local');
    expect(saved.data.passwordHash).not.toBe('Itstaff123!');
  });

  it('ADMIN-03: duplicate email (case-insensitive) 409 with field details; invalid role/email/password 400', async () => {
    mockUsersById({ 5: adminAuth });
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({ id: 7, email: 'requester1@toktickit.local' } as never);

    const dup = await request(app).post('/api/admin/users').set('Cookie', adminCookie(5)).send({
      name: 'Clone', email: 'Requester1@TokTickIT.local', role: 'REQUESTER', isActive: true, initialPassword: 'Requester123!'
    });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_EMAIL');
    expect(dup.body.error.details).toEqual([{ field: 'email', message: expect.any(String) }]);

    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);
    const badRole = await request(app).post('/api/admin/users').set('Cookie', adminCookie(5)).send({
      name: 'X', email: 'x@toktickit.local', role: 'SUPERUSER', isActive: true, initialPassword: 'Requester123!'
    });
    expect(badRole.status).toBe(400);

    const badEmail = await request(app).post('/api/admin/users').set('Cookie', adminCookie(5)).send({
      name: 'X', email: 'not-an-email', role: 'REQUESTER', isActive: true, initialPassword: 'Requester123!'
    });
    expect(badEmail.status).toBe(400);

    const weak = await request(app).post('/api/admin/users').set('Cookie', adminCookie(5)).send({
      name: 'X', email: 'x@toktickit.local', role: 'REQUESTER', isActive: true, initialPassword: 'weak'
    });
    expect(weak.status).toBe(400);
  });

  it('ADMIN-04: edit name/email/role/active persists 200; unknown id 404', async () => {
    const target = { id: 7, name: 'Req One', email: 'requester1@toktickit.local', role: 'REQUESTER', isActive: true, mustChangePassword: false };
    mockUsersById({ 5: adminAuth, 7: target });
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'count').mockResolvedValue(2 as never);
    const updateSpy = vi.spyOn(prisma.user, 'update').mockImplementation(async (args: never) => {
      const a = args as { where: { id: number }; data: Record<string, unknown> };
      return { ...target, ...a.data } as never;
    });

    const res = await request(app).patch('/api/admin/users/7').set('Cookie', adminCookie(5)).send({ name: 'Req Uno', isActive: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 7, name: 'Req Uno' });
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));

    const missing = await request(app).patch('/api/admin/users/999').set('Cookie', adminCookie(5)).send({ name: 'Ghost' });
    expect(missing.status).toBe(404);
  });

  it('ADMIN-05: self-deactivate blocked 403 SELF_DEACTIVATION', async () => {
    mockUsersById({ 5: adminAuth });
    const updateSpy = vi.spyOn(prisma.user, 'update');

    const res = await request(app).patch('/api/admin/users/5').set('Cookie', adminCookie(5)).send({ isActive: false });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SELF_DEACTIVATION');
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('ADMIN-06: demoting/deactivating the last active admin blocked 409 LAST_ADMIN', async () => {
    const lastAdmin = { id: 5, name: 'Admin One', email: 'admin1@toktickit.local', role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false };
    mockUsersById({ 6: { id: 6, role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false }, 5: lastAdmin });
    vi.spyOn(prisma.user, 'count').mockResolvedValue(0 as never);
    const updateSpy = vi.spyOn(prisma.user, 'update');

    const otherCookie = `toktickit_session=${signSession(6, 'ADMINISTRATOR')}`;
    const deactivate = await request(app).patch('/api/admin/users/5').set('Cookie', otherCookie).send({ isActive: false });
    expect(deactivate.status).toBe(409);
    expect(deactivate.body.error.code).toBe('LAST_ADMIN');

    const demote = await request(app).patch('/api/admin/users/5').set('Cookie', otherCookie).send({ role: 'IT_STAFF' });
    expect(demote.status).toBe(409);
    expect(demote.body.error.code).toBe('LAST_ADMIN');
    expect(updateSpy).not.toHaveBeenCalled();

    // Non-last admin can be deactivated (one other active admin remains).
    vi.spyOn(prisma.user, 'count').mockResolvedValue(1 as never);
    vi.spyOn(prisma.user, 'update').mockResolvedValue({ ...lastAdmin, isActive: false } as never);
    const ok = await request(app).patch('/api/admin/users/5').set('Cookie', otherCookie).send({ isActive: false });
    expect(ok.status).toBe(200);
  });

  it('ADMIN-07: reset sets initial password + mustChange, weak password 400, unknown 404', async () => {
    const target = { id: 7, name: 'Req One', email: 'requester1@toktickit.local', role: 'REQUESTER', isActive: true, mustChangePassword: false };
    mockUsersById({ 5: adminAuth, 7: target });
    const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({ ...target, mustChangePassword: true } as never);

    const res = await request(app).post('/api/admin/users/7/reset-password').set('Cookie', adminCookie(5)).send({ initialPassword: 'BrandNew123!' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 7, mustChangePassword: true });
    const saved = updateSpy.mock.calls[0][0] as unknown as { data: { passwordHash: string; mustChangePassword: boolean } };
    expect(saved.data.mustChangePassword).toBe(true);
    expect(saved.data.passwordHash).not.toBe('BrandNew123!');

    const weak = await request(app).post('/api/admin/users/7/reset-password').set('Cookie', adminCookie(5)).send({ initialPassword: 'weak' });
    expect(weak.status).toBe(400);

    const missing = await request(app).post('/api/admin/users/999/reset-password').set('Cookie', adminCookie(5)).send({ initialPassword: 'BrandNew123!' });
    expect(missing.status).toBe(404);
  });

  it('guards: unauthenticated 401, must-change 403, non-admin 403, no user data leaked', async () => {
    const anon = await request(app).get('/api/admin/users');
    expect(anon.status).toBe(401);

    const stale = await request(app).get('/api/admin/users').set('Cookie', cookieFor(5, 'ADMINISTRATOR', true));
    expect(stale.status).toBe(403);
    expect(stale.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

    const it = await request(app).get('/api/admin/users').set('Cookie', cookieFor(3, 'IT_STAFF'));
    expect(it.status).toBe(403);

    const req = await request(app).post('/api/admin/users').set('Cookie', cookieFor(7, 'REQUESTER')).send({});
    expect(req.status).toBe(403);
    expect(req.body).toEqual({ error: expect.objectContaining({ code: 'FORBIDDEN' }) });
  });
});
