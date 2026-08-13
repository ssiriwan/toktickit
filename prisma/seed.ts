import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORY_NAMES = [
  'Account and Access',
  'Hardware',
  'Software',
  'Network'
] as const;

async function main() {
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
