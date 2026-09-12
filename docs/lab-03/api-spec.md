# Lab 3 API Spec — TokTickIT

> Base: `/api`. JSON unless noted. Error shape (Lab 2, kept): `{ error: { code, message, details? } }`.
> Auth: JWT in `httpOnly` cookie (`toktickit_session`, `SameSite=Lax`, `Secure` in prod, 8h). `Authorization` header not used.

## 1. Authentication & session

### POST /api/auth/login

- Req: `{ email: string, password: string }` (trim email, case-insensitive lookup).
- Res `200`: `{ user: { id, name, email, role, isActive, mustChangePassword } }` + `Set-Cookie`.
- Errors:
  - `401 INVALID_CREDENTIALS` — wrong email or password (generic, same timing path).
  - `403 ACCOUNT_INACTIVE` — credentials correct but `isActive=false`. Message: `Account is deactivated. Please contact support.`
- Passwords verified with `bcryptjs.compare`; never return hash.

### POST /api/auth/logout

- Auth: required (but allowed even with `mustChangePassword`).
- Res `204` (clear cookie). Subsequent calls → `401 UNAUTHENTICATED`.

### GET /api/auth/me

- Auth: required, allowed during `mustChangePassword`.
- Res `200`: `{ user: { id, name, email, role, isActive, mustChangePassword } }`.
- `401 UNAUTHENTICATED` when no/invalid cookie.

### POST /api/auth/change-password

- Auth: required, allowed during `mustChangePassword`.
- Req: `{ currentPassword: string, newPassword: string, confirmPassword: string }`.
- Rules: `currentPassword` must verify; `newPassword` ≥8 + upper + lower + digit + special; `confirmPassword` must match; new ≠ current recommended (enforced: reject identical).
- Res `200`: `{ user: { id, name, email, role, mustChangePassword: false } }` (hash rotated, flag cleared).
- Errors: `400 VALIDATION_ERROR` (details per field), `401 INVALID_CREDENTIALS` (wrong current).

### Middleware order (every protected route)

1. `requireAuth` → `401 UNAUTHENTICATED` if missing/invalid/expired.
2. `requireActive` → `403 ACCOUNT_INACTIVE` if `isActive=false`.
3. `requirePasswordChanged` (except allowlist `GET /me`, `POST /change-password`, `POST /logout`) → `403 PASSWORD_CHANGE_REQUIRED`.
4. `requireRole(...)` → `403 FORBIDDEN`.
5. Ownership checks → `403 ACCESS_DENIED` (no content leak; treat cross-owner as denied, not 404-differentiated where sensitive — notes use 403 without body).

## 2. Requester APIs (authenticated identity; Lab 2 preserved)

Identity comes from session. Any `requesterId` query/body/header is ignored (AC-03). `X-Requester-Id` deprecated and ignored.

- `POST /api/tickets` — Req Lab 2 shape minus `requesterId` (`summary≤150, description≤2000, requestedPriority, categoryId, relatedSystemId`). Res `201` ticket with `itPriority=requestedPriority`, `currentStatus=NEW`, `ownerId=null`.
- `GET /api/tickets?search=&categoryId=&relatedSystemId=&status=&priority=&sort=ticketDate|updatedAt|requestedPriority&order=asc|desc&page=1&pageSize=10(≤50)` — returns only owned tickets + `pagination{page,pageSize,totalItems,totalPages}`. Invalid → `400 INVALID_QUERY`.
- `GET /api/tickets/:id` — owner only; else `403 ACCESS_DENIED`. Includes requester/category/system/attachments + `owner, itPriority, appearsResolved, comments?` (public only for requester).
- Attachments: `POST /tickets/:id/attachments` (multipart, 5MB, ≤5 active, jpg/png/webp/pdf), `GET /attachments/:id/download`, `PATCH /attachments/:id/remove {reason}` — owner only; same codes as Lab 2 (`INVALID_FILE_TYPE, FILE_TOO_LARGE, MAX_ATTACHMENTS, REMOVED`).

## 3. Staff queue & detail

### GET /api/staff/tickets (IT + Admin read-only)

- Query: `search` (matches `ticketNumber` + `summary` + `description`, case-insensitive — same coverage as Lab 2 plus ticketNumber for staff lookup), `status` (8 values), `categoryId`, `relatedSystemId`, `reqPriority`, `itPriority`, `owner` (`me|unassigned|<userId>`), `sort` (`ticketDate|updatedAt|requestedPriority|itPriority`, default `updatedAt` — `ticketDate` kept from Lab 2 naming for creation time, `createdDate` accepted as an alias), `order` (`asc|desc`, default `desc`; anything else → `400 INVALID_QUERY`), `page` (≥1, default 1), `pageSize` (1..50, default 10).
- Res `200`: `{ tickets: [{ id, ticketNumber, summary, category, requestedPriority, itPriority, currentStatus, owner{id,name}|null, ticketDate, updatedAt }], pagination }`.
- Invalid query → `400 INVALID_QUERY` (strict integer checks, NaN → 400).
- Requester → `403 FORBIDDEN`.

