import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootEnvPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../.env'
);
dotenv.config({ path: rootEnvPath });

export const prisma = new PrismaClient();
