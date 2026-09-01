import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../server/src/db';

beforeAll(async () => {
  const reqCount = await prisma.requesterUser.count();
  if (reqCount === 0) {
    throw new Error(
      'Seed data required. Run `npm run prisma:seed` before running this test.'
    );
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Lab 2 seed content (API-02)', () => {
  it('has the four required ticket categories', async () => {
    const names = await prisma.category.findMany({ select: { name: true } });
    const list = names.map((c) => c.name);
    for (const required of [
      'Account and Access',
      'Hardware',
      'Software',
      'Network'
    ]) {
      expect(list).toContain(required);
    }
  });

  it('has at least six related systems', async () => {
    const count = await prisma.relatedSystem.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  it('has at least four active requesters', async () => {
    const count = await prisma.requesterUser.count({ where: { isActive: true } });
    expect(count).toBeGreaterThanOrEqual(4);
  });

  it('has at least one inactive requester', async () => {
    const count = await prisma.requesterUser.count({ where: { isActive: false } });
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
