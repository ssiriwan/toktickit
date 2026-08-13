import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../server/src/app';

describe('TokTickIT API health check', () => {
  it('returns HTTP 200 with status ok for GET /api/health', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'TokTickIT API'
    });
  });
});
