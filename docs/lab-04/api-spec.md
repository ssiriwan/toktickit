# Lab 4 API Spec — TokTickIT

> Base: `/api`. JSON unless noted. Error shape (Labs 2–3, kept): `{ error: { code, message, details? } }`.
> Auth: JWT in `httpOnly` cookie (`toktickit_session`, `SameSite=Lax`, `Secure` in prod, 8h). `Authorization` header not used.
> Middleware order (every protected route): `requireAuth` (401) → `requireActive` (403 `ACCOUNT_INACTIVE`) → `requirePasswordChanged` except allowlist (403 `PASSWORD_CHANGE_REQUIRED`) → `requireRole(...)` (403) → ownership checks (403 `ACCESS_DENIED`, no leak).

## 1. Actions Taken — staff

### GET /api/staff/tickets/:ticketId/actions

- Role: `IT_STAFF`, `ADMINISTRATOR`.
- Res `200`: array asc by `actionDateTime`, each `{ id, ticketId, actionDateTime, description, result|null, status, performedBy{id,name,role}, followUpRequired, followUpNote|null, attachmentNotes|null, createdAt, updatedAt }`.
- Unknown ticket → `404 NOT_FOUND`. Requester → `403` (use §3).

### POST /api/staff/tickets/:ticketId/actions

- Role: `IT_STAFF`, `ADMINISTRATOR`.
- Req: `{ description: string(1..2000 trim, required), actionDateTime?: ISO-8601 (default now; valid range per BR-29), performedById?: int (default self), status?: PENDING|IN_PROGRESS|COMPLETED|CANCELLED (default PENDING), result?: string|null, followUpRequired?: boolean (default false), followUpNote?: string|null, attachmentNotes?: string|null }`.
- Rules: `performedById` must be active `IT_STAFF`/`ADMINISTRATOR` else `400 INACTIVE_ASSIGNEE` (inactive) or `400 VALIDATION_ERROR` (wrong role / unknown user); `actionDateTime` invalid or >24h in the future → `400 VALIDATION_ERROR` (`details:[{field:actionDateTime}]`); `followUpRequired=true` requires `followUpNote` 1..2000 trim else `400 VALIDATION_ERROR` (`details:[{field:followUpNote}]`); `status=COMPLETED` requires non-empty `result` else `400 VALIDATION_ERROR` (`details:[{field:result}]`); `description` blank/over-long → `400 VALIDATION_ERROR`.
- Res `201`: created action (full shape as in GET, single object).
- Example req: `{ "description": "Inspected network socket", "actionDateTime": "2026-09-22T11:00:00.000Z", "performedById": 3, "status": "IN_PROGRESS", "followUpRequired": true, "followUpNote": "Need to order replacement wall plate", "attachmentNotes": "photo_wall_plate.jpg" }`.

### PATCH /api/staff/tickets/:ticketId/actions/:actionId

- Role: `IT_STAFF`, `ADMINISTRATOR`. Partial body: any subset of `{ description, actionDateTime, performedById, status, result, followUpRequired, followUpNote, attachmentNotes }`.
- Same field rules as POST, applied to the merged record (e.g. setting `status=COMPLETED` without a result — either in body or already stored — is rejected; explicitly clearing `result` (`""`) while `COMPLETED` is rejected).
- Action lifecycle enforced (spec §11): `PENDING → IN_PROGRESS | CANCELLED`, `IN_PROGRESS → COMPLETED | CANCELLED`, `COMPLETED`/`CANCELLED` terminal. Off-lifecycle `status` → `400 VALIDATION_ERROR` (`details:[{field:status}]`, `Transition from X to Y is not permitted`). Repeating the current status is a no-op.
- Action must belong to the ticket in path else `404 NOT_FOUND`.
- Res `200`: updated action. Requester → `403`.

## 2. Actions Taken — requester (read-only)

### GET /api/tickets/:ticketId/actions

- Role: `REQUESTER`, must own the ticket; else `403 ACCESS_DENIED`.
- Res `200`: same array shape as §1 (read-only contract; no POST/PATCH/DELETE exists on this path — any mutation attempt → `403`/`404`).
- IT Staff / Administrator use the `/staff` equivalents.

## 3. Dashboards (server-computed, never client-side — BR-24)

