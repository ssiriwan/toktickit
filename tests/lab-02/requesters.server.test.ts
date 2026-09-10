import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { signSession } from '../../server/src/auth';
import { prisma } from '../../server/src/db';
import { createApp } from '../../server/src/app';

const app = createApp();

// Lab 3: endpoint now behind requireAuth (deprecated, removed in Phase 4).
function mockSession() {
  vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
    id: 99,
    role: 'IT_STAFF',
    isActive: true,
    mustChangePassword: false
  } as never);
  return `toktickit_session=${signSession(99, 'IT_STAFF')}`;
}

describe('TokTickIT API /api/requesters', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns only active requesters', async () => {
    const activeRequesters = [
      { id: 1, name: 'Alice Carter', email: 'alice.carter@student.example' },
      { id: 2, name: 'Bob Nguyen', email: 'bob.nguyen@student.example' }
    ];
    const spy = vi.spyOn(prisma.user, 'findMany').mockResolvedValue(
      activeRequesters as never
    );

    const response = await request(app)
      .get('/api/requesters')
      .set('Cookie', mockSession());

    expect(response.status).toBe(200);
    expect(response.body).toEqual(activeRequesters);
    expect(spy).toHaveBeenCalledWith({
      where: { isActive: true, role: 'REQUESTER' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true }
    });
  });

  it('returns an empty array when there are no active requesters', async () => {
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([] as never);

    const response = await request(app)
      .get('/api/requesters')
      .set('Cookie', mockSession());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns 500 with a safe error message on DB failure', async () => {
    vi.spyOn(prisma.user, 'findMany').mockRejectedValue(
      new Error('connection refused')
    );

    const response = await request(app)
      .get('/api/requesters')
      .set('Cookie', mockSession());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load requesters' }
    });
  });
});