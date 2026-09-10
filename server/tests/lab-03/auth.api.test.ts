import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { hashPassword, signSession } from '../../src/auth.js';
import { prisma } from '../../src/db.js';

const app = createApp();

const ACTIVE_USER = {
  id: 1,
  name: 'Requester One',
  email: 'requester1@toktickit.local',
  role: 'REQUESTER',
  isActive: true,
  mustChangePassword: false
} as const;

async function userWithPassword(password: string, overrides = {}) {
  return {
    ...ACTIVE_USER,
    ...overrides,
    passwordHash: await hashPassword(password)
  };
}

describe('Lab 3 auth APIs (API-01..07)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('API-01: valid login returns safe user and sets session cookie', async () => {
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(
      (await userWithPassword('Requester123!')) as never
    );

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'requester1@toktickit.local', password: 'Requester123!' });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(ACTIVE_USER);
    expect(response.body.user).not.toHaveProperty('passwordHash');
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(';')).toContain('toktickit_session=');
    expect(cookies.join(';')).toContain('HttpOnly');
  });

  it('API-02: wrong password or unknown email returns generic 401', async () => {
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(
      (await userWithPassword('Requester123!')) as never
    );
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: 'requester1@toktickit.local', password: 'Wrong123!' });
    expect(wrong.status).toBe(401);
    expect(wrong.body).toEqual({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    });

    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null as never);
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@toktickit.local', password: 'Whatever123!' });
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('API-03: correct credentials but inactive returns 403 with support message', async () => {
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(
      (await userWithPassword('Requester123!', { isActive: false })) as never
    );

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'requester1@toktickit.local', password: 'Requester123!' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: 'ACCOUNT_INACTIVE',
        message: 'Account is deactivated. Please contact support.'
      }
    });
  });

  it('API-04: mustChange users are blocked from normal APIs over HTTP', async () => {
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(
      (await userWithPassword('Requester123!', { mustChangePassword: true })) as never
    );
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 1,
      role: 'REQUESTER',
      isActive: true,
      mustChangePassword: true
    } as never);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'requester1@toktickit.local', password: 'Requester123!' });
    expect(login.status).toBe(200);
    expect(login.body.user.mustChangePassword).toBe(true);
    const cookie = (login.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

    // Allowlisted route still works while mustChange is pending.
    const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);

    // Normal API is blocked per spec middleware order.
    const blocked = await request(app).get('/api/requesters').set('Cookie', cookie);
    expect(blocked.status).toBe(403);
    expect(blocked.body).toEqual({
      error: {
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Password change required before continuing'
      }
    });
  });

  it('API-05: change password happy path clears mustChange flag', async () => {
    const token = signSession(1, 'REQUESTER');
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(
      (await userWithPassword('Requester123!', { mustChangePassword: true })) as never
    );
    vi.spyOn(prisma.user, 'update').mockImplementation(async (args: never) => {
      const data = (args as { data: { passwordHash: string } }).data;
      expect(data.passwordHash).not.toContain('Newpass123!');
      return { ...ACTIVE_USER, mustChangePassword: false } as never;
    });

    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', `toktickit_session=${token}`)
      .send({
        currentPassword: 'Requester123!',
        newPassword: 'Newpass123!',
        confirmPassword: 'Newpass123!'
      });

    expect(response.status).toBe(200);
    expect(response.body.user.mustChangePassword).toBe(false);
  });

  it('API-06: change password boundaries are rejected', async () => {
    const token = signSession(1, 'REQUESTER');
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(
      (await userWithPassword('Requester123!', { mustChangePassword: true })) as never
    );

    const cases = [
      { currentPassword: '', newPassword: 'Newpass123!', confirmPassword: 'Newpass123!' },
      { currentPassword: 'Requester123!', newPassword: 'short1!', confirmPassword: 'short1!' },
      { currentPassword: 'Requester123!', newPassword: 'Newpass123!', confirmPassword: 'Mismatch123!' },
      { currentPassword: 'Requester123!', newPassword: 'Requester123!', confirmPassword: 'Requester123!' }
    ];
    for (const body of cases) {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Cookie', `toktickit_session=${token}`)
        .send(body);
      expect([400, 401].includes(res.status)).toBe(true);
    }

    const wrongCurrent = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', `toktickit_session=${token}`)
      .send({
        currentPassword: 'Wrong123!',
        newPassword: 'Newpass123!',
        confirmPassword: 'Newpass123!'
      });
    expect(wrongCurrent.status).toBe(401);
  });

  it('API-07: me and logout lifecycle', async () => {
    const token = signSession(1, 'REQUESTER');
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(
      (await userWithPassword('Requester123!')) as never
    );

    const me = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `toktickit_session=${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user).toEqual(ACTIVE_USER);

    const anon = await request(app).get('/api/auth/me');
    expect(anon.status).toBe(401);

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', `toktickit_session=${token}`);
    expect(logout.status).toBe(204);
    const cleared = logout.headers['set-cookie'] as unknown as string[];
    expect(cleared.join(';')).toContain('toktickit_session=;');
  });

  it('rejects missing email/password with field details', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '', password: '' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
