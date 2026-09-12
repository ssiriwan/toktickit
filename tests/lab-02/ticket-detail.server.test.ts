import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../server/src/app';
import { prisma } from '../../server/src/db';
import { cleanupTestUsers, loginAs, type TestSession } from './session.helper';

const app = createApp();

describe('TokTickIT API GET /api/tickets/:id', () => {
  let ticketId: number;
  let otherTicketId: number;
  let sessionA: TestSession;
  let sessionB: TestSession;

  beforeAll(async () => {
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    sessionA = await loginAs('detail-a');
    sessionB = await loginAs('detail-b');
    const t1 = await prisma.ticket.create({
      data: {
        ticketNumber: `TK-TEST-DETAIL1`,
        summary: 'Detail test ticket',
        description: 'detail description',
        currentStatus: 'NEW',
        requestedPriority: 'MEDIUM',
        ticketDate: new Date(),
        requesterId: sessionA.userId,
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
        requesterId: sessionB.userId,
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
    await cleanupTestUsers();
  });

  it('returns owned ticket with attachments', async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}`).set('Cookie', sessionA.cookie);
    expect(res.status).toBe(200);
    expect(res.body.ticketNumber).toMatch(/^TK-/);
    expect(res.body.attachments).toBeDefined();
  });

  it('rejects cross-requester access with 403', async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}`).set('Cookie', sessionB.cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('returns 404 for non-existent ticket', async () => {
    const res = await request(app).get('/api/tickets/999999').set('Cookie', sessionA.cookie);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 without session', async () => {
    const res = await request(app).get(`/api/tickets/${ticketId}`);
    expect(res.status).toBe(401);
  });

  it('other ticket is visible to its own owner', async () => {
    const res = await request(app).get(`/api/tickets/${otherTicketId}`).set('Cookie', sessionB.cookie);
    expect(res.status).toBe(200);
  });
});
