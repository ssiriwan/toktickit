import cors from 'cors';
import express from 'express';

import { prisma } from './db.js';

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
        orderBy: { id: 'asc' },
        select: { id: true, name: true, email: true }
      });
      res.json(requesters);
    } catch {
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load requesters' }
      });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  return app;
}
