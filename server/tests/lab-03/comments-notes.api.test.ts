import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { signSession } from '../../src/auth.js';
import { prisma } from '../../src/db.js';

const app = createApp();

type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

function cookieFor(id: number, role: Role) {
  vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
    id,
    role,
    isActive: true,
    mustChangePassword: false
  } as never);
  return `toktickit_session=${signSession(id, role)}`;
}

function mockTicket(requesterId: number) {
  vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({
    id: 1,
    requesterId
  } as never);
}

describe('Lab 3 comments and notes (CMT-01..03, NOTE-01/02)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('CMT-01: requester posts and lists public comments on owned ticket', async () => {
    const cookie = cookieFor(7, 'REQUESTER');
    mockTicket(7);
    vi.spyOn(prisma.publicComment, 'create').mockResolvedValue({
      id: 10,
      body: 'Still broken after reboot.',
      createdAt: new Date().toISOString(),
      author: { id: 7, name: 'Requester One', role: 'REQUESTER' }
    } as never);

    const post = await request(app)
      .post('/api/tickets/1/comments')
      .set('Cookie', cookie)
      .send({ body: 'Still broken after reboot.' });
    expect(post.status).toBe(201);
    expect(post.body.body).toBe('Still broken after reboot.');
    expect(post.body.author.role).toBe('REQUESTER');

    vi.spyOn(prisma.publicComment, 'findMany').mockResolvedValue([
      { id: 10, body: 'Still broken after reboot.' }
    ] as never);
    const list = await request(app)
      .get('/api/tickets/1/comments')
      .set('Cookie', cookie);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('CMT-01: cross-owner requester gets 403, not the comments', async () => {
    const cookie = cookieFor(8, 'REQUESTER');
    mockTicket(7);

    const res = await request(app)
      .get('/api/tickets/1/comments')
      .set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('CMT-02: empty, whitespace, and overlong bodies are rejected', async () => {
    const cookie = cookieFor(7, 'REQUESTER');
    mockTicket(7);

    for (const body of ['', '   ', 'x'.repeat(2001)]) {
      const res = await request(app)
        .post('/api/tickets/1/comments')
        .set('Cookie', cookie)
        .send({ body });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('CMT-03: IT posts public; Admin POST is read-only forbidden, GET allowed', async () => {
    mockTicket(7);
    vi.spyOn(prisma.publicComment, 'create').mockResolvedValue({ id: 11 } as never);
    vi.spyOn(prisma.publicComment, 'findMany').mockResolvedValue([] as never);

    const itPost = await request(app)
      .post('/api/tickets/1/comments')
      .set('Cookie', cookieFor(3, 'IT_STAFF'))
      .send({ body: 'On it, checking logs.' });
    expect(itPost.status).toBe(201);

    const adminPost = await request(app)
      .post('/api/tickets/1/comments')
      .set('Cookie', cookieFor(5, 'ADMINISTRATOR'))
      .send({ body: 'Admin trying to post.' });
    expect(adminPost.status).toBe(403);

    const adminGet = await request(app)
      .get('/api/tickets/1/comments')
      .set('Cookie', cookieFor(5, 'ADMINISTRATOR'));
    expect(adminGet.status).toBe(200);
  });

  it('NOTE-01: IT posts and lists internal notes with backend author/time', async () => {
    const cookie = cookieFor(3, 'IT_STAFF');
    mockTicket(7);
    vi.spyOn(prisma.internalNote, 'create').mockResolvedValue({
      id: 20,
      body: 'Check background update tasks.',
      createdAt: new Date().toISOString(),
      author: { id: 3, name: 'IT Alice', role: 'IT_STAFF' }
    } as never);

    const post = await request(app)
      .post('/api/tickets/1/notes')
      .set('Cookie', cookie)
      .send({ body: 'Check background update tasks.' });
    expect(post.status).toBe(201);
    expect(post.body.author.role).toBe('IT_STAFF');
    expect(post.body.createdAt).toBeDefined();

    vi.spyOn(prisma.internalNote, 'findMany').mockResolvedValue([
      { id: 20, body: 'Check background update tasks.' }
    ] as never);
    const list = await request(app)
      .get('/api/tickets/1/notes')
      .set('Cookie', cookie);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('NOTE-02: requester and admin cannot write notes; requester cannot read', async () => {
    mockTicket(7);

    const reqGet = await request(app)
      .get('/api/tickets/1/notes')
      .set('Cookie', cookieFor(7, 'REQUESTER'));
    expect(reqGet.status).toBe(403);
    expect(reqGet.body).toEqual({
      error: { code: 'FORBIDDEN', message: 'Access denied' }
    });

    const reqPost = await request(app)
      .post('/api/tickets/1/notes')
      .set('Cookie', cookieFor(7, 'REQUESTER'))
      .send({ body: 'nope' });
    expect(reqPost.status).toBe(403);

    const adminPost = await request(app)
      .post('/api/tickets/1/notes')
      .set('Cookie', cookieFor(5, 'ADMINISTRATOR'))
      .send({ body: 'nope' });
    expect(adminPost.status).toBe(403);

    vi.spyOn(prisma.internalNote, 'findMany').mockResolvedValue([] as never);
    const adminGet = await request(app)
      .get('/api/tickets/1/notes')
      .set('Cookie', cookieFor(5, 'ADMINISTRATOR'));
    expect(adminGet.status).toBe(200);
  });

  it('returns 404 for comments on missing tickets', async () => {
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue(null as never);
    const res = await request(app)
      .get('/api/tickets/999/comments')
      .set('Cookie', cookieFor(3, 'IT_STAFF'));
    expect(res.status).toBe(404);
  });

  it('DETAIL-06: appears-resolved sets flag only, never the status', async () => {
    const cookie = cookieFor(7, 'REQUESTER');
    vi.spyOn(prisma.ticket, 'findUnique').mockResolvedValue({
      id: 1,
      requesterId: 7,
      currentStatus: 'IN_PROGRESS'
    } as never);
    const updateSpy = vi.spyOn(prisma.ticket, 'update').mockResolvedValue({
      id: 1,
      appearsResolved: true,
      appearsResolvedAt: new Date().toISOString(),
      currentStatus: 'IN_PROGRESS'
    } as never);

    const first = await request(app)
      .patch('/api/tickets/1/appears-resolved')
      .set('Cookie', cookie);
    expect(first.status).toBe(200);
    expect(first.body.appearsResolved).toBe(true);
    expect(first.body.currentStatus).toBe('IN_PROGRESS');
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ appearsResolved: true })
      })
    );

    // Idempotent repeat.
    const second = await request(app)
      .patch('/api/tickets/1/appears-resolved')
      .set('Cookie', cookie);
    expect(second.status).toBe(200);

    // Other owner's requester is rejected.
    const other = await request(app)
      .patch('/api/tickets/1/appears-resolved')
      .set('Cookie', cookieFor(8, 'REQUESTER'));
    expect(other.status).toBe(403);
  });
});
