import cors from 'cors';
import express from 'express';

import { prisma } from './db.js';
import { nextTicketNumber, toDateStamp } from './ticket-number.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'TokTickIT API' });
  });

  app.get('/api/categories', async (_req, res) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, name: true }
      });
      res.json(categories);
    } catch {
      res.status(500).json({ message: 'Failed to load categories' });
    }
  });

  app.get('/api/requesters', async (_req, res) => {
    try {
      const requesters = await prisma.requesterUser.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, email: true }
      });
      res.json(requesters);
    } catch {
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load requesters' }
      });
    }
  });

  app.get('/api/related-systems', async (_req, res) => {
    try {
      const systems = await prisma.relatedSystem.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      });
      res.json(systems);
    } catch {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to load related systems'
        }
      });
    }
  });

  app.post('/api/tickets', async (req, res) => {
    try {
      const body = req.body ?? {};
      const details: { field: string; message: string }[] = [];

      const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
      const description =
        typeof body.description === 'string' ? body.description.trim() : '';

      if (!summary) {
        details.push({ field: 'summary', message: 'Summary is required' });
      } else if (summary.length > 150) {
        details.push({
          field: 'summary',
          message: 'Summary must be at most 150 characters'
        });
      }

      if (!description) {
        details.push({ field: 'description', message: 'Description is required' });
      } else if (description.length > 2000) {
        details.push({
          field: 'description',
          message: 'Description must be at most 2000 characters'
        });
      }

      const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (!body.requestedPriority || !priorities.includes(body.requestedPriority)) {
        details.push({
          field: 'requestedPriority',
          message: 'Priority must be one of: LOW, MEDIUM, HIGH, URGENT'
        });
      }

      const requesterIdNum = Number(body.requesterId);
      if (!Number.isInteger(requesterIdNum) || requesterIdNum <= 0) {
        details.push({ field: 'requesterId', message: 'Requester is required' });
      }

      const categoryIdNum = Number(body.categoryId);
      if (!Number.isInteger(categoryIdNum) || categoryIdNum <= 0) {
        details.push({ field: 'categoryId', message: 'Category is required' });
      }

      const relatedSystemIdNum = Number(body.relatedSystemId);
      if (!Number.isInteger(relatedSystemIdNum) || relatedSystemIdNum <= 0) {
        details.push({ field: 'relatedSystemId', message: 'Related system is required' });
      }

      if (details.length > 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ticket payload is invalid',
            details
          }
        });
      }

      const [requester, category, relatedSystem] = await Promise.all([
        prisma.requesterUser.findFirst({
          where: { id: Number(body.requesterId), isActive: true }
        }),
        prisma.category.findFirst({ where: { id: Number(body.categoryId) } }),
        prisma.relatedSystem.findFirst({
          where: { id: Number(body.relatedSystemId) }
        })
      ]);

      if (!requester) {
        return res
          .status(404)
          .json({ error: { code: 'NOT_FOUND', message: 'Requester not found' } });
      }
      if (!category) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ticket payload is invalid',
            details: [{ field: 'categoryId', message: 'Invalid category' }]
          }
        });
      }
      if (!relatedSystem) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ticket payload is invalid',
            details: [
              { field: 'relatedSystemId', message: 'Invalid related system' }
            ]
          }
        });
      }

      const now = new Date();
      const dateStamp = toDateStamp(now);
      const prefix = `TK-${dateStamp}-`;

      let ticket: Awaited<ReturnType<typeof prisma.ticket.create>> | null = null;
      const maxAttempts = 5;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const todayCount = await prisma.ticket.count({
          where: { ticketNumber: { startsWith: prefix } }
        });
        const candidate = nextTicketNumber(todayCount + 1, now);
        try {
          ticket = await prisma.ticket.create({
            data: {
              ticketNumber: candidate,
              summary,
              description,
              currentStatus: 'NEW',
              requestedPriority: body.requestedPriority,
              ticketDate: now,
              requesterId: requester.id,
              categoryId: category.id,
              relatedSystemId: relatedSystem.id
            },
            include: {
              requester: { select: { id: true, name: true } },
              category: { select: { id: true, name: true } },
              relatedSystem: { select: { id: true, name: true } }
            }
          });
          break;
        } catch (err: unknown) {
          const code =
            typeof err === 'object' && err !== null && 'code' in err
              ? (err as { code: string }).code
              : undefined;
          if (code === 'P2002' && attempt < maxAttempts - 1) {
            continue;
          }
          throw err;
        }
      }

      if (!ticket) {
        throw new Error('Failed to generate unique ticket number');
      }

      res.status(201).json(ticket);
    } catch {
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create ticket' }
      });
    }
  });

  app.get('/api/tickets', async (req, res) => {
    try {
      const q = req.query as Record<string, string | undefined>;
      const requesterId = Number(q.requesterId);
      if (!Number.isInteger(requesterId) || requesterId <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
        });
      }

      const search = q.search?.trim() ?? '';
      const categoryId = q.categoryId ? Number(q.categoryId) : undefined;
      const relatedSystemId = q.relatedSystemId ? Number(q.relatedSystemId) : undefined;
      const status = q.status?.trim();
      const priority = q.priority?.trim();
      const sort = q.sort?.trim() || 'ticketDate';
      const order = q.order?.trim() === 'asc' ? 'asc' : 'desc';
      const page = Math.max(1, Number(q.page) || 1);
      const pageSize = Math.min(50, Math.max(1, Number(q.pageSize) || 10));

      const validSorts = new Set(['ticketDate', 'updatedAt', 'requestedPriority']);
      if (!validSorts.has(sort)) {
        return res.status(400).json({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
        });
      }

      const where: Record<string, unknown> = { requesterId };
      if (categoryId && Number.isInteger(categoryId)) where.categoryId = categoryId;
      if (relatedSystemId && Number.isInteger(relatedSystemId)) where.relatedSystemId = relatedSystemId;
      if (status) where.currentStatus = status;
      if (priority) where.requestedPriority = priority;
      if (search) {
        where.OR = [
          { summary: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const totalItems = await prisma.ticket.count({ where: where as never });
      const totalPages = Math.ceil(totalItems / pageSize) || 1;
      const skip = (page - 1) * pageSize;

      const tickets = await prisma.ticket.findMany({
        where: where as never,
        orderBy: { [sort]: order },
        skip,
        take: pageSize,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          currentStatus: true,
          requestedPriority: true,
          ticketDate: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } }
        }
      });

      res.json({ tickets, pagination: { page, pageSize, totalItems, totalPages } });
    } catch {
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load tickets' }
      });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  return app;
}
