import { describe, expect, it } from 'vitest';

import {
  RECENT_WINDOW_MS,
  isWithinRecentWindow,
  recentWindowCutoff
} from '../../src/dashboard-window.js';

const NOW = new Date('2026-09-22T10:00:00.000Z');

describe('Lab 4 dashboard window helper (UNIT-01)', () => {
  it('window is exactly 7 days', () => {
    expect(RECENT_WINDOW_MS).toBe(7 * 24 * 3600 * 1000);
    expect(recentWindowCutoff(NOW)).toEqual(new Date('2026-09-15T10:00:00.000Z'));
  });

  it('UTC boundary: exactly-7d included, older excluded, future excluded', () => {
    expect(isWithinRecentWindow(new Date('2026-09-15T10:00:00.000Z'), NOW)).toBe(true);
    expect(isWithinRecentWindow(new Date('2026-09-20T10:00:00.000Z'), NOW)).toBe(true);
    expect(isWithinRecentWindow(new Date('2026-09-15T09:59:59.999Z'), NOW)).toBe(false);
    expect(isWithinRecentWindow(new Date('2026-09-22T10:00:01.000Z'), NOW)).toBe(false);
  });
});
