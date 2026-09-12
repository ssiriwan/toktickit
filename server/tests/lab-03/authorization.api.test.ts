import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { signSession } from '../../src/auth.js';
import { prisma } from '../../src/db.js';

const app = createApp();

function cookieFor(
  id: number,
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR',
  mustChangePassword = false
) {
  vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
    id,
    role,
    isActive: true,
    mustChangePassword
  } as never);
  return `toktickit_session=${signSession(id, role)}`;
}

describe('Lab 3 authorization (AUTHZ-01/02/05/06)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('AUTHZ-01: forged requesterId is ignored, session identity applies', async () => {
    const cookie = cookieFor(7, 'REQUESTER');
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({ id: 7 } as never);
    vi.spyOn(prisma.category, 'findFirst').mockResolvedValue({ id: 1 } as never);
    vi.spyOn(prisma.relatedSystem, 'findFirst').mockResolvedValue({ id: 1 } as never);
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(0 as never);
    const createSpy = vi.spyOn(prisma.ticket, 'create').mockResolvedValue({
      id: 1,
      ticketNumber: 'TK-20260910-9999',
      requesterId: 7
    } as never);

    const res = await request(app)
      .post('/api/tickets')
      .set('Cookie', cookie)
      .send({
        requesterId: 999,
        summary: 'Forged owner attempt',
        description: 'Body tries to act as another requester.',
        requestedPriority: 'MEDIUM',
        categoryId: 1,
        relatedSystemId: 1
      });

    expect(res.status).toBe(201);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requesterId: 7 })
      })
    );
  });

  it('AUTHZ-01: forged requesterId query does not leak other tickets', async () => {
    const cookie = cookieFor(7, 'REQUESTER');
    vi.spyOn(prisma.ticket, 'count').mockResolvedValue(0 as never);
    const findSpy = vi.spyOn(prisma.ticket, 'findMany').mockResolvedValue([] as never);

    const res = await request(app)
      .get('/api/tickets?requesterId=999')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ requesterId: 7 })
      })
    );
  });

  it('AUTHZ-02: requester cannot access internal notes (no content leak)', async () => {
    const cookie = cookieFor(7, 'REQUESTER');

    const getRes = await request(app)
      .get('/api/tickets/1/notes')
      .set('Cookie', cookie);
    expect(getRes.status).toBe(403);
    expect(JSON.stringify(getRes.body)).not.toContain('secret');

    const postRes = await request(app)
      .post('/api/tickets/1/notes')
      .set('Cookie', cookie)
      .send({ body: 'trying to write a note' });
    expect(postRes.status).toBe(403);
  });

  it('AUTHZ-05: unauthenticated access is rejected without data', async () => {
    for (const [method, url] of [
      ['get', '/api/tickets'],
      ['get', '/api/tickets/1'],
      ['get', '/api/tickets/1/comments'],
      ['get', '/api/auth/me']
    ] as const) {
      const res = await (request(app)[method] as (u: string) => Promise<{ status: number; body: unknown }>)(
        url
      );
      expect(res.status).toBe(401);
    }
  });

  it('AUTHZ-06: legacy X-Requester-Id header alone grants nothing', async () => {
    const res = await request(app)
      .get('/api/tickets')
      .set('X-Requester-Id', '7');
    expect(res.status).toBe(401);
  });
});
