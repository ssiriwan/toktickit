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
      const validPriority = priorities.includes(body.requestedPriority);

      if (details.length > 0 || !validPriority) {
        if (body.requestedPriority && !validPriority) {
          details.push({
            field: 'requestedPriority',
            message: 'Priority must be one of: LOW, MEDIUM, HIGH, URGENT'
          });
        }
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
      const todayCount = await prisma.ticket.count({
        where: { ticketNumber: { startsWith: prefix } }
      });

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: nextTicketNumber(todayCount + 1, now),
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

      res.status(201).json(ticket);
    } catch {
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create ticket' }
      });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  return app;
}
