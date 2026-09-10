import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env')
});

import { hashPassword } from '../server/src/auth.js';

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

interface UserSeed {
  name: string;
  email: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
  isActive: boolean;
  password: string;
}

// Fake local-development credentials only. Never real passwords.
// Every seeded user starts with mustChangePassword=true.
const USERS: UserSeed[] = [
  { name: 'Requester One', email: 'requester1@toktickit.local', role: 'REQUESTER', isActive: true, password: 'Requester123!' },
  { name: 'Requester Two', email: 'requester2@toktickit.local', role: 'REQUESTER', isActive: true, password: 'Requester123!' },
  { name: 'Requester Three', email: 'requester3@toktickit.local', role: 'REQUESTER', isActive: true, password: 'Requester123!' },
  { name: 'Requester Four', email: 'requester4@toktickit.local', role: 'REQUESTER', isActive: true, password: 'Requester123!' },
  { name: 'Inactive Requester', email: 'requester.inactive@toktickit.local', role: 'REQUESTER', isActive: false, password: 'Requester123!' },
  { name: 'IT Alice', email: 'it1@toktickit.local', role: 'IT_STAFF', isActive: true, password: 'Itstaff123!' },
  { name: 'IT Bob', email: 'it2@toktickit.local', role: 'IT_STAFF', isActive: true, password: 'Itstaff123!' },
  { name: 'IT Carol', email: 'it3@toktickit.local', role: 'IT_STAFF', isActive: true, password: 'Itstaff123!' },
  { name: 'Inactive IT', email: 'it.inactive@toktickit.local', role: 'IT_STAFF', isActive: false, password: 'Itstaff123!' },
  { name: 'Admin One', email: 'admin1@toktickit.local', role: 'ADMINISTRATOR', isActive: true, password: 'Admin123!' },
  { name: 'Admin Two', email: 'admin2@toktickit.local', role: 'ADMINISTRATOR', isActive: true, password: 'Admin123!' }
];

interface TicketSeed {
  ticketNumber: string;
  summary: string;
  description: string;
  currentStatus: 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_REQUESTER' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  requestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  itPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  requesterEmail: string;
  ownerEmail: string | null;
  category: string;
  system: string;
}

const TICKETS: TicketSeed[] = [
  {
    ticketNumber: 'TKT-20260910-0001',
    summary: 'Laptop battery drains quickly',
    description: 'Battery drops 50% in an hour even when idle after the latest update.',
    currentStatus: 'IN_PROGRESS',
    requestedPriority: 'MEDIUM',
    itPriority: 'HIGH',
    requesterEmail: 'requester1@toktickit.local',
    ownerEmail: 'it1@toktickit.local',
    category: 'Hardware',
    system: 'Corporate Laptop'
  },
  {
    ticketNumber: 'TKT-20260910-0002',
    summary: 'Cannot connect to VPN',
    description: 'VPN client fails with timeout from home network.',
    currentStatus: 'OPEN',
    requestedPriority: 'HIGH',
    itPriority: 'HIGH',
    requesterEmail: 'requester2@toktickit.local',
    ownerEmail: null,
    category: 'Network',
    system: 'VPN'
  },
  {
    ticketNumber: 'TKT-20260910-0003',
    summary: 'Email not syncing on mobile',
    description: 'Inbox stopped syncing yesterday morning.',
    currentStatus: 'WAITING_FOR_REQUESTER',
    requestedPriority: 'MEDIUM',
    itPriority: 'MEDIUM',
    requesterEmail: 'requester3@toktickit.local',
    ownerEmail: 'it2@toktickit.local',
    category: 'Software',
    system: 'Email'
  },
  {
    ticketNumber: 'TKT-20260910-0004',
    summary: 'New employee setup request',
    description: 'Account and laptop needed for a new hire starting Monday.',
    currentStatus: 'RESOLVED',
    requestedPriority: 'LOW',
    itPriority: 'LOW',
    requesterEmail: 'requester4@toktickit.local',
    ownerEmail: 'it3@toktickit.local',
    category: 'Account and Access',
    system: 'Email'
  },
  {
    ticketNumber: 'TKT-20260910-0005',
    summary: 'Printer keeps showing offline',
    description: 'Third-floor printer shows offline though powered on.',
    currentStatus: 'NEW',
    requestedPriority: 'MEDIUM',
    itPriority: 'MEDIUM',
    requesterEmail: 'requester1@toktickit.local',
    ownerEmail: null,
    category: 'Hardware',
    system: 'Printer'
  },
  {
    ticketNumber: 'TKT-20260910-0006',
    summary: 'Campus Wi-Fi drops in library',
    description: 'Connection drops every few minutes in the reading room.',
    currentStatus: 'REOPENED',
    requestedPriority: 'HIGH',
    itPriority: 'URGENT',
    requesterEmail: 'requester2@toktickit.local',
    ownerEmail: 'it1@toktickit.local',
    category: 'Network',
    system: 'Campus Wi-Fi'
  },
  {
    ticketNumber: 'TKT-20260910-0007',
    summary: 'Grade app export fails',
    description: 'CSV export spins forever for large courses.',
    currentStatus: 'CLOSED',
    requestedPriority: 'LOW',
    itPriority: 'LOW',
    requesterEmail: 'requester3@toktickit.local',
    ownerEmail: 'it2@toktickit.local',
    category: 'Software',
    system: 'Grade Submission App'
  },
  {
    ticketNumber: 'TKT-20260910-0008',
    summary: 'Request access to SharePoint',
    description: 'Need read access to the course materials folder.',
    currentStatus: 'OPEN',
    requestedPriority: 'LOW',
    itPriority: 'LOW',
    requesterEmail: 'requester4@toktickit.local',
    ownerEmail: null,
    category: 'Account and Access',
    system: 'Email'
  }
];

