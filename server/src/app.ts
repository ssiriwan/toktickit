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
import {
  ACTION_STATUSES,
  checkActionPerformer,
  isActionTransitionAllowed,
  validateActionDateTime,
  validateActionDescription,
  validateActionResult,
  validateFollowUpNote
} from './action-validation.js';
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
  // Requester gets 403 with no note content (AC-04). Roles enforced at the
  // middleware layer (fail closed); handlers assume an allowed role.
  app.get(
    '/api/tickets/:id/notes',
    requireAuth,
    requirePasswordChanged,
    requireRole('IT_STAFF', 'ADMINISTRATOR'),
    async (req, res) => {
      try {
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
    }
  );

  app.post(
    '/api/tickets/:id/notes',
    requireAuth,
    requirePasswordChanged,
    requireRole('IT_STAFF'),
    async (req, res) => {
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
    }
  );

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

  const staffGuards = [
    requireAuth,
    requirePasswordChanged,
    requireRole('IT_STAFF', 'ADMINISTRATOR')
  ];

  const itStaffGuards = [
    requireAuth,
    requirePasswordChanged,
    requireRole('IT_STAFF')
  ];

  const STATUSES = [
    'NEW',
    'OPEN',
    'IN_PROGRESS',
    'WAITING_FOR_REQUESTER',
    'RESOLVED',
    'CLOSED',
    'REOPENED',
    'CANCELLED'
  ];
  const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const QUEUE_SORTS: Record<string, string> = {
    ticketDate: 'ticketDate',
    createdDate: 'ticketDate',
    updatedAt: 'updatedAt',
    requestedPriority: 'requestedPriority',
    itPriority: 'itPriority'
  };

  function invalidQuery(res: express.Response) {
    return res.status(400).json({
      error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' }
    });
  }

  function parsePositiveInt(raw: string | undefined): number | undefined | null {
    if (raw === undefined) return undefined;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) return null;
    return n;
  }

  // Staff queue: IT Staff full access, Administrator read-only (same GETs).
  app.get('/api/staff/tickets', ...staffGuards, async (req, res) => {
    try {
      const auth = sessionUser(req);
      const q = req.query as Record<string, string | undefined>;
      const search = q.search?.trim() ?? '';

      const status = q.status?.trim();
      if (status !== undefined && status !== '' && !STATUSES.includes(status)) {
        return invalidQuery(res);
      }
      const reqPriority = q.reqPriority?.trim();
      if (reqPriority !== undefined && reqPriority !== '' && !PRIORITIES.includes(reqPriority)) {
        return invalidQuery(res);
      }
      const itPriority = q.itPriority?.trim();
      if (itPriority !== undefined && itPriority !== '' && !PRIORITIES.includes(itPriority)) {
        return invalidQuery(res);
      }

      const categoryId = parsePositiveInt(q.categoryId);
      if (categoryId === null) return invalidQuery(res);
      const relatedSystemId = parsePositiveInt(q.relatedSystemId);
      if (relatedSystemId === null) return invalidQuery(res);

      const ownerRaw = q.owner?.trim();
      let ownerId: number | null | undefined;
      if (ownerRaw !== undefined && ownerRaw !== '') {
        if (ownerRaw === 'me') ownerId = auth.userId;
        else if (ownerRaw === 'unassigned') ownerId = null;
        else {
          const n = Number(ownerRaw);
          if (!Number.isInteger(n) || n < 1) return invalidQuery(res);
          ownerId = n;
        }
      }

      const sortKey = QUEUE_SORTS[q.sort?.trim() ?? ''] ?? (q.sort === undefined ? 'updatedAt' : null);
      if (sortKey === null) return invalidQuery(res);
      const orderRaw = q.order?.trim();
      if (orderRaw !== undefined && orderRaw !== '' && orderRaw !== 'asc' && orderRaw !== 'desc') {
        return invalidQuery(res);
      }
      const order = orderRaw === 'asc' ? 'asc' : 'desc';
      const pageRaw = parsePositiveInt(q.page);
      if (pageRaw === null) return invalidQuery(res);
      const page = pageRaw ?? 1;
      const pageSizeRaw = parsePositiveInt(q.pageSize);
      if (pageSizeRaw === null || (pageSizeRaw !== undefined && pageSizeRaw > 50)) {
        return invalidQuery(res);
      }
      const pageSize = pageSizeRaw ?? 10;

      const where: Record<string, unknown> = {};
      if (status) where.currentStatus = status;
      if (reqPriority) where.requestedPriority = reqPriority;
      if (itPriority) where.itPriority = itPriority;
      if (categoryId !== undefined) where.categoryId = categoryId;
      if (relatedSystemId !== undefined) where.relatedSystemId = relatedSystemId;
      if (ownerId !== undefined) where.ownerId = ownerId;
      if (search) {
        where.OR = [
          { ticketNumber: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const totalItems = await prisma.ticket.count({ where: where as never });
      const totalPages = Math.ceil(totalItems / (pageSize as number)) || 1;
      const tickets = await prisma.ticket.findMany({
        where: where as never,
        orderBy: { [sortKey as string]: order },
        skip: ((page as number) - 1) * (pageSize as number),
        take: pageSize as number,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,
          currentStatus: true,
          requestedPriority: true,
          itPriority: true,
          ticketDate: true,
          updatedAt: true,
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } }
        }
      });
      res.json({ tickets, pagination: { page, pageSize, totalItems, totalPages } });
    } catch {
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load ticket queue' }
      });
    }
  });

  app.get('/api/staff/tickets/:id', ...staffGuards, async (req, res) => {
    try {
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return invalidQuery(res);
      }
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          publicComments: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, body: true, createdAt: true, author: { select: authorSelect } }
          },
          internalNotes: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, body: true, createdAt: true, author: { select: authorSelect } }
          },
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
      res.json(ticket);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load ticket' } });
    }
  });

  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    NEW: ['OPEN', 'CANCELLED'],
    OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'],
    IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
    WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'CANCELLED'],
    RESOLVED: ['CLOSED', 'REOPENED'],
    CLOSED: ['REOPENED'],
    REOPENED: ['IN_PROGRESS', 'CANCELLED'],
    CANCELLED: []
  };

  function validationError(res: express.Response, details: { field: string; message: string }[]) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details }
    });
  }

  app.patch('/api/tickets/:id/owner', ...staffGuards, async (req, res) => {
    try {
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) return invalidQuery(res);
      const raw = req.body?.ownerId;
      let ownerId: number | null | undefined;
      if (raw === null || raw === undefined || raw === '') {
        ownerId = null;
      } else {
        const n = Number(raw);
        if (!Number.isInteger(n) || n <= 0) {
          return validationError(res, [{ field: 'ownerId', message: 'Invalid owner' }]);
        }
        ownerId = n;
      }
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      if (ownerId !== null && ownerId !== undefined) {
        const target = await prisma.user.findUnique({ where: { id: ownerId } });
        if (!target || !target.isActive || !['IT_STAFF', 'ADMINISTRATOR'].includes(target.role)) {
          return validationError(res, [{ field: 'ownerId', message: 'Owner must be an active IT Staff or Administrator' }]);
        }
      }
      // AD-13 / BR-14 coupling: assigning from NEW opens the ticket; unassigning
      // active work returns it to NEW, while terminal/done states keep their status.
      const ACTIVE_WORK = new Set(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED']);
      let nextStatus: string | undefined;
      if (ownerId !== null && ticket.currentStatus === 'NEW') nextStatus = 'OPEN';
      if (ownerId === null && ACTIVE_WORK.has(ticket.currentStatus)) nextStatus = 'NEW';
      const data: Record<string, unknown> = { ownerId };
      if (nextStatus) data.currentStatus = nextStatus;
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: data as never,
        select: { id: true, ownerId: true, currentStatus: true, updatedAt: true, owner: { select: { id: true, name: true } } }
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update owner' } });
    }
  });

  // Contract aliases per spec §8: POST /staff/claim + POST /staff/assign + PATCH priority/status
  async function handleClaim(req: express.Request, res: express.Response) {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) return invalidQuery(res);
    const auth = sessionUser(req);
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    if (ticket.ownerId !== null && ticket.ownerId !== auth.userId) {
      return res.status(409).json({
        error: { code: 'ALREADY_ASSIGNED', message: 'Ticket is already assigned to another user' }
      });
    }
    if (ticket.ownerId === auth.userId) {
      // Self re-claim is a no-op (AD-09).
      const same = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, ownerId: true, currentStatus: true, updatedAt: true, owner: { select: { id: true, name: true } } }
      });
      return res.json(same);
    }
    const nextStatus = ticket.currentStatus === 'NEW' ? 'OPEN' : ticket.currentStatus;
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { ownerId: auth.userId, currentStatus: nextStatus as never },
      select: { id: true, ownerId: true, currentStatus: true, updatedAt: true, owner: { select: { id: true, name: true } } }
    });
    return res.json(updated);
  }

  async function handleAssign(req: express.Request, res: express.Response) {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) return invalidQuery(res);
    const raw = req.body?.ownerId;
    let ownerId: number | null | undefined;
    if (raw === null || raw === undefined || raw === '') ownerId = null;
    else {
      const n = Number(raw);
      if (!Number.isInteger(n) || n <= 0) {
        return validationError(res, [{ field: 'ownerId', message: 'Invalid owner' }]);
      }
      ownerId = n;
    }
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    if (ownerId !== null && ownerId !== undefined) {
      const target = await prisma.user.findUnique({ where: { id: ownerId } });
      if (!target || !target.isActive || !['IT_STAFF', 'ADMINISTRATOR'].includes(target.role)) {
        return validationError(res, [{ field: 'ownerId', message: 'Owner must be an active IT Staff or Administrator' }]);
      }
    }
    const ACTIVE_WORK = new Set(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED']);
    let nextStatus: string | undefined;
    if (ownerId !== null && ticket.currentStatus === 'NEW') nextStatus = 'OPEN';
    if (ownerId === null && ACTIVE_WORK.has(ticket.currentStatus)) nextStatus = 'NEW';
    const data: Record<string, unknown> = { ownerId };
    if (nextStatus) data.currentStatus = nextStatus;
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: data as never,
      select: { id: true, ownerId: true, currentStatus: true, updatedAt: true, owner: { select: { id: true, name: true } } }
    });
    return res.json(updated);
  }

  // Keep legacy PATCH owner for backward compat; frontends should use claim/assign.
  app.post('/api/staff/tickets/:id/claim', ...staffGuards, async (req, res) => {
    try {
      await handleClaim(req, res);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to claim ticket' } });
    }
  });
  app.post('/api/staff/tickets/:id/assign', ...staffGuards, async (req, res) => {
    try {
      await handleAssign(req, res);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to assign ticket' } });
    }
  });
  // Alias staff mutation paths (spec primary) + legacy /tickets paths
  app.patch('/api/staff/tickets/:id/priority', ...staffGuards, async (req, res) => {
    // delegate to same logic as legacy handler to keep one code path
    (req as unknown as { url: string }).url = `/api/tickets/${req.params.id}/priority`;
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) return invalidQuery(res);
    const itPriority = typeof req.body?.itPriority === 'string' ? req.body.itPriority.trim() : '';
    if (!PRIORITIES.includes(itPriority)) return validationError(res, [{ field: 'itPriority', message: 'Invalid priority' }]);
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { itPriority: itPriority as never },
      select: { id: true, itPriority: true, requestedPriority: true, updatedAt: true }
    });
    return res.json(updated);
  });
  app.patch('/api/staff/tickets/:id/status', ...staffGuards, async (req, res) => {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) return invalidQuery(res);
    const status = typeof req.body?.status === 'string' ? req.body.status.trim() : '';
    if (!STATUSES.includes(status)) return validationError(res, [{ field: 'status', message: 'Invalid status' }]);
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    const allowed = ALLOWED_TRANSITIONS[ticket.currentStatus] ?? [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Transition from ${ticket.currentStatus} to ${status} is not permitted`,
          details: [{ field: 'status', message: `Allowed: ${allowed.join(', ') || 'none'}` }]
        }
      });
    }
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { currentStatus: status as never },
      select: { id: true, currentStatus: true, updatedAt: true }
    });
    return res.json(updated);
  });

  app.patch('/api/tickets/:id/priority', ...staffGuards, async (req, res) => {
    try {
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) return invalidQuery(res);
      const itPriority = typeof req.body?.itPriority === 'string' ? req.body.itPriority.trim() : '';
      if (!PRIORITIES.includes(itPriority)) {
        return validationError(res, [{ field: 'itPriority', message: 'Invalid priority' }]);
      }
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { itPriority: itPriority as never },
        select: { id: true, itPriority: true, requestedPriority: true, updatedAt: true }
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update priority' } });
    }
  });

  app.patch('/api/tickets/:id/status', ...staffGuards, async (req, res) => {
    try {
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) return invalidQuery(res);
      const status = typeof req.body?.status === 'string' ? req.body.status.trim() : '';
      if (!STATUSES.includes(status)) {
        return validationError(res, [{ field: 'status', message: 'Invalid status' }]);
      }
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      const allowed = ALLOWED_TRANSITIONS[ticket.currentStatus] ?? [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Transition from ${ticket.currentStatus} to ${status} is not permitted`,
            details: [{ field: 'status', message: `Allowed: ${allowed.join(', ') || 'none'}` }]
          }
        });
      }
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { currentStatus: status as never },
        select: { id: true, currentStatus: true, updatedAt: true }
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update status' } });
    }
  });

  // Staff-scoped comment/note routes — aliases that IT/Admin must use
  // (requester routes under /api/tickets remain for Requester; these are the staff contract)
  app.get('/api/staff/tickets/:id/comments', ...staffGuards, async (req, res) => {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) return invalidQuery(res);
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    const comments = await prisma.publicComment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, body: true, createdAt: true, author: { select: authorSelect } }
    });
    return res.json(comments);
  });
  app.post('/api/staff/tickets/:id/comments', ...staffGuards, async (req, res) => {
    const auth = sessionUser(req);
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) return invalidQuery(res);
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    const check = validateCommentBody(req.body?.body);
    if (!check.ok) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Comment is invalid', details: check.details } });
    const comment = await prisma.publicComment.create({
      data: { ticketId, authorId: auth.userId, body: check.text },
      select: { id: true, body: true, createdAt: true, author: { select: authorSelect } }
    });
    return res.status(201).json(comment);
  });
  app.get('/api/staff/tickets/:id/notes', ...staffGuards, async (req, res) => {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) return invalidQuery(res);
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    const notes = await prisma.internalNote.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, body: true, createdAt: true, author: { select: authorSelect } }
    });
    return res.json(notes);
  });
  app.post('/api/staff/tickets/:id/notes', ...itStaffGuards, async (req, res) => {
    const auth = sessionUser(req);
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) return invalidQuery(res);
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    const check = validateCommentBody(req.body?.body);
    if (!check.ok) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Note is invalid', details: check.details } });
    const note = await prisma.internalNote.create({
      data: { ticketId, authorId: auth.userId, body: check.text },
      select: { id: true, body: true, createdAt: true, author: { select: authorSelect } }
    });
    return res.status(201).json(note);
  });

  // Lab 4: Actions Taken — staff list/create/update + requester read-only.
  const actionPerformerSelect = { id: true, name: true, role: true };
  const actionSelect = {
    id: true,
    ticketId: true,
    actionDateTime: true,
    description: true,
    result: true,
    status: true,
    performedBy: { select: actionPerformerSelect },
    followUpRequired: true,
    followUpNote: true,
    attachmentNotes: true,
    createdAt: true,
    updatedAt: true
  };

  function inactiveAssigneeError(res: express.Response) {
    return res.status(400).json({
      error: { code: 'INACTIVE_ASSIGNEE', message: 'Assignee is no longer active' }
    });
  }

  function actionValidationError(res: express.Response, details: { field: string; message: string }[]) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Action is invalid', details }
    });
  }

  /** BR-03/BR-04 gate shared by create + performer reassignment. */
  async function resolveActionPerformer(
    res: express.Response,
    performedById: number
  ): Promise<{ id: number; role: string; isActive: boolean } | undefined> {
    if (!Number.isInteger(performedById) || performedById <= 0) {
      actionValidationError(res, [{ field: 'performedById', message: 'Assignee is invalid' }]);
      return undefined;
    }
    const user = await prisma.user.findUnique({
      where: { id: performedById },
      select: { id: true, role: true, isActive: true }
    });
    const check = checkActionPerformer(user);
    if (!check.ok) {
      if (check.code === 'INACTIVE_ASSIGNEE') return inactiveAssigneeError(res) as unknown as undefined;
      return actionValidationError(res, [{ field: 'performedById', message: check.message }]) as unknown as undefined;
    }
    return user as { id: number; role: string; isActive: boolean };
  }

  function parseActionId(raw: unknown): number | null {
    if (typeof raw !== 'string') return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) return null;
    return n;
  }

  // ACT-02/ACT-08: list actions asc (staff route + requester owner-scoped route below).
  app.get('/api/staff/tickets/:id/actions', ...staffGuards, async (req, res) => {
    try {
      const ticketId = parseActionId(req.params.id);
      if (ticketId === null) return invalidQuery(res);
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      const actions = await prisma.actionTaken.findMany({
        where: { ticketId },
        orderBy: { actionDateTime: 'asc' },
        select: actionSelect
      });
      return res.json(actions);
    } catch {
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load actions' } });
    }
  });

  // ACT-01/ACT-03..05/ACT-11/ACT-12: staff creates an action.
  app.post('/api/staff/tickets/:id/actions', ...staffGuards, async (req, res) => {
    try {
      const auth = sessionUser(req);
      const ticketId = parseActionId(req.params.id);
      if (ticketId === null) return invalidQuery(res);
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      const body = req.body ?? {};

      const desc = validateActionDescription(body.description);
      if (!desc.ok) return actionValidationError(res, desc.details);
      const when = validateActionDateTime(body.actionDateTime);
      if (!when.ok) return actionValidationError(res, when.details);
      const status = body.status === undefined ? 'PENDING' : body.status;
      if (!(ACTION_STATUSES as readonly string[]).includes(status)) {
        return actionValidationError(res, [{ field: 'status', message: 'Status is invalid' }]);
      }
      const performerId = body.performedById === undefined ? auth.userId : Number(body.performedById);
      const performer = await resolveActionPerformer(res, performerId);
      if (!performer) return;
      const followUpRequired = body.followUpRequired === undefined ? false : body.followUpRequired;
      if (typeof followUpRequired !== 'boolean') {
        return actionValidationError(res, [{ field: 'followUpRequired', message: 'Follow-up flag must be a boolean' }]);
      }
      const note = validateFollowUpNote(followUpRequired, body.followUpNote);
      if (!note.ok) return actionValidationError(res, note.details);
      const result = validateActionResult(status, body.result, null);
      if (!result.ok) return actionValidationError(res, result.details);
      let attachmentNotes: string | null = null;
      if (body.attachmentNotes !== undefined && body.attachmentNotes !== null) {
        if (typeof body.attachmentNotes !== 'string') {
          return actionValidationError(res, [{ field: 'attachmentNotes', message: 'Attachment notes must be a string' }]);
        }
        attachmentNotes = body.attachmentNotes.trim() || null;
      }

      const created = await prisma.actionTaken.create({
        data: {
          ticketId,
          actionDateTime: when.value,
          description: desc.value,
          result: result.value,
          status,
          performedById: performer.id,
          followUpRequired,
          followUpNote: note.value,
          attachmentNotes
        },
        select: actionSelect
      });
      return res.status(201).json(created);
    } catch {
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create action' } });
    }
  });

  // ACT-09/ACT-10: staff partially updates an action (scoped to its ticket).
  app.patch('/api/staff/tickets/:id/actions/:actionId', ...staffGuards, async (req, res) => {
    try {
      const ticketId = parseActionId(req.params.id);
      const actionId = parseActionId(req.params.actionId);
      if (ticketId === null || actionId === null) return invalidQuery(res);
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      const action = await prisma.actionTaken.findFirst({ where: { id: actionId, ticketId } });
      if (!action) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Action not found' } });
      const body = req.body ?? {};
      const data: Record<string, unknown> = {};

      if (body.description !== undefined) {
        const desc = validateActionDescription(body.description);
        if (!desc.ok) return actionValidationError(res, desc.details);
        data.description = desc.value;
      }
      if (body.actionDateTime !== undefined) {
        const when = validateActionDateTime(body.actionDateTime);
        if (!when.ok) return actionValidationError(res, when.details);
        data.actionDateTime = when.value;
      }
      const targetStatus = body.status === undefined ? action.status : body.status;
      if (body.status !== undefined) {
        if (
          !(ACTION_STATUSES as readonly string[]).includes(body.status) ||
          !isActionTransitionAllowed(action.status, body.status)
        ) {
          return actionValidationError(res, [
            { field: 'status', message: `Transition from ${action.status} to ${body.status} is not permitted` }
          ]);
        }
        data.status = body.status;
      }
      if (body.performedById !== undefined) {
        const performer = await resolveActionPerformer(res, Number(body.performedById));
        if (!performer) return;
        data.performedById = performer.id;
      }
      const targetFollowUp = body.followUpRequired === undefined ? action.followUpRequired : body.followUpRequired;
      if (body.followUpRequired !== undefined) {
        if (typeof body.followUpRequired !== 'boolean') {
          return actionValidationError(res, [{ field: 'followUpRequired', message: 'Follow-up flag must be a boolean' }]);
        }
        data.followUpRequired = body.followUpRequired;
      }
      if (body.followUpNote !== undefined || body.followUpRequired !== undefined) {
        const note = validateFollowUpNote(targetFollowUp, body.followUpNote === undefined ? action.followUpNote : body.followUpNote);
        if (!note.ok) return actionValidationError(res, note.details);
        data.followUpNote = note.value;
      }
      if (body.result !== undefined) {
        if (body.result !== null && typeof body.result !== 'string') {
          return actionValidationError(res, [{ field: 'result', message: 'Result must be a string' }]);
        }
        const trimmed = typeof body.result === 'string' ? body.result.trim() : '';
        if (trimmed.length > 2000) {
          return actionValidationError(res, [{ field: 'result', message: 'Result must be at most 2000 characters' }]);
        }
        if (targetStatus === 'COMPLETED' && trimmed === '') {
          return actionValidationError(res, [{ field: 'result', message: 'Result cannot be cleared while COMPLETED' }]);
        }
        data.result = trimmed || null;
      } else if (targetStatus === 'COMPLETED' && !(typeof action.result === 'string' && action.result.trim())) {
        const missing = validateActionResult(targetStatus, undefined, action.result);
        if (!missing.ok) return actionValidationError(res, missing.details);
        data.result = missing.value;
      }
      if (body.attachmentNotes !== undefined) {
        if (body.attachmentNotes !== null && typeof body.attachmentNotes !== 'string') {
          return actionValidationError(res, [{ field: 'attachmentNotes', message: 'Attachment notes must be a string' }]);
        }
        data.attachmentNotes = typeof body.attachmentNotes === 'string' ? body.attachmentNotes.trim() || null : null;
      }

      const updated = await prisma.actionTaken.update({
        where: { id: action.id },
        data,
        select: actionSelect
      });
      return res.json(updated);
    } catch {
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update action' } });
    }
  });

  // ACT-08 (FR-08/BR-09): requester reads own ticket's actions, read-only.
  app.get('/api/tickets/:id/actions', ...requesterGuards, async (req, res) => {
    try {
      const auth = sessionUser(req);
      const ticketId = parseActionId(req.params.id);
      if (ticketId === null) return invalidQuery(res);
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
      if (ticket.requesterId !== auth.userId) return denied(res);
      const actions = await prisma.actionTaken.findMany({
        where: { ticketId },
        orderBy: { actionDateTime: 'asc' },
        select: actionSelect
      });
      return res.json(actions);
    } catch {
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load actions' } });
    }
  });

  // STOP-06: staff user directory (active IT/Admin ordered by name, requester 403)
  app.get('/api/staff/users', ...staffGuards, async (_req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true, role: { in: ['IT_STAFF', 'ADMINISTRATOR'] } },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, email: true, role: true }
      });
      res.json(users);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load users' } });
    }
  });

  // AC-31 / STOP-05: staff attachment download (IT/Admin can download any ticket's attachments)
  app.get('/api/staff/attachments/:id/download', ...staffGuards, async (req, res) => {
    try {
      const attachmentId = Number(req.params.id);
      if (!Number.isInteger(attachmentId) || attachmentId <= 0) return invalidQuery(res);
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        include: { ticket: { select: { id: true } } }
      });
      if (!attachment) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attachment not found' } });
      if (attachment.isRemoved) return res.status(410).json({ error: { code: 'REMOVED', message: 'Attachment has been removed' } });
      const filePath = path.join(uploadsDir, attachment.storedFilename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Attachment not found' } });
      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
      fs.createReadStream(filePath).pipe(res);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to download attachment' } });
    }
  });

  // AC-12..16 / ADMIN-01..07: admin user management (Administrator only).
  const adminGuards = [
    requireAuth,
    requirePasswordChanged,
    requireRole('ADMINISTRATOR')
  ];
  const ADMIN_ROLES = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'];
  const adminSelect = {
    id: true, name: true, email: true, role: true,
    isActive: true, mustChangePassword: true, createdAt: true
  };

  function dupEmailError(res: express.Response) {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_EMAIL',
        message: 'Email is already in use',
        details: [{ field: 'email', message: 'Email is already in use' }]
      }
    });
  }

  function validEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /** True when deactivating/demoting this target would leave zero active admins. */
  async function isLastActiveAdmin(targetId: number): Promise<boolean> {
    const others = await prisma.user.count({
      where: { role: 'ADMINISTRATOR', isActive: true, id: { not: targetId } }
    });
    return others === 0;
  }

  // ADMIN-01: list ordered by name; search name/email; single role filter.
  app.get('/api/admin/users', ...adminGuards, async (req, res) => {
    try {
      const q = req.query as Record<string, string | undefined>;
      const role = q.role?.trim();
      if (role !== undefined && role !== '' && !ADMIN_ROLES.includes(role)) {
        return invalidQuery(res);
      }
      const search = q.search?.trim() ?? '';
      const users = await prisma.user.findMany({
        where: {
          ...(role ? { role: role as 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR' } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } }
                ]
              }
            : {})
        },
        orderBy: { name: 'asc' },
        select: adminSelect
      });
      res.json({ users });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load users' } });
    }
  });

  // ADMIN-02/03: create with initial password (must change at next login).
  app.post('/api/admin/users', ...adminGuards, async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const role = typeof body.role === 'string' ? body.role : '';
      const isActive = body.isActive;
      const initialPassword = body.initialPassword;
      const details: { field: string; message: string }[] = [];
      if (!name || name.length > 100) details.push({ field: 'name', message: 'Name must be 1..100 characters' });
      if (!validEmail(email)) details.push({ field: 'email', message: 'Valid email is required' });
      if (!ADMIN_ROLES.includes(role)) details.push({ field: 'role', message: 'Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR' });
      if (typeof isActive !== 'boolean') details.push({ field: 'isActive', message: 'Active must be true or false' });
      const passwordIssue = validatePasswordPolicy(initialPassword);
      if (passwordIssue) details.push({ field: 'initialPassword', message: passwordIssue });
      if (details.length > 0) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid user data', details } });
      }
      const existing = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
      });
      if (existing) return dupEmailError(res);
      const created = await prisma.user.create({
        data: {
          name, email, role: role as 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR',
          isActive: isActive as boolean,
          passwordHash: await hashPassword(initialPassword as string),
          mustChangePassword: true
        },
        select: adminSelect
      });
      res.status(201).json(toSafeUser(created as Parameters<typeof toSafeUser>[0]));
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' } });
    }
  });

  // ADMIN-04/05/06: edit with self-deactivate + last-admin guards.
  app.patch('/api/admin/users/:id', ...adminGuards, async (req, res) => {
    try {
      const auth = sessionUser(req);
      const targetId = Number(req.params.id);
      if (!Number.isInteger(targetId) || targetId <= 0) return invalidQuery(res);
      const target = await prisma.user.findUnique({ where: { id: targetId } });
      if (!target) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const data: Record<string, unknown> = {};
      const details: { field: string; message: string }[] = [];
      if (body.name !== undefined) {
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name || name.length > 100) details.push({ field: 'name', message: 'Name must be 1..100 characters' });
        else data.name = name;
      }
      if (body.email !== undefined) {
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (!validEmail(email)) details.push({ field: 'email', message: 'Valid email is required' });
        else {
          const clash = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' }, id: { not: targetId } }
          });
          if (clash) return dupEmailError(res);
          data.email = email;
        }
      }
      if (body.role !== undefined) {
        if (typeof body.role !== 'string' || !ADMIN_ROLES.includes(body.role)) {
          details.push({ field: 'role', message: 'Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR' });
        } else data.role = body.role;
      }
      if (body.isActive !== undefined) {
        if (typeof body.isActive !== 'boolean') {
          details.push({ field: 'isActive', message: 'Active must be true or false' });
        } else data.isActive = body.isActive;
      }
      if (details.length > 0) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid user data', details } });
      }
      if (targetId === auth.userId && data.isActive === false) {
        return res.status(403).json({
          error: { code: 'SELF_DEACTIVATION', message: 'You cannot deactivate your own account' }
        });
      }
      const removesAdmin =
        target.role === 'ADMINISTRATOR' &&
        target.isActive &&
        (data.isActive === false || (typeof data.role === 'string' && data.role !== 'ADMINISTRATOR'));
      if (removesAdmin && (await isLastActiveAdmin(targetId))) {
        return res.status(409).json({
          error: { code: 'LAST_ADMIN', message: 'At least one active administrator must remain' }
        });
      }
      const updated = await prisma.user.update({
        where: { id: targetId },
        data: data as never,
        select: adminSelect
      });
      res.json(toSafeUser(updated as Parameters<typeof toSafeUser>[0]));
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' } });
    }
  });

  // ADMIN-07: reset to a new initial password (target must change at next login).
  app.post('/api/admin/users/:id/reset-password', ...adminGuards, async (req, res) => {
    try {
      const targetId = Number(req.params.id);
      if (!Number.isInteger(targetId) || targetId <= 0) return invalidQuery(res);
      const target = await prisma.user.findUnique({ where: { id: targetId } });
      if (!target) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      }
      const initialPassword = (req.body ?? {} as Record<string, unknown>).initialPassword;
      const issue = validatePasswordPolicy(initialPassword);
      if (issue) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid password', details: [{ field: 'initialPassword', message: issue }] }
        });
      }
      await prisma.user.update({
        where: { id: targetId },
        data: { passwordHash: await hashPassword(initialPassword as string), mustChangePassword: true }
      });
      res.json({ id: targetId, mustChangePassword: true });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reset password' } });
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
