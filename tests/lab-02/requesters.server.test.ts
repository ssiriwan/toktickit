import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '../../server/src/db';
import { createApp } from '../../server/src/app';

const app = createApp();

describe('TokTickIT API /api/requesters', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns only active requesters', async () => {
    const activeRequesters = [
      { id: 1, name: 'Alice Carter', email: 'alice.carter@student.example' },
      { id: 2, name: 'Bob Nguyen', email: 'bob.nguyen@student.example' }
    ];
    vi.spyOn(prisma.requesterUser, 'findMany').mockResolvedValue(
      activeRequesters as never
    );

    const response = await request(app).get('/api/requesters');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(activeRequesters);
  });

  it('returns an empty array when there are no active requesters', async () => {
    vi.spyOn(prisma.requesterUser, 'findMany').mockResolvedValue([] as never);

    const response = await request(app).get('/api/requesters');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns 500 with a safe error message on DB failure', async () => {
    vi.spyOn(prisma.requesterUser, 'findMany').mockRejectedValue(
      new Error('connection refused')
    );

    const response = await request(app).get('/api/requesters');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load requesters' }
    });
  });
});