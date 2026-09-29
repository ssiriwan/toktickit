import { execSync } from 'node:child_process';
import path from 'node:path';

// Playwright loads setup files as CJS (no import.meta) — cwd is the repo root.
const rootDir = process.cwd();

const RESET_ACCOUNTS: { email: string; role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'; password: string }[] = [
  { email: 'requester2@toktickit.local', role: 'REQUESTER', password: 'Requester123!' },
  { email: 'it2@toktickit.local', role: 'IT_STAFF', password: 'Itstaff123!' },
  { email: 'it3@toktickit.local', role: 'IT_STAFF', password: 'Itstaff123!' },
  { email: 'admin1@toktickit.local', role: 'ADMINISTRATOR', password: 'Admin123!' },
  { email: 'admin2@toktickit.local', role: 'ADMINISTRATOR', password: 'Admin123!' }
];

/**
 * Lab 4 E2E pinning (used as both globalSetup and globalTeardown).
 * Same account reset as Lab 3, plus Lab 4 flow isolation:
 * - E2E-created actions (description starts with "E2E ") are removed.
 * - TK-20260910-0008 (resolution-flow ticket) is reset to OPEN so the
 *   gate → complete → resolve → close flow is deterministic every run.
 * Owner daily accounts (requester1/it1) are never touched.
 */
export default async function globalSetup() {
  execSync('npm run prisma:seed', { cwd: rootDir, stdio: 'inherit' });

  const { createRequire } = await import('node:module');
  const require = createRequire(path.join(rootDir, 'server', 'package.json'));
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
  const bcrypt = require('bcryptjs') as typeof import('bcryptjs');
  const dotenv = require('dotenv') as typeof import('dotenv');
  dotenv.config({ path: path.join(rootDir, '.env') });

  const prisma = new PrismaClient();
  try {
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2etemp+' } } });
    for (const account of RESET_ACCOUNTS) {
      const passwordHash = await bcrypt.hash(account.password, 12);
      await prisma.user.updateMany({
        where: { email: { equals: account.email, mode: 'insensitive' } },
        data: { passwordHash, mustChangePassword: true, isActive: true, role: account.role }
      });
    }
    await prisma.actionTaken.deleteMany({ where: { description: { startsWith: 'E2E ' } } });
    await prisma.ticket.updateMany({
      where: { ticketNumber: 'TK-20260910-0008' },
      data: { currentStatus: 'OPEN' }
    });
  } finally {
    await prisma.$disconnect();
  }
}
