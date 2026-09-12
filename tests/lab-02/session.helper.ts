import request from 'supertest';

import { createApp } from '../../server/src/app';
import { hashPassword } from '../../server/src/auth';
import { prisma } from '../../server/src/db';

const app = createApp();

export interface TestSession {
  cookie: string;
  userId: number;
  email: string;
}

// Dedicated throwaway accounts for Lab 3 session-auth integration tests.
// mustChangePassword=false so they can call ticket APIs directly.
export async function loginAs(key: string): Promise<TestSession> {
  const email = `phase4.${key}@toktickit.local`;
  const password = 'Phase4123!';
  await prisma.user.upsert({
    where: { email },
    update: {
      name: `Phase4 ${key}`,
      role: 'REQUESTER',
      isActive: true,
      mustChangePassword: false,
      passwordHash: await hashPassword(password)
    },
    create: {
      name: `Phase4 ${key}`,
      email,
      role: 'REQUESTER',
      isActive: true,
      mustChangePassword: false,
      passwordHash: await hashPassword(password)
    }
  });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const setCookie = res.headers['set-cookie'] as unknown as string[];
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { cookie: setCookie[0].split(';')[0], userId: user.id, email };
}

// Removes throwaway phase4.* accounts. Call after the file's own ticket
// cleanup (tickets/attachments/comments/notes FK-restrict user deletion).
export async function cleanupTestUsers() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: 'phase4.' } },
    select: { id: true }
  });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) return;
  await prisma.publicComment.deleteMany({ where: { authorId: { in: ids } } });
  await prisma.internalNote.deleteMany({ where: { authorId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
