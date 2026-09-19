import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../server/src/app';
import { prisma } from '../../server/src/db';
import { uploadsDir } from '../../server/src/uploads';
import { cleanupTestUsers, loginAs, type TestSession } from './session.helper';

const app = createApp();

describe('TokTickIT API Attachments', () => {
  let ticketId: number;
  let sessionA: TestSession;
  let sessionB: TestSession;
  const tmpFiles: string[] = [];

  function tmpPath(name: string) {
    const p = path.join(process.cwd(), name);
    tmpFiles.push(p);
    return p;
  }

  function upload(filePath: string, cookie: string) {
    return request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set('Cookie', cookie)
      .attach('file', filePath);
  }

  beforeAll(async () => {
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    sessionA = await loginAs('attach-a');
    sessionB = await loginAs('attach-b');
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: 'TK-ATT-TEST-0001',
        summary: 'Attachment test ticket',
        description: 'desc',
        currentStatus: 'NEW',
        requestedPriority: 'MEDIUM',
        ticketDate: new Date(),
        requesterId: sessionA.userId,
        categoryId: 1,
        relatedSystemId: 1
      }
    });
    ticketId = ticket.id;
  });

  afterAll(async () => {
    // delete uploaded files by storedFilename (single shared helper)
    const atts = await prisma.attachment.findMany({ where: { ticketId } });
    for (const att of atts) {
      const fp = path.join(uploadsDir, att.storedFilename);
      if (fs.existsSync(fp)) {
        try {
          fs.unlinkSync(fp);
        } catch {}
      }
    }
    await prisma.attachment.deleteMany({ where: { ticketId } });
    await prisma.ticket.deleteMany({ where: { id: ticketId } });
    await cleanupTestUsers();
    for (const p of tmpFiles) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  it('uploads a valid file (API-ATT-01)', async () => {
    const filePath = tmpPath('tmp-valid.png');
    fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const res = await upload(filePath, sessionA.cookie);
    expect(res.status).toBe(201);
    expect(res.body.filename).toBeDefined();
    expect(res.body.isRemoved).toBe(false);
  });

  it('rejects invalid file type (API-ATT-02)', async () => {
    const filePath = tmpPath('tmp-invalid.exe');
    fs.writeFileSync(filePath, Buffer.from('MZ'));
    const res = await upload(filePath, sessionA.cookie);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects file too large (FILE_TOO_LARGE)', async () => {
    const filePath = tmpPath('tmp-large.png');
    const big = Buffer.alloc(6 * 1024 * 1024, 0);
    fs.writeFileSync(filePath, big);
    const res = await upload(filePath, sessionA.cookie);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('rejects 6th active attachment (MAX_ATTACHMENTS)', async () => {
    // create 4 more to reach 5 active (already 1 from first test, need 4 more = 5 total)
    for (let i = 0; i < 4; i++) {
      const p = tmpPath(`tmp-max-${i}.png`);
      fs.writeFileSync(p, Buffer.from([0x89, 0x50, 0x4e, 0x47, i]));
      const r = await upload(p, sessionA.cookie);
      expect(r.status).toBe(201);
    }
    const extra = tmpPath('tmp-extra.png');
    fs.writeFileSync(extra, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const res = await upload(extra, sessionA.cookie);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MAX_ATTACHMENTS');
  });

  it('cross-requester upload is forbidden (403)', async () => {
    const filePath = tmpPath('tmp-cross.png');
    fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const res = await upload(filePath, sessionB.cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('downloads an active attachment (200)', async () => {
    const att = await prisma.attachment.findFirst({ where: { ticketId, isRemoved: false } });
    expect(att).not.toBeNull();
    const res = await request(app)
      .get(`/api/attachments/${att!.id}/download`)
      .set('Cookie', sessionA.cookie);
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toMatch(/image\/png/);
  });

  it('blocks download of removed attachment (410)', async () => {
    const att = await prisma.attachment.findFirst({ where: { ticketId, isRemoved: false } });
    const removeRes = await request(app)
      .patch(`/api/attachments/${att!.id}/remove`)
      .set('Cookie', sessionA.cookie)
      .send({ reason: 'no longer needed' });
    expect(removeRes.status).toBe(200);
    const dlRes = await request(app)
      .get(`/api/attachments/${att!.id}/download`)
      .set('Cookie', sessionA.cookie);
    expect(dlRes.status).toBe(410);
    expect(dlRes.body.error.code).toBe('REMOVED');
  });

  it('remove requires reason (400)', async () => {
    const att = await prisma.attachment.findFirst({ where: { ticketId, isRemoved: false } });
    const res = await request(app)
      .patch(`/api/attachments/${att!.id}/remove`)
      .set('Cookie', sessionA.cookie)
      .send({ reason: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('cross-requester remove is forbidden (403)', async () => {
    const att = await prisma.attachment.findFirst({ where: { ticketId, isRemoved: false } });
    const res = await request(app)
      .patch(`/api/attachments/${att!.id}/remove`)
      .set('Cookie', sessionB.cookie)
      .send({ reason: 'try' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });
});
