import type { NextFunction, Request, Response } from 'express';

import { verifySession } from './auth.js';
import type { Role } from './auth.js';
import { SESSION_COOKIE } from './auth.js';
import { prisma } from './db.js';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: number;
    role: Role;
    mustChangePassword: boolean;
  };
}

function readSessionCookie(req: Request): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookies && typeof cookies[SESSION_COOKIE] === 'string') {
    return cookies[SESSION_COOKIE];
  }
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=');
  }
  return undefined;
}

/** 401 when no/invalid/expired session. Loads fresh role + flags from DB. */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = readSessionCookie(req);
    if (!token) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' }
      });
    }
    const payload = verifySession(token);
    if (!payload) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' }
      });
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true, mustChangePassword: true }
    });
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' }
      });
    }
    req.auth = {
      userId: user.id,
      role: user.role as Role,
      mustChangePassword: user.mustChangePassword
    };
    if (!user.isActive) {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is deactivated. Please contact support.'
        }
      });
    }
    next();
  } catch {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' }
    });
  }
}

/**
 * Blocks users that must change their initial password from every API
 * except the allowlisted auth routes (mounted without this middleware).
 */
export function requirePasswordChanged(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.auth?.mustChangePassword) {
    return res.status(403).json({
      error: {
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Password change required before continuing'
      }
    });
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Access denied' }
      });
    }
    next();
  };
}
