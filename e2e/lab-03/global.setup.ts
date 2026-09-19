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
 * Pin E2E accounts to a known initial state before AND after every run
 * (used as both globalSetup and globalTeardown).
 * `prisma:seed` restores tickets/samples but deliberately preserves changed
 * passwords, so E2E accounts are reset here explicitly. Owner's daily
 * accounts (requester1/it1) are never touched by E2E specs.
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
    // E2E temp users from prior runs (deactivated, never deleted by the app).
    await prisma.user.deleteMany({ where: { email: { startsWith: 'e2etemp+' } } });
    for (const account of RESET_ACCOUNTS) {
      const passwordHash = await bcrypt.hash(account.password, 12);
      await prisma.user.updateMany({
        where: { email: { equals: account.email, mode: 'insensitive' } },
        data: { passwordHash, mustChangePassword: true, isActive: true, role: account.role }
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}
