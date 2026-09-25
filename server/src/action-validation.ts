/** Pure validators for Lab 4 Actions Taken (BR-05..08, BR-29). No DB access. */

export interface FieldError {
  field: string;
  message: string;
}

export type FieldValidation<T> =
  | { ok: true; value: T }
  | { ok: false; details: FieldError[] };

export const ACTION_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type ActionStatusInput = (typeof ACTION_STATUSES)[number];

/** Maximum clock-skew/scheduling tolerance for future actionDateTime (BR-29). */
export const ACTION_FUTURE_TOLERANCE_MS = 24 * 3600 * 1000;

export function validateActionDescription(input: unknown): FieldValidation<string> {
  const text = typeof input === 'string' ? input.trim() : '';
  if (!text) {
    return { ok: false, details: [{ field: 'description', message: 'Description must not be empty' }] };
  }
  if (text.length > 2000) {
    return { ok: false, details: [{ field: 'description', message: 'Description must be at most 2000 characters' }] };
  }
  return { ok: true, value: text };
}

export function validateActionDateTime(input: unknown, now: Date = new Date()): FieldValidation<Date> {
  if (input === undefined || input === null || input === '') {
    return { ok: true, value: now };
  }
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      return { ok: false, details: [{ field: 'actionDateTime', message: 'Action date must be a valid ISO-8601 date' }] };
    }
    return { ok: true, value: input };
  }
  if (typeof input !== 'string') {
    return { ok: false, details: [{ field: 'actionDateTime', message: 'Action date must be a valid ISO-8601 date' }] };
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, details: [{ field: 'actionDateTime', message: 'Action date must be a valid ISO-8601 date' }] };
  }
  if (date.getTime() - now.getTime() > ACTION_FUTURE_TOLERANCE_MS) {
    return {
      ok: false,
      details: [{ field: 'actionDateTime', message: 'Action date must not be more than 24 hours in the future' }]
    };
  }
  return { ok: true, value: date };
}

export function validateFollowUpNote(
  followUpRequired: boolean,
  input: unknown
): FieldValidation<string | null> {
  const text = typeof input === 'string' ? input.trim() : '';
  if (followUpRequired) {
    if (!text) {
      return {
        ok: false,
        details: [{ field: 'followUpNote', message: 'Follow-up note is required when follow-up is requested' }]
      };
    }
    if (text.length > 2000) {
      return {
        ok: false,
        details: [{ field: 'followUpNote', message: 'Follow-up note must be at most 2000 characters' }]
      };
    }
    return { ok: true, value: text };
  }
  if (!text) return { ok: true, value: null };
  if (text.length > 2000) {
    return {
      ok: false,
      details: [{ field: 'followUpNote', message: 'Follow-up note must be at most 2000 characters' }]
    };
  }
  return { ok: true, value: text };
}

/** Action lifecycle (spec §11): linear PENDING → IN_PROGRESS → COMPLETED, CANCELLED side-exit, no reopen. */
export const ACTION_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING: ['PENDING', 'IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['COMPLETED'],
  CANCELLED: ['CANCELLED']
};

export function isActionTransitionAllowed(from: string, to: string): boolean {
  return ACTION_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Result rule (BR-08): completing an action requires a non-empty result,
 * taken from the request body or the already-stored value.
 */
export function validateActionResult(
  targetStatus: string,
  bodyResult: unknown,
  storedResult: string | null
): FieldValidation<string | null> {
  const text = typeof bodyResult === 'string' ? bodyResult.trim() : '';
  const merged = text || (typeof storedResult === 'string' ? storedResult.trim() : '');
  if (targetStatus === 'COMPLETED' && !merged) {
    return {
      ok: false,
      details: [{ field: 'result', message: 'Result is required when completing an action' }]
    };
  }
  if (text && text.length > 2000) {
    return {
      ok: false,
      details: [{ field: 'result', message: 'Result must be at most 2000 characters' }]
    };
  }
  if (!merged && bodyResult !== undefined && bodyResult !== null && typeof bodyResult !== 'string') {
    return {
      ok: false,
      details: [{ field: 'result', message: 'Result must be a string' }]
    };
  }
  return { ok: true, value: merged || null };
}

export type PerformerCheck =
  | { ok: true }
  | { ok: false; code: 'VALIDATION_ERROR' | 'INACTIVE_ASSIGNEE'; message: string };

/** BR-03/BR-04: performer must be an active IT_STAFF or ADMINISTRATOR. */
export function checkActionPerformer(
  user: { role: string; isActive: boolean } | null
): PerformerCheck {
  if (!user) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Assignee not found' };
  }
  if (user.role !== 'IT_STAFF' && user.role !== 'ADMINISTRATOR') {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Assignee must be IT staff or administrator' };
  }
  if (!user.isActive) {
    return { ok: false, code: 'INACTIVE_ASSIGNEE', message: 'Assignee is no longer active' };
  }
  return { ok: true };
}