async function seedCategories() {
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
}

async function seedRelatedSystems() {
  for (const name of RELATED_SYSTEM_NAMES) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
  }
}

async function seedUsers() {
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        passwordHash: await hashPassword(u.password),
        mustChangePassword: true
      },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        passwordHash: await hashPassword(u.password),
        mustChangePassword: true
      }
    });
  }
}

async function seedTickets() {
  for (const t of TICKETS) {
    const requester = await prisma.user.findUniqueOrThrow({ where: { email: t.requesterEmail } });
    const owner = t.ownerEmail
      ? await prisma.user.findUniqueOrThrow({ where: { email: t.ownerEmail } })
      : null;
    const category = await prisma.category.findUniqueOrThrow({ where: { name: t.category } });
    const system = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: t.system } });
    await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        summary: t.summary,
        description: t.description,
        currentStatus: t.currentStatus,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        requesterId: requester.id,
        ownerId: owner?.id ?? null,
        categoryId: category.id,
        relatedSystemId: system.id
      },
      create: {
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        description: t.description,
        currentStatus: t.currentStatus,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        requesterId: requester.id,
        ownerId: owner?.id ?? null,
        categoryId: category.id,
        relatedSystemId: system.id
      }
    });
  }
}

async function seedSamples() {
  const ticket = await prisma.ticket.findUniqueOrThrow({
    where: { ticketNumber: 'TKT-20260910-0001' }
  });
  const requester = await prisma.user.findUniqueOrThrow({
    where: { email: 'requester1@toktickit.local' }
  });
  const staff = await prisma.user.findUniqueOrThrow({
    where: { email: 'it1@toktickit.local' }
  });
  const existingPublic = await prisma.publicComment.count({
    where: { ticketId: ticket.id }
  });
  if (existingPublic === 0) {
    await prisma.publicComment.createMany({
      data: [
        { ticketId: ticket.id, authorId: requester.id, body: 'Happens even with all apps closed.' },
        { ticketId: ticket.id, authorId: staff.id, body: 'We are investigating the issue on your device.' }
      ]
    });
  }
  const existingNotes = await prisma.internalNote.count({
    where: { ticketId: ticket.id }
  });
  if (existingNotes === 0) {
    await prisma.internalNote.create({
      data: {
        ticketId: ticket.id,
        authorId: staff.id,
        body: 'Battery health at 82%. Check for background update tasks first.'
      }
    });
  }
}

async function main() {
  await seedCategories();
  await seedRelatedSystems();
  await seedUsers();
  await seedTickets();
  await seedSamples();
  console.log('Seed complete: categories, systems, users, tickets, samples.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