Window rule: "recently" = BR-28 (`updatedAt >= now − 7×24h`, server UTC). Empty data is not an error: endpoints return zeroed metrics + `recentTickets: []`.

### GET /api/requester/dashboard

- Role: `REQUESTER`. All metrics filter `requesterId = self` (BR-18).
- Res `200`: `{ metrics: { totalOpen, waitingForRequester, recentlyUpdated, recentlyResolved, closed }, recentTickets: [{ id, ticketNumber, summary, currentStatus, requestedPriority, updatedAt }×5] }`.
- Definitions: `totalOpen` = `[NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED]` (BR-19); `waitingForRequester` = `WAITING_FOR_REQUESTER` (BR-20); `recentlyUpdated` = own tickets updated within the BR-28 window (BR-21); `recentlyResolved` = own `RESOLVED` within the BR-28 window (BR-26); `closed` = own `CLOSED`, all-time (BR-27); `recentTickets` = 5 latest own by `updatedAt`.
- Other roles → `403`.

### GET /api/staff/dashboard

- Role: `IT_STAFF`, `ADMINISTRATOR`.
- Res `200`: `{ metrics: { newCount, openCount, inProgressCount, waitingForRequesterCount, myAssignedCount, unassignedCount, urgentCount }, recentTickets: [{ id, ticketNumber, summary, currentStatus, itPriority, updatedAt, owner{id,name}|null }×5] }`.
- Definitions: per-status counts over non-terminal + terminal as stored; `myAssignedCount` = `ownerId=self` NOT IN `(CLOSED, CANCELLED)` (BR-23); `unassignedCount` = `ownerId IS NULL` NOT IN `(CLOSED, CANCELLED)` (BR-22); `urgentCount` = `itPriority=URGENT` NOT IN `(CLOSED, CANCELLED)`; `recentTickets` = 5 latest by `updatedAt` favouring urgent.
- Requester → `403`.

### GET /api/admin/dashboard

- Role: `ADMINISTRATOR` only (staff → `403`).
- Res `200`: `{ metrics: {…same as §staff…}, recentTickets: […], userSummary: { totalUsers, activeRequesters, activeStaff, activeAdmins, inactiveUsers } }`.

## 4. Ticket status & concurrency guard

### PATCH /api/staff/tickets/:ticketId/status

- Role: `IT_STAFF`, `ADMINISTRATOR`. Req: `{ status: 1 of 8, clientUpdatedAt: ISO }`.
- Validation order (all server-side):
  1. Matrix: `currentStatus → status` must be permitted per `specification.md §5.1`, else `400 INVALID_TRANSITION`.
  2. Concurrency: if `ticket.updatedAt > clientUpdatedAt` (DB newer), else `409 STALE_UPDATE` with `{ error: { code: STALE_UPDATE, message, details: [{ field: clientUpdatedAt }] } }` — client must refetch and retry.
  3. Resolution gate: if target is `RESOLVED`, ticket must have ≥1 action with `status=COMPLETED`, else `400 RESOLUTION_GATE_VIOLATION` with guidance message.
- Res `200`: `{ id, currentStatus, updatedAt }`.
- `clientUpdatedAt` missing/unparseable → `400 VALIDATION_ERROR`. Requester → `403` (requesters use `PATCH /tickets/:id/appears-resolved`, flag-only, unchanged from Lab 3).

## 5. Status codes & safe errors

- `200/201` success; `400 VALIDATION_ERROR | INVALID_QUERY | INVALID_TRANSITION | RESOLUTION_GATE_VIOLATION | INACTIVE_ASSIGNEE`; `401 UNAUTHENTICATED | INVALID_CREDENTIALS`; `403 FORBIDDEN | ACCESS_DENIED | ACCOUNT_INACTIVE | PASSWORD_CHANGE_REQUIRED`; `404 NOT_FOUND`; `409 STALE_UPDATE | DUPLICATE_EMAIL | LAST_ADMIN | ALREADY_ASSIGNED`; `410 REMOVED`; `500 INTERNAL_ERROR`.
- Central shape: `{ error: { code, message, details? } }`; `details` only for field-level validation (`description`, `actionDateTime`, `followUpNote`, `result`, `clientUpdatedAt`) or allowed-transition hints. No stacks, no enumeration.
