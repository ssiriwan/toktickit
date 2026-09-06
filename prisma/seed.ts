import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORY_NAMES = [
  'Account and Access',
  'Hardware',
  'Software',
  'Network'
] as const;

const RELATED_SYSTEM_NAMES = [
  'Email',
  'Campus Wi-Fi',
  'VPN',
  'LEB2 App',
  'Grade Submission App',
  'Printer',
  'Corporate Laptop'
] as const;

interface RequesterSeed {
  name: string;
  email: string;
  isActive: boolean;
}

const REQUESTERS: RequesterSeed[] = [
  { name: 'Alice Carter', email: 'alice.carter@student.example', isActive: true },
  { name: 'Bob Nguyen', email: 'bob.nguyen@student.example', isActive: true },
  { name: 'Carol Martinez', email: 'carol.martinez@student.example', isActive: true },
  { name: 'David Kim', email: 'david.kim@student.example', isActive: true },
  { name: 'Inactive User', email: 'inactive.user@student.example', isActive: false }
];

async function seedCategories() {
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
}

async function seedRelatedSystems() {
  for (const name of RELATED_SYSTEM_NAMES) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
}

async function seedRequesters() {
  for (const requester of REQUESTERS) {
    await prisma.requesterUser.upsert({
      where: { email: requester.email },
      update: { name: requester.name, isActive: requester.isActive },
      create: requester
    });
  }
}

async function main() {
  await seedCategories();
  await seedRelatedSystems();
  await seedRequesters();
  console.log('Seed complete: categories, related systems, requesters.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
