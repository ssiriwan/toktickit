import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../server/src/app';

describe('TokTickIT API category list', () => {
  it('returns the seeded categories with id and name in order', async () => {
    const response = await request(createApp()).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 1, name: 'Account and Access' },
      { id: 2, name: 'Hardware' },
      { id: 3, name: 'Software' },
      { id: 4, name: 'Network' }
    ]);
  });
});
