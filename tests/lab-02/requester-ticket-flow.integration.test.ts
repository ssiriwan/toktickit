import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../server/src/app';
import { prisma } from '../../server/src/db';

const app = createApp();

describe('E2E Lab 2 — Requester Ticket Flows', () => {
  const tmpFiles: string[] = [];
  function tmpPath(name: string) {
    const p = path.join(process.cwd(), name);
    tmpFiles.push(p);
    return p;
  }

  beforeAll(async () => {
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
  });

  afterAll(async () => {
    const atts = await prisma.attachment.findMany({});
    for (const att of atts) {
      const fp = path.join(path.resolve('server/uploads'), att.storedFilename);
      if (fs.existsSync(fp)) try { fs.unlinkSync(fp); } catch {}
    }
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    for (const p of tmpFiles) if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  it('E2E-01: complete ticket creation flow — create and find in My Tickets', async () => {
    // Simulate selecting requester 1 and creating ticket
    const createRes = await request(app).post('/api/tickets').send({
      requesterId: 1,
      summary: 'E2E laptop issue',
      description: 'E2E description for creation flow',
      categoryId: 2,
      relatedSystemId: 7,
      requestedPriority: 'MEDIUM'
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.ticketNumber).toMatch(/^TK-/);
    const ticketId = createRes.body.id;

    // Verify appears in My Tickets for requester 1
    const listRes = await request(app).get('/api/tickets').query({ requesterId: 1, search: 'E2E laptop' });
    expect(listRes.status).toBe(200);
    expect(listRes.body.tickets.some((t: { id: number }) => t.id === ticketId)).toBe(true);

    // Verify detail
    const detailRes = await request(app).get(`/api/tickets/${ticketId}`).query({ requesterId: 1 });
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.summary).toBe('E2E laptop issue');
  });

  it('E2E-02: requester switching — data isolation', async () => {
    const r1 = await request(app).post('/api/tickets').send({
      requesterId: 1,
      summary: 'R1 isolation ticket',
      description: 'for r1',
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: 'LOW'
    });
    const r2 = await request(app).post('/api/tickets').send({
      requesterId: 2,
      summary: 'R2 isolation ticket',
      description: 'for r2',
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: 'LOW'
    });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);

    const listR1 = await request(app).get('/api/tickets').query({ requesterId: 1 });
    const listR2 = await request(app).get('/api/tickets').query({ requesterId: 2 });
    expect(listR1.body.tickets.some((t: { summary: string }) => t.summary === 'R1 isolation ticket')).toBe(true);
    expect(listR1.body.tickets.some((t: { summary: string }) => t.summary === 'R2 isolation ticket')).toBe(false);
    expect(listR2.body.tickets.some((t: { summary: string }) => t.summary === 'R2 isolation ticket')).toBe(true);
    expect(listR2.body.tickets.some((t: { summary: string }) => t.summary === 'R1 isolation ticket')).toBe(false);
  });

  it('E2E-03: attachment lifecycle — upload, view, soft-remove', async () => {
    const ticketRes = await request(app).post('/api/tickets').send({
      requesterId: 1,
      summary: 'E2E attachment ticket',
      description: 'with attachment',
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: 'HIGH'
    });
    const ticketId = ticketRes.body.id;

    const filePath = tmpPath('tmp-e2e-attach.png');
    fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .query({ requesterId: 1 })
      .attach('file', filePath);
    expect(uploadRes.status).toBe(201);
    const attId = uploadRes.body.id;

    const detailRes = await request(app).get(`/api/tickets/${ticketId}`).query({ requesterId: 1 });
    expect(detailRes.body.attachments.some((a: { id: number }) => a.id === attId)).toBe(true);

    const removeRes = await request(app)
      .patch(`/api/attachments/${attId}/remove`)
      .query({ requesterId: 1 })
      .send({ reason: 'no longer needed' });
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);

    const dlRes = await request(app).get(`/api/attachments/${attId}/download`).query({ requesterId: 1 });
    expect(dlRes.status).toBe(410);
    expect(dlRes.body.error.code).toBe('REMOVED');
  });

  it('E2E-04: cross-requester access prevention', async () => {
    const ticketRes = await request(app).post('/api/tickets').send({
      requesterId: 1,
      summary: 'E2E cross ticket',
      description: 'cross check',
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: 'LOW'
    });
    const ticketId = ticketRes.body.id;

    const crossRes = await request(app).get(`/api/tickets/${ticketId}`).query({ requesterId: 2 });
    expect(crossRes.status).toBe(403);
    expect(crossRes.body.error.code).toBe('ACCESS_DENIED');

    const filePath = tmpPath('tmp-e2e-cross.png');
    fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .query({ requesterId: 1 })
      .attach('file', filePath);
    const attId = uploadRes.body.id;
    const crossDl = await request(app).get(`/api/attachments/${attId}/download`).query({ requesterId: 2 });
    expect(crossDl.status).toBe(403);
  });
});