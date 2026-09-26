/** "Recently" window for Lab 4 dashboards (BR-28): server-side UTC, `updatedAt >= now − 7 days`. */

export const RECENT_WINDOW_MS = 7 * 24 * 3600 * 1000;

export function recentWindowCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - RECENT_WINDOW_MS);
}

/** Inclusive on both ends: exactly-7d counts, older and future timestamps do not. */
export function isWithinRecentWindow(date: Date, now: Date = new Date()): boolean {
  const t = date.getTime();
  return t >= now.getTime() - RECENT_WINDOW_MS && t <= now.getTime();
}
