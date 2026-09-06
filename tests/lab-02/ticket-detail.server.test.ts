import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../server/src/app';
import { prisma } from '../../server/src/db';

const app = createApp();

describe('TokTickIT API GET /api/tickets/:id', () => {
  let ticketId: number;
  let otherTicketId: number;

  beforeAll(async () => {
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    const t1 = await prisma.ticket.create({
      data: {
        ticketNumber: `TK-TEST-DETAIL1`,
        summary: 'Detail test ticket',
        description: 'detail description',
        currentStatus: 'NEW',
        requestedPriority: 'MEDIUM',
        ticketDate: new Date(),
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 1
      }
    });
    const t2 = await prisma.ticket.create({
      data: {
        ticketNumber: `TK-TEST-DETAIL2`,
        summary: 'Other requester ticket',
        description: 'other',
        currentStatus: 'NEW',
        requestedPriority: 'LOW',
        ticketDate: new Date(),
        requesterId: 2,
        categoryId: 1,
        relatedSystemId: 1
      }
    });
    ticketId = t1.id;
    otherTicketId = t2.id;
  });

  afterAll(async () => {
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
  });

  it('returns owned ticket with attachments', async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}`).query({ requesterId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.ticketNumber).toMatch(/^TK-/);
    expect(res.body.attachments).toBeDefined();
  });

  it('rejects cross-requester access with 403', async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}`).query({ requesterId: 2 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('returns 404 for non-existent ticket', async () => {
    const res = await request(app).get('/api/tickets/999999').query({ requesterId: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 when requesterId missing', async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}`);
    expect(res.status).toBe(400);
  });
});