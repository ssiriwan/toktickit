import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const SESSION_COOKIE = 'toktickit_session';
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';

export interface SessionPayload {
  sub: number;
  role: Role;
}

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

const PASSWORD_RULES = {
  minLength: 8
};

/**
 * Fixed bcrypt hash used for dummy comparisons when no user is found,
 * keeping login timing indistinguishable (anti-enumeration).
 * Value: bcrypt(cost 12) of 'Requester123!'. Never used as a real credential.
 */
export const DUMMY_PASSWORD_HASH =
  '$2b$12$dcBfxRywmOkkZF/75BrpUu8BJyuZKL4PVBgi13s8B/3rGPj2k0kv2';

export function getJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    // Fail closed in production: a committed fallback secret would let
    // anyone forge sessions, so refuse to boot without a real secret.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[auth] AUTH_JWT_SECRET must be set in production.');
    }
    console.warn(
      '[auth] AUTH_JWT_SECRET is not set — using dev-only fallback secret. Set AUTH_JWT_SECRET for any shared environment.'
    );
    return 'dev-local-only-secret-not-for-production';
  }
  return secret;
}

export function validatePasswordPolicy(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < PASSWORD_RULES.minLength) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return 'Password must include upper and lower case letters';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include a number';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include a special character';
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function signSession(userId: number, role: Role): string {
  return jwt.sign({ sub: userId, role } satisfies SessionPayload, getJwtSecret(), {
    expiresIn: '8h'
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as unknown as SessionPayload;
    if (
      typeof decoded.sub !== 'number' ||
      !['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'].includes(decoded.role)
    ) {
      return null;
    }
    return { sub: decoded.sub, role: decoded.role };
  } catch {
    return null;
  }
}

export function toSafeUser(user: {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword
  };
}

export function sessionCookieOptions(): {
  httpOnly: boolean;
  sameSite: 'lax';
  maxAge: number;
  path: string;
  secure: boolean;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
    secure: process.env.NODE_ENV === 'production'
  };
}
