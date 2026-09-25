import { describe, expect, it } from 'vitest';

import {
  checkActionPerformer,
  validateActionDateTime,
  validateActionDescription,
  validateActionResult,
  validateFollowUpNote
} from '../../src/action-validation.js';

describe('Lab 4 action validation helpers (UNIT-02)', () => {
  it('description: trims, rejects blank and over-2000', () => {
    expect(validateActionDescription('  fixed  ')).toEqual({ ok: true, value: 'fixed' });
    const blank = validateActionDescription('   ');
    expect(blank.ok).toBe(false);
    if (!blank.ok) expect(blank.details[0].field).toBe('description');
    const long = validateActionDescription('x'.repeat(2001));
    expect(long.ok).toBe(false);
    expect(validateActionDescription('x'.repeat(2000)).ok).toBe(true);
  });

  it('actionDateTime: defaults now, rejects invalid ISO and >24h future (BR-29)', () => {
    const now = new Date('2026-09-22T10:00:00.000Z');
    const def = validateActionDateTime(undefined, now);
    expect(def.ok && def.value).toEqual(now);
    expect(validateActionDateTime('2026-09-20T10:00:00.000Z', now).ok).toBe(true);
    const bad = validateActionDateTime('not-a-date', now);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.details[0].field).toBe('actionDateTime');
    const far = validateActionDateTime(new Date(now.getTime() + 48 * 3600 * 1000).toISOString(), now);
    expect(far.ok).toBe(false);
    const near = validateActionDateTime(new Date(now.getTime() + 3600 * 1000).toISOString(), now);
    expect(near.ok).toBe(true);
  });

  it('followUpNote: required iff followUpRequired', () => {
    const missing = validateFollowUpNote(true, null);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.details[0].field).toBe('followUpNote');
    expect(validateFollowUpNote(false, null)).toEqual({ ok: true, value: null });
    expect(validateFollowUpNote(true, ' order part ')).toEqual({ ok: true, value: 'order part' });
  });

  it('result: required when COMPLETED (body or stored)', () => {
    const missing = validateActionResult('COMPLETED', undefined, null);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.details[0].field).toBe('result');
    expect(validateActionResult('COMPLETED', undefined, 'old result').ok).toBe(true);
    expect(validateActionResult('IN_PROGRESS', undefined, null)).toEqual({ ok: true, value: null });
  });

  it('performer: unknown role/role/inactive mapping (BR-03/04)', () => {
    expect(checkActionPerformer(null).code).toBe('VALIDATION_ERROR');
    expect(checkActionPerformer({ role: 'REQUESTER', isActive: true }).code).toBe('VALIDATION_ERROR');
    const inactive = checkActionPerformer({ role: 'IT_STAFF', isActive: false });
    expect(inactive.ok).toBe(false);
    if (!inactive.ok) expect(inactive.code).toBe('INACTIVE_ASSIGNEE');
    expect(checkActionPerformer({ role: 'ADMINISTRATOR', isActive: true })).toEqual({ ok: true });
  });
});
