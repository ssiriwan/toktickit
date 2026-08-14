import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../server/src/app';

describe('TokTickIT backend foundation', () => {
  it('starts the Express app and returns JSON for unknown routes', async () => {
    const response = await request(createApp()).get('/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Route not found' });
  });
});
