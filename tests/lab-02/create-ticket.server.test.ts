import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { createApp } from '../../server/src/app';
import { prisma } from '../../server/src/db';

const app = createApp();

const validPayload = {
  requesterId: 1,
  summary: 'Laptop battery drains quickly',
  description: 'The laptop battery only lasts about 2 hours even with minimal usage.',
  categoryId: 2,
  relatedSystemId: 7,
  requestedPriority: 'MEDIUM'
};

describe('TokTickIT API POST /api/tickets', () => {
  afterAll(async () => {
    await prisma.ticket.deleteMany({});
    await prisma.$disconnect();
  });

  it('creates a valid ticket with number, status NEW, and correct requester', async () => {
    const response = await request(app).post('/api/tickets').send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.ticketNumber).toMatch(/^TK-\d{8}-\d{4}$/);
    expect(response.body.currentStatus).toBe('NEW');
    expect(response.body.summary).toBe(validPayload.summary);
    expect(response.body.requester).toEqual({ id: 1, name: 'Alice Carter' });
    expect(response.body.category).toEqual({ id: 2, name: 'Hardware' });
    expect(response.body.relatedSystem).toEqual({
      id: 7,
      name: 'Corporate Laptop'
    });
  });

  it('rejects a missing summary with a field-level error', async () => {
    const response = await request(app).post('/api/tickets').send({
      ...validPayload,
      summary: ''
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'summary', message: expect.any(String) })
      ])
    );
  });

  it('rejects an empty description with a field-level error', async () => {
    const response = await request(app).post('/api/tickets').send({
      ...validPayload,
      description: '   '
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'description',
          message: expect.any(String)
        })
      ])
    );
  });

  it('rejects an invalid categoryId', async () => {
    const response = await request(app).post('/api/tickets').send({
      ...validPayload,
      categoryId: 9999
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'categoryId',
          message: expect.any(String)
        })
      ])
    );
  });

  it('rejects an invalid relatedSystemId', async () => {
    const response = await request(app).post('/api/tickets').send({
      ...validPayload,
      relatedSystemId: 9999
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'relatedSystemId',
          message: expect.any(String)
        })
      ])
    );
  });

  it('rejects an invalid priority', async () => {
    const response = await request(app).post('/api/tickets').send({
      ...validPayload,
      requestedPriority: 'CRITICAL'
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'requestedPriority',
          message: expect.any(String)
        })
      ])
    );
  });

  it('rejects an inactive requester with 404', async () => {
    const response = await request(app).post('/api/tickets').send({
      ...validPayload,
      requesterId: 5
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('trims whitespace from the summary before saving', async () => {
    const response = await request(app).post('/api/tickets').send({
      ...validPayload,
      summary: '  Need logins reset  '
    });

    expect(response.status).toBe(201);
    expect(response.body.summary).toBe('Need logins reset');
  });

  it('issues unique ticket numbers for two tickets', async () => {
    await request(app).post('/api/tickets').send(validPayload);
    const second = await request(app).post('/api/tickets').send(validPayload);

    expect(second.status).toBe(201);
    expect(second.body.ticketNumber).toMatch(/^TK-\d{8}-\d{4}$/);
  });

  it('new ticket has currentStatus NEW', async () => {
    const response = await request(app).post('/api/tickets').send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.currentStatus).toBe('NEW');
  });
});