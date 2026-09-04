import cors from 'cors';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from './db.js';
import { nextTicketNumber, toDateStamp } from './ticket-number.js';

const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      cb(null, `${uuidv4()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      const ext = path.extname(file.originalname).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('INVALID_FILE_TYPE'));
      }
    }
  }
});

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
      const rawRequesterId = q.requesterId ?? (req.header('X-Requester-Id') as string | undefined);
      const requesterId = Number(rawRequesterId);
      if (!rawRequesterId || !Number.isInteger(requesterId) || requesterId <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
        });
      }

      const search = q.search?.trim() ?? '';
      const rawCategoryId = q.categoryId;
      const rawSystemId = q.relatedSystemId;
      let categoryId: number | undefined;
      let relatedSystemId: number | undefined;
      if (rawCategoryId !== undefined) {
        const n = Number(rawCategoryId);
        if (!Number.isInteger(n) || n <= 0) {
          return res.status(400).json({
            error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
          });
        }
        categoryId = n;
      }
      if (rawSystemId !== undefined) {
        const n = Number(rawSystemId);
        if (!Number.isInteger(n) || n <= 0) {
          return res.status(400).json({
            error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
          });
        }
        relatedSystemId = n;
      }
      const status = q.status?.trim();
      const priority = q.priority?.trim();
      const sort = q.sort?.trim() || 'ticketDate';
      const order = q.order?.trim() === 'asc' ? 'asc' : 'desc';
      let page = 1;
      let pageSize = 10;
      if (q.page !== undefined) {
        const n = Number(q.page);
        if (!Number.isInteger(n) || n < 1) {
          return res.status(400).json({
            error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
          });
        }
        page = n;
      }
      if (q.pageSize !== undefined) {
        const n = Number(q.pageSize);
        if (!Number.isInteger(n) || n < 1 || n > 50) {
          return res.status(400).json({
            error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
          });
        }
        pageSize = n;
      }

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

  app.get('/api/tickets/:id', async (req, res) => {
    try {
      const rawRequesterId =
        (req.query.requesterId as string | undefined) ??
        (req.header('X-Requester-Id') as string | undefined);
      const requesterId = Number(rawRequesterId);
      if (!rawRequesterId || !Number.isInteger(requesterId) || requesterId <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
        });
      }
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
        });
      }
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          attachments: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              filename: true,
              mimeType: true,
              fileSize: true,
              isRemoved: true,
              removalReason: true,
              removedAt: true,
              createdAt: true
            }
          }
        }
      });
      if (!ticket) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      }
      if (ticket.requesterId !== requesterId) {
        return res.status(403).json({ error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
      }
      res.json(ticket);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load ticket' } });
    }
  });

  app.post('/api/tickets/:id/attachments', (req, res) => {
    const single = upload.single('file');
    single(req as never, res as never, async (err: unknown) => {
      try {
        const rawRequesterId =
          (req.query.requesterId as string | undefined) ??
          (req.header('X-Requester-Id') as string | undefined);
        const requesterId = Number(rawRequesterId);
        if (!rawRequesterId || !Number.isInteger(requesterId) || requesterId <= 0) {
          if ((req as unknown as { file?: unknown }).file) {
            const f = (req as unknown as { file: { path: string } }).file;
            if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
          }
          return res.status(400).json({
            error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
          });
        }
        if (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg === 'INVALID_FILE_TYPE') {
            return res.status(400).json({
              error: { code: 'INVALID_FILE_TYPE', message: 'File type not allowed. Permitted: JPG, JPEG, PNG, WEBP, PDF' }
            });
          }
          const multerErr = err as { code?: string };
          if (multerErr.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 5MB limit' }
            });
          }
          return res.status(400).json({
            error: { code: 'INVALID_FILE_TYPE', message: 'File type not allowed. Permitted: JPG, JPEG, PNG, WEBP, PDF' }
          });
        }
        const ticketId = Number(req.params.id);
        if (!Number.isInteger(ticketId) || ticketId <= 0) {
          return res.status(400).json({ error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' } });
        }
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
          const f = (req as unknown as { file?: { path: string } }).file;
          if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
        }
        if (ticket.requesterId !== requesterId) {
          const f = (req as unknown as { file?: { path: string } }).file;
          if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
          return res.status(403).json({ error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
        }
        const activeCount = await prisma.attachment.count({
          where: { ticketId, isRemoved: false }
        });
        if (activeCount >= 5) {
          const f = (req as unknown as { file?: { path: string } }).file;
          if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
          return res.status(400).json({
            error: { code: 'MAX_ATTACHMENTS', message: 'Maximum 5 active attachments per ticket' }
          });
        }
        const file = (req as unknown as { file: Express.Multer.File }).file;
        if (!file) {
          return res.status(400).json({
            error: { code: 'INVALID_FILE_TYPE', message: 'File is required' }
          });
        }
        // Double-check mime after multer
        if (!allowedMimeTypes.has(file.mimetype)) {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          return res.status(400).json({
            error: { code: 'INVALID_FILE_TYPE', message: 'File type not allowed. Permitted: JPG, JPEG, PNG, WEBP, PDF' }
          });
        }
        const attachment = await prisma.attachment.create({
          data: {
            filename: file.originalname,
            storedFilename: path.basename(file.path),
            mimeType: file.mimetype,
            fileSize: file.size,
            ticketId
          },
          select: {
            id: true,
            filename: true,
            mimeType: true,
            fileSize: true,
            isRemoved: true,
            createdAt: true
          }
        });
        res.status(201).json(attachment);
      } catch {
        const f = (req as unknown as { file?: { path: string } }).file;
        if (f?.path && fs.existsSync(f.path)) {
          try {
            fs.unlinkSync(f.path);
          } catch {}
        }
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to upload attachment' } });
      }
    });
  });

  app.get('/api/attachments/:id/download', async (req, res) => {
    try {
      const rawRequesterId =
        (req.query.requesterId as string | undefined) ??
        (req.header('X-Requester-Id') as string | undefined);
      const requesterId = Number(rawRequesterId);
      if (!rawRequesterId || !Number.isInteger(requesterId) || requesterId <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
        });
      }
      const attachmentId = Number(req.params.id);
      if (!Number.isInteger(attachmentId) || attachmentId <= 0) {
        return res.status(400).json({ error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' } });
      }
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: { ticket: { select: { requesterId: true } } }
      });
      if (!attachment) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attachment not found' } });
      }
      if (attachment.ticket.requesterId !== requesterId) {
        return res.status(403).json({ error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
      }
      if (attachment.isRemoved) {
        return res.status(410).json({ error: { code: 'REMOVED', message: 'Attachment has been removed' } });
      }
      const filePath = path.join(uploadsDir, attachment.storedFilename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attachment not found' } });
      }
      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to download attachment' } });
    }
  });

  app.patch('/api/attachments/:id/remove', async (req, res) => {
    try {
      const rawRequesterId =
        (req.query.requesterId as string | undefined) ??
        (req.header('X-Requester-Id') as string | undefined);
      const requesterId = Number(rawRequesterId);
      if (!rawRequesterId || !Number.isInteger(requesterId) || requesterId <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
        });
      }
      const attachmentId = Number(req.params.id);
      if (!Number.isInteger(attachmentId) || attachmentId <= 0) {
        return res.status(400).json({ error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' } });
      }
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (!reason) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Ticket payload is invalid', details: [{ field: 'reason', message: 'Reason is required' }] }
        });
      }
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: { ticket: { select: { requesterId: true } } }
      });
      if (!attachment) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attachment not found' } });
      }
      if (attachment.ticket.requesterId !== requesterId) {
        return res.status(403).json({ error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
      }
      if (attachment.isRemoved) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Attachment already removed' }
        });
      }
      const updated = await prisma.attachment.update({
        where: { id: attachmentId },
        data: { isRemoved: true, removalReason: reason, removedAt: new Date() },
        select: { id: true, filename: true, isRemoved: true, removalReason: true, removedAt: true }
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to remove attachment' } });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  return app;
}
