import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Server tests run with cwd=server/ (whose .env lacks DATABASE_URL);
// load the repo-root .env like prisma/seed.ts does. Never overrides existing vars.
dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env')
});

import { signSession } from '../../src/auth.js';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';

const app = createApp();

/** Real-DB performance smoke (PERF-01): skipped gracefully when the DB is unreachable. */
async function dbAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

describe('Lab 4 dashboard performance smoke (PERF-01)', () => {
  const restored: { id: number; mustChangePassword: boolean }[] = [];
  const cookies: Record<string, string> = {};

  beforeAll(async () => {
    if (!(await dbAvailable())) return;
    const seeds = [
      { email: 'requester1@toktickit.local', role: 'REQUESTER' as const },
      { email: 'it1@toktickit.local', role: 'IT_STAFF' as const },
      { email: 'admin1@toktickit.local', role: 'ADMINISTRATOR' as const }
    ];
    for (const s of seeds) {
      const user = await prisma.user.findUnique({ where: { email: s.email } });
      if (!user) continue;
      restored.push({ id: user.id, mustChangePassword: user.mustChangePassword });
      if (user.mustChangePassword) {
        await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: false } });
      }
      cookies[s.role] = `toktickit_session=${signSession(user.id, s.role)}`;
    }
  });

  afterAll(async () => {
    for (const r of restored) {
      await prisma.user.update({ where: { id: r.id }, data: { mustChangePassword: r.mustChangePassword } }).catch(() => {});
    }
    await prisma.$disconnect().catch(() => {});
  });

  it('requester/staff/admin dashboards answer p95 < 1s on seeded DB', async () => {
    if (!(await dbAvailable()) || !cookies.REQUESTER) {
      console.warn('PERF-01 skipped: database unreachable');
      return;
    }
    const samples: Record<string, number[]> = {
      '/api/requester/dashboard': [],
      '/api/staff/dashboard': [],
      '/api/admin/dashboard': []
    };
    const jar: Record<string, string> = {
      '/api/requester/dashboard': cookies.REQUESTER,
      '/api/staff/dashboard': cookies.IT_STAFF,
      '/api/admin/dashboard': cookies.ADMINISTRATOR
    };
    for (const [path, cookie] of Object.entries(jar)) {
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        const res = await request(app).get(path).set('Cookie', cookie);
        samples[path].push(Date.now() - start);
        expect(res.status).toBe(200);
      }
      const p95 = samples[path].sort((a, b) => a - b)[Math.ceil(samples[path].length * 0.95) - 1];
      expect(p95).toBeLessThan(1000);
    }
  });
});