### GET /api/staff/tickets/:id (IT + Admin read-only)

- Res `200`: full ticket + `requester{id,name,email}`, `owner{id,name}|null`, `itPriority/requestedPriority`, `appearsResolved/appearsResolvedAt`, `publicComments[]`, `internalNotes[]` (notes omitted for Requester path; present here), `attachments[]`.
- Requester → `403 FORBIDDEN` (use Requester detail instead).

### PATCH /api/tickets/:id/owner (IT only)

- Req: `{ ownerId: number | null }`. `null` = unassign.
- Target must be active `IT_STAFF` or `ADMINISTRATOR`; else `400 VALIDATION_ERROR` / `404 NOT_FOUND`.
- Admin caller → `403 FORBIDDEN` (read-only policy). Requester → `403`.
- Res `200`: `{ id, ownerId, owner, updatedAt }`.

### PATCH /api/tickets/:id/priority (IT only)

- Req: `{ itPriority: LOW|MEDIUM|HIGH|URGENT }`. Res `200` ticket priority fields. `requestedPriority` never changes.
- Role violations → `403`.

### PATCH /api/tickets/:id/status (IT only)

- Req: `{ status: NEW|OPEN|IN_PROGRESS|WAITING_FOR_REQUESTER|RESOLVED|CLOSED|REOPENED|CANCELLED }`.
- Validated against transition matrix in `specification.md §5.1`; disallowed → `409 INVALID_TRANSITION` (with `details.allowed[]`).
- Res `200`: `{ id, currentStatus, updatedAt }`.

### PATCH /api/tickets/:id/appears-resolved (Requester owner only)

- No body. Sets `appearsResolved=true, appearsResolvedAt=now` (idempotent). Never changes `currentStatus`.
- Res `200`: `{ id, appearsResolved, appearsResolvedAt }`. Cross-owner → `403`.

## 4. Comments & notes

- `GET /api/tickets/:id/comments` — Requester(owner) + IT + Admin. Res `200`: `[{ id, body, author{id,name,role}, createdAt }]` asc.
- `POST /api/tickets/:id/comments` — Requester(owner) + IT. Req `{ body: string(1..2000 trim) }`. Empty → `400 VALIDATION_ERROR`. Res `201` entry. Admin → `403` (read-only).
- `GET /api/tickets/:id/notes` — IT + Admin only. Requester → `403 FORBIDDEN` with no note data (AC-04).
- `POST /api/tickets/:id/notes` — IT only (Admin read-only). Same validation as comments. Res `201`.
- Append-only: no PUT/DELETE in Lab 3. Bodies escaped on render; author/time set by backend.

## 5. Admin user management (Administrator only; others 403)

### GET /api/admin/users?search=&role=

- `search` matches `name` + `email` (contains, insensitive). `role` optional single value (`REQUESTER|IT_STAFF|ADMINISTRATOR`); invalid → `400`.
- Res `200`: `{ users: [{ id, name, email, role, isActive, mustChangePassword, createdAt }] }` ordered `name asc`. No pagination in Lab 3.

### POST /api/admin/users

- Req: `{ name(1..100 trim), email(valid, unique ci), role, isActive=true|false, initialPassword(meets rule) }`.
- Res `201`: created user (no hash) with `mustChangePassword=true`.
- Errors: `400 VALIDATION_ERROR`, `409 DUPLICATE_EMAIL`.

### PATCH /api/admin/users/:id

- Req (partial): `{ name?, email?, role?, isActive? }`.
- Guards: `email` dup → `409`; self-deactivate (`id==self && isActive=false`) → `403 SELF_DEACTIVATION`; demoting/deactivating last active Admin → `409 LAST_ADMIN`.
- Res `200` updated safe user.

### POST /api/admin/users/:id/reset-password

- Req: `{ initialPassword }`. Sets hash + `mustChangePassword=true` (does not require current).
- Same self/last-admin irrelevance (password reset allowed on self? Allowed, but deactivation guards still apply separately).
- Res `200`: `{ id, mustChangePassword: true }`.

## 6. Status codes & safe errors

- `200/201/204` success; `400 VALIDATION_ERROR | INVALID_QUERY | INVALID_FILE_TYPE | FILE_TOO_LARGE | MAX_ATTACHMENTS`; `401 UNAUTHENTICATED | INVALID_CREDENTIALS`; `403 FORBIDDEN | ACCESS_DENIED | ACCOUNT_INACTIVE | PASSWORD_CHANGE_REQUIRED | SELF_DEACTIVATION`; `404 NOT_FOUND`; `409 DUPLICATE_EMAIL | LAST_ADMIN | INVALID_TRANSITION`; `410 REMOVED`; `500 INTERNAL_ERROR`.
- Messages are safe and generic; `details` only for field-level validation or allowed transitions. No stack traces. No user enumeration via message/status divergence except the documented inactive-vs-invalid split (which requires correct password).
