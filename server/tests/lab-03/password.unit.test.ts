import { describe, expect, it } from 'vitest';

import {
  getJwtSecret,
  hashPassword,
  validatePasswordPolicy,
  verifyPassword
} from '../../src/auth.js';

describe('Lab 3 password helpers (UNIT-01)', () => {
  it('hashes with bcrypt cost 12 and verifies correctly', async () => {
    const hash = await hashPassword('Requester123!');
    expect(hash).not.toContain('Requester123!');
    expect(hash.startsWith('$2b$12$')).toBe(true);
    expect(await verifyPassword('Requester123!', hash)).toBe(true);
    expect(await verifyPassword('Wrong123!', hash)).toBe(false);
  });

  it('never stores or returns plaintext (different salts per hash)', async () => {
    const a = await hashPassword('Same123!');
    const b = await hashPassword('Same123!');
    expect(a).not.toBe(b);
    expect(await verifyPassword('Same123!', a)).toBe(true);
    expect(await verifyPassword('Same123!', b)).toBe(true);
  });

  it('rejects weak passwords per policy', () => {
    expect(validatePasswordPolicy('short1!')).not.toBeNull();
    expect(validatePasswordPolicy('alllowercase1!')).not.toBeNull();
    expect(validatePasswordPolicy('ALLUPPERCASE1!')).not.toBeNull();
    expect(validatePasswordPolicy('NoDigitsHere!')).not.toBeNull();
    expect(validatePasswordPolicy('NoSpecial123')).not.toBeNull();
    expect(validatePasswordPolicy('Valid123!')).toBeNull();
  });

  it('returns false for corrupt hashes instead of throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
  });

  it('refuses the fallback secret in production (fail closed)', () => {
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.AUTH_JWT_SECRET;
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_JWT_SECRET;
    try {
      expect(() => getJwtSecret()).toThrow(/AUTH_JWT_SECRET/);
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevSecret !== undefined) process.env.AUTH_JWT_SECRET = prevSecret;
    }
  });
});
