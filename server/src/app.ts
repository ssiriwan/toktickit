import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import {
  DUMMY_PASSWORD_HASH,
  SESSION_COOKIE,
  hashPassword,
  sessionCookieOptions,
  signSession,
  toSafeUser,
  validatePasswordPolicy,
  verifyPassword
} from './auth.js';
import {
  requireAuth,
  requirePasswordChanged,
  requireRole
} from './auth-middleware.js';
import type { AuthenticatedRequest } from './auth-middleware.js';

import { prisma } from './db.js';
import { nextTicketNumber, toDateStamp } from './ticket-number.js';
import { uploadsDir } from './uploads.js';
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
      cb(new Error('INVALID_FILE_TYPE'));
    }
  }
});

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'TokTickIT API' });
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const email =
        typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      const password =
        typeof req.body?.password === 'string' ? req.body.password : '';
      if (!email || !password) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
            details: [
              ...(!email
                ? [{ field: 'email', message: 'Email is required' }]
                : []),
              ...(!password
                ? [{ field: 'password', message: 'Password is required' }]
                : [])
            ]
          }
        });
      }
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
      });
      // Same timing path whether or not the user exists (anti-enumeration).
      const ok = await verifyPassword(
        password,
        user ? user.passwordHash : DUMMY_PASSWORD_HASH
      );
      if (!user || !ok) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }
      if (!user.isActive) {
        return res.status(403).json({
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account is deactivated. Please contact support.'
          }
        });
      }
      res.cookie(SESSION_COOKIE, signSession(user.id, user.role), sessionCookieOptions());
      res.json({ user: toSafeUser(user) });
    } catch {
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Login failed' }
      });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).end();
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const auth = (req as unknown as { auth: { userId: number } }).auth;
      const user = await prisma.user.findUnique({
        where: { id: auth.userId }
      });
      if (!user) {
        return res.status(401).json({
          error: { code: 'UNAUTHENTICATED', message: 'Authentication required' }
        });
      }
      res.json({ user: toSafeUser(user) });
    } catch {
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load user' }
      });
    }
  });

  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
      const auth = (req as unknown as { auth: { userId: number } }).auth;
      const currentPassword =
        typeof req.body?.currentPassword === 'string'
          ? req.body.currentPassword
          : '';
      const newPassword =
        typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      const confirmPassword =
        typeof req.body?.confirmPassword === 'string'
          ? req.body.confirmPassword
          : '';
      const details: { field: string; message: string }[] = [];
      if (!currentPassword) {
        details.push({
          field: 'currentPassword',
          message: 'Current password is required'
        });
      }
      const policyError = validatePasswordPolicy(newPassword);
      if (policyError) {
        details.push({ field: 'newPassword', message: policyError });
      }
      if (newPassword !== confirmPassword) {
        details.push({
          field: 'confirmPassword',
          message: 'Passwords do not match'
        });
      }
      if (details.length > 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password change is invalid',
            details
          }
        });
      }
      const user = await prisma.user.findUnique({
        where: { id: auth.userId }
      });
      if (!user) {
        return res.status(401).json({
          error: { code: 'UNAUTHENTICATED', message: 'Authentication required' }
        });
      }
      const ok = await verifyPassword(currentPassword, user.passwordHash);
      if (!ok) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Current password is incorrect'
          }
        });
      }
      if (await verifyPassword(newPassword, user.passwordHash)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password change is invalid',
            details: [
              {
                field: 'newPassword',
                message: 'New password must differ from the current password'
              }
            ]
          }
        });
      }
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(newPassword),
          mustChangePassword: false
        }
      });
      res.json({ user: toSafeUser(updated) });
    } catch {
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Password change failed' }
      });
    }
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

  // Session identity for all Requester operations (AC-03).
  // Client-supplied requester ids are ignored, never trusted.
  function sessionUser(req: express.Request) {
    return (req as AuthenticatedRequest).auth!;
  }

  const requesterGuards = [requireAuth, requirePasswordChanged, requireRole('REQUESTER')];

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

  app.post('/api/tickets', ...requesterGuards, async (req, res) => {
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

      const requesterId = sessionUser(req).userId;

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
        prisma.user.findFirst({
          where: { id: requesterId, isActive: true }
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
              itPriority: body.requestedPriority,
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

  app.get('/api/tickets', ...requesterGuards, async (req, res) => {
    try {
      const q = req.query as Record<string, string | undefined>;
      // Forged requesterId query params are ignored (AC-03).
      const requesterId = sessionUser(req).userId;

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

  app.get('/api/tickets/:id', ...requesterGuards, async (req, res) => {
    try {
      const requesterId = sessionUser(req).userId;
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
          owner: { select: { id: true, name: true } },
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

  function validateCommentBody(body: unknown):
    | { ok: true; text: string }
    | { ok: false; details: { field: string; message: string }[] } {
    const text = typeof body === 'string' ? body.trim() : '';
    if (!text) {
      return {
        ok: false,
        details: [{ field: 'body', message: 'Comment must not be empty' }]
      };
    }
    if (text.length > 2000) {
      return {
        ok: false,
        details: [{ field: 'body', message: 'Comment must be at most 2000 characters' }]
      };
    }
    return { ok: true, text };
  }

  const authorSelect = { id: true, name: true, role: true };

  async function loadTicketForRole(
    ticketId: number,
    auth: { userId: number; role: string }
  ) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { error: 'NOT_FOUND' as const };
    if (auth.role === 'REQUESTER' && ticket.requesterId !== auth.userId) {
      return { error: 'ACCESS_DENIED' as const };
    }
    if (!['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'].includes(auth.role)) {
      return { error: 'ACCESS_DENIED' as const };
    }
    return { ticket };
  }

  function denied(res: express.Response) {
    return res.status(403).json({
      error: { code: 'ACCESS_DENIED', message: 'Access denied' }
    });
  }

  // Public Comments: Requester (owner) + IT Staff post/list; Admin read-only.
  app.get('/api/tickets/:id/comments', requireAuth, requirePasswordChanged, async (req, res) => {
    try {
      const auth = sessionUser(req);
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
        });
      }
      const loaded = await loadTicketForRole(ticketId, auth);
      if (loaded.error === 'NOT_FOUND') {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      }
      if (loaded.error) return denied(res);
      const comments = await prisma.publicComment.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, body: true, createdAt: true, author: { select: authorSelect } }
      });
      res.json(comments);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load comments' } });
    }
  });

  app.post('/api/tickets/:id/comments', requireAuth, requirePasswordChanged, async (req, res) => {
    try {
      const auth = sessionUser(req);
      if (auth.role === 'ADMINISTRATOR') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
        });
      }
      const loaded = await loadTicketForRole(ticketId, auth);
      if (loaded.error === 'NOT_FOUND') {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      }
      if (loaded.error) return denied(res);
      const check = validateCommentBody(req.body?.body);
      if (!check.ok) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Comment is invalid', details: check.details }
        });
      }
      const comment = await prisma.publicComment.create({
        data: { ticketId, authorId: auth.userId, body: check.text },
        select: { id: true, body: true, createdAt: true, author: { select: authorSelect } }
      });
      res.status(201).json(comment);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to post comment' } });
    }
  });

  // Internal Notes: IT Staff + Administrator read; IT Staff only writes.
  // Requester gets 403 with no note content (AC-04).
  app.get('/api/tickets/:id/notes', requireAuth, requirePasswordChanged, async (req, res) => {
    try {
      const auth = sessionUser(req);
      if (auth.role === 'REQUESTER') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
        });
      }
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      }
      const notes = await prisma.internalNote.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, body: true, createdAt: true, author: { select: authorSelect } }
      });
      res.json(notes);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load notes' } });
    }
  });

  app.post('/api/tickets/:id/notes', requireAuth, requirePasswordChanged, async (req, res) => {
    try {
      const auth = sessionUser(req);
      if (auth.role !== 'IT_STAFF') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
        });
      }
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      }
      const check = validateCommentBody(req.body?.body);
      if (!check.ok) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Note is invalid', details: check.details }
        });
      }
      const note = await prisma.internalNote.create({
        data: { ticketId, authorId: auth.userId, body: check.text },
        select: { id: true, body: true, createdAt: true, author: { select: authorSelect } }
      });
      res.status(201).json(note);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to post note' } });
    }
  });

  // Requester flag only — never changes currentStatus (BR-05).
  app.patch('/api/tickets/:id/appears-resolved', ...requesterGuards, async (req, res) => {
    try {
      const auth = sessionUser(req);
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
        });
      }
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      }
      if (ticket.requesterId !== auth.userId) return denied(res);
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { appearsResolved: true, appearsResolvedAt: new Date() },
        select: { id: true, appearsResolved: true, appearsResolvedAt: true, currentStatus: true }
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update ticket' } });
    }
  });

  app.post('/api/tickets/:id/attachments', ...requesterGuards, (req, res) => {
    const single = upload.single('file');
    single(req as never, res as never, async (err: unknown) => {
      try {
        const requesterId = sessionUser(req).userId;
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

  app.get('/api/attachments/:id/download', ...requesterGuards, async (req, res) => {
    try {
      const requesterId = sessionUser(req).userId;
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

  app.patch('/api/attachments/:id/remove', ...requesterGuards, async (req, res) => {
    try {
      const requesterId = sessionUser(req).userId;
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
