# Lab 3 Specification — TokTickIT Users, Roles, IT Staff Ticketing, Admin (Sprint 3)

> Engineering contract for Sprint 3. Extends Lab 2. AI coding agent may report completion only when this contract + Product Definition of Done are satisfied.
> Details: `api-spec.md`, `ui-spec.md`, `tests.md`.

## 1. Sprint Goal

Replace the temporary Development Requester selector with secure email/password authentication and server-enforced role-based authorization, add the first operational IT Staff queue/detail workflow (ownership, IT Priority, status, Public Comments, Internal Notes), add minimalist Administrator user management, and keep all Lab 2 Requester functions working under the authenticated identity without data loss.

## 2. Stakeholder Request (interpretation)

Stakeholder wants real users instead of a dev dropdown. Each user logs in, is forced to change an initial password before using the app, and only sees what their single role allows. Requesters keep their Lab 2 tickets but are now identified by login. IT Staff get a real queue to find, claim, prioritize, and resolve work while talking to requesters publicly and keeping private notes. Admins get one simple screen to manage accounts. Every API and screen must be protected on the backend; hiding buttons is not security. Visual language stays Zen Green.

## 3. Scope

### Included

- Login/logout/me/mandatory password change (httpOnly cookie session).
- Role-based navigation + backend authorization for Requester / IT Staff / Administrator.
- Migration `RequesterUser` → `User`, removal of selector + `X-Requester-Id` header, Requester regression.
- Staff queue API (search/filter/sort/pagination) + responsive UI.
- Ticket detail ops: claim/assign/reassign owner, IT Priority, status transitions, Public Comments, Internal Notes, existing Attachments read/download.
- Requester `appearsResolved` flag (no status change) + IT banner.
- Admin user management: list, search name/email, optional single role filter, create (one role + initial password), edit name/email/role/active, reset initial password, self-deactivate + last-admin guards.
- Seed + migration evidence, Spec/Test DD, E2E, screenshots, release.

### Explicitly excluded

Email invite/reset, MFA/SSO/social, self-registration, Actions Taken, SLA/escalation/notifications, dashboards/KPI beyond queue counts, multi-tenant/dept, multi-role per user, user deletion/bulk/import-export/history, profile-photo/extended profile, email delivery of passwords, pagination/multi-sort/multi-filter on user list, production deploy.

## 4. Functional Requirements

- FR-01: Active user can log in with email + password; invalid credentials return safe generic error.
- FR-02: User with `mustChangePassword=true` cannot use normal app until a valid new password is saved; other APIs return `403 PASSWORD_CHANGE_REQUIRED`.
- FR-03: Authenticated user can fetch own identity (`GET /api/auth/me`) and log out (cookie cleared); logged-out direct access is blocked.
- FR-04: Requester creates/lists/views own tickets and attachments using backend-derived identity; client-supplied `requesterId` is ignored.
- FR-05: Requester posts/lists Public Comments on owned tickets; Requester cannot access Internal Notes APIs.
- FR-06: Requester can set `appearsResolved=true` on owned ticket (flag only, idempotent); cannot PATCH status/priority/owner.
- FR-07: IT Staff lists queue with search, filters, sorting, pagination and opens any ticket detail; Administrator may list/view queue and detail read-only.
- FR-08: IT Staff claims/assigns/reassigns `ownerId` (active IT Staff or Administrator only, or unassigned).
- FR-09: IT Staff updates `itPriority`; `requestedPriority` is immutable.
- FR-10: IT Staff performs only allowed status transitions per matrix; invalid transitions rejected.
- FR-11: IT Staff posts/lists Public Comments and Internal Notes; Administrator may only list (GET) Public Comments and Internal Notes (read-only, no POST); Requester posts/lists Public Comments on owned tickets only (append-only, no edit/delete).
- FR-12: Administrator lists users with name/email search + optional single role filter.
- FR-13: Administrator creates user with name/email/one role/active/initial password; duplicate email rejected.
- FR-14: Administrator edits name/email/role/active and resets initial password (`mustChange=true`); cannot deactivate self; cannot remove last active Admin; no user deletion.
- FR-15: All protected endpoints enforce auth + role + ownership on backend and return safe errors without leaking other users' data existence.

## 5. Business Rules

- BR-01: Only an active user with valid credentials may authenticate.
- BR-02: A user with `mustChangePassword=true` cannot enter normal app until a valid new password is saved.
- BR-03: Authenticated identity, not client-supplied `requesterId`, determines ownership of Requester operations.
- BR-04: Public Comments visible to Requester (owner), IT Staff, Administrator. Internal Notes visible only to IT Staff and Administrator.
- BR-05: Requester may indicate appears-resolved but cannot set Resolved/Closed.
- BR-06: Wrong credentials → `401 INVALID_CREDENTIALS` generic. Correct credentials but `isActive=false` → `403 ACCOUNT_INACTIVE` with contact-support message (no enumeration for outsiders).
- BR-07: Passwords stored as `bcryptjs` hash (cost 12), never plaintext; new password must satisfy ≥8 chars + upper + lower + digit + special; `current` must verify; confirmation must match.
- BR-08: Session is JWT in `httpOnly` cookie (`SameSite=Lax`, 8h). Logout clears cookie. No token in localStorage. Secrets never committed.
- BR-09: `mustChangePassword` allowlist is only `GET /me`, `POST /change-password`, `POST /logout`; all other authenticated APIs → `403 PASSWORD_CHANGE_REQUIRED`.
- BR-10: One user has exactly one role (`REQUESTER | IT_STAFF | ADMINISTRATOR`); no multi-role.
- BR-11: Each ticket has zero or one owner; owner must be active IT Staff or Administrator; ticket may start unassigned.
- BR-12: `requestedPriority` immutable after creation. `itPriority` initialized as copy of `requestedPriority` (including migrated Lab 2 tickets) and changeable only by IT Staff.
- BR-13: Status set is `New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled`. Transitions per §5.1 matrix; Requester cannot transition via status API.
- BR-14: Comments/Notes are append-only; author + `createdAt` from backend; empty/whitespace rejected; body 1..2000 chars after trim; rendered escaped.
- BR-15: Admin create requires valid name/email/role/initial password meeting rule; email unique (case-insensitive); invalid role rejected.
- BR-16: Admin cannot deactivate own account (`403 SELF_DEACTIVATION`).
- BR-17: System must retain ≥1 active Administrator; deactivating or demoting the last one → `409 LAST_ADMIN`.
- BR-18: Deactivation used instead of deletion; no user deletion API.
- BR-19: Requester list/detail APIs return only owned tickets; cross-owner access → `403 ACCESS_DENIED` (same as not-found to avoid leak where applicable); Internal Notes to Requester → `403` with no content.
- BR-20: Lab 2 data (tickets, attachments, categories, systems) remains valid after migration; `ticketNumber` format and 150-char summary rule unchanged.
- BR-21: Lab 3 has no account lockout or unlock flow (explicitly excluded account-unlocking). Repeated failed logins always return the same safe `401 INVALID_CREDENTIALS` with no per-account counter exposed; brute-force mitigation is out of scope beyond generic errors and non-enumerating responses.
- BR-22: CSRF protection relies on `SameSite=Lax` httpOnly cookie + same-origin mutations only (Vite proxy, no cross-site POST); no token is readable by JS, logout clears the cookie server-side; dedicated CSRF tokens are deferred as all Lab 3 mutations are same-origin.

### 5.1 Status transition matrix (permitted actor: IT Staff)

```
New → Open, Cancelled
Open → In Progress, Cancelled
In Progress → Waiting for Requester, Resolved, Cancelled
Waiting for Requester → In Progress, Resolved
Resolved → Closed, Reopened
Closed → Reopened
Reopened → In Progress, Resolved
Cancelled → (terminal)
```

Admin ticket mutation is disabled in Lab 3 (Admin is read-only on tickets, see §5.2). Actions-Taken-gated resolution is deferred to Lab 4.

### 5.2 Authorization matrix

| Operation | Requester (owner) | IT Staff | Administrator |
|---|---|---|---|
| Own tickets/attachments/comments | ✅ | ❌ (use staff APIs) | ❌ |
| `GET /staff/tickets`, `GET /staff/tickets/:id`, `GET comments/notes` | ❌ 403 | ✅ | ✅ read-only |
| `PATCH owner/priority/status`, `POST comments/notes` on tickets | ❌ 403 | ✅ | ❌ 403 |
| `PATCH appears-resolved` (own) | ✅ | ❌ | ❌ |
| `/admin/users*` | ❌ 403 | ❌ 403 | ✅ |

Rationale: keeps Admin/IT separation (handout §4.3), prevents scope creep, still satisfies "Internal visible to IT + Admin".

## 6. UI Specification Summary

Screens: Login, Change Password, AppShell (name + role badge, role nav, Logout), Requester MyTickets/Create/Detail (+Public + AppearsResolved), Staff Queue (table + mobile cards), Staff Ticket Detail (owner/priority/status + Public/Internal tabs + attachments read-only + appearsResolved banner), Admin User Management (table + search + role filter + create/edit drawer + reset password). All screens provide loading/saving/success/validation/empty/no-results/forbidden/safe-failure feedback, editable-vs-readonly styling, badges for status/priorities/role, responsive desktop/tablet/mobile. Full spec: `ui-spec.md`.

## 7. Data Changes

- New `User {id, name, email@unique, passwordHash, role, isActive, mustChangePassword, createdAt, updatedAt}`, indexes on `(email)`, `(role, isActive)`.
- `Ticket` adds `ownerId → User?`, `itPriority Priority`, `appearsResolved Boolean @default(false)`, `appearsResolvedAt DateTime?`; `requesterId` now → `User.id`; indexes `(ownerId)`, `(currentStatus, updatedAt)`; existing `(requesterId, createdAt)` kept. No `resolutionSummary` field in Lab 3 (deferred with Actions Taken to Lab 4 to avoid scope creep).
- New `PublicComment {id, ticketId→Ticket cascade, authorId→User, body, createdAt}`, index `(ticketId, createdAt)`.
- New `InternalNote` (same shape as PublicComment, separate table for access control).
- `TicketStatus` enum extended to 8 values; `Priority` unchanged.
- Migration: `RequesterUser` rows → `User(role=REQUESTER, mustChange=true, initial password)`; tickets remapped; `itPriority=requestedPriority`; attachments/categories/systems untouched. Strategy: Prisma migrate + backfill script, verified by migration tests; Docker volume backed up before migrate. Requires PostgreSQL >= 12 for multi-value enum ALTER in one migration (project pins `postgres:17-alpine`).
- Seed (idempotent upserts): 4 active + 1 inactive Requesters, 3 active + 1 inactive IT Staff, **2 active Administrators** (to test self vs last-admin distinctly), tickets across statuses/priorities/assigned states, sample public/internal entries, local-only credentials documented below.
- Seeded credentials (local development only — fake values, never real passwords; actual hashes generated by seed script; all seeds start with `mustChangePassword=true`):
  | Role | Email | Initial password (local seed) | Active |
  |---|---|---|---|
  | Requester | `requester1@toktickit.local` … `requester4@toktickit.local` | `Requester123!` | ✅ |
  | Requester (inactive) | `requester.inactive@toktickit.local` | `Requester123!` | ❌ |
  | IT Staff | `it1@toktickit.local` … `it3@toktickit.local` | `Itstaff123!` | ✅ |
  | IT Staff (inactive) | `it.inactive@toktickit.local` | `Itstaff123!` | ❌ |
  | Administrator | `admin1@toktickit.local`, `admin2@toktickit.local` | `Admin123!` | ✅ |

## 8. API Contract

Mechanism: `POST /api/auth/login` sets httpOnly JWT cookie; `GET /api/auth/me`; `POST /api/auth/change-password`; `POST /api/auth/logout` clears. Lab 2 ticket/attachment APIs kept but identity from session; `X-Requester-Id`/`requesterId` ignored. Staff queue `GET /api/staff/tickets` supports `search (ticketNumber+summary+description), status, categoryId, relatedSystemId, reqPriority, itPriority, owner(me/unassigned/id), sort(ticketDate|updatedAt|requestedPriority|itPriority), order, page, pageSize(≤50)` + `{tickets, pagination}`. Mutations: `PATCH /tickets/:id/owner|priority|status`, `PATCH /tickets/:id/appears-resolved`, `GET/POST /tickets/:id/comments|notes`. Admin: `GET /admin/users?search=&role=`, `POST /admin/users`, `PATCH /admin/users/:id`, `POST /admin/users/:id/reset-password`. Errors keep Lab 2 shape `{error:{code,message,details}}` + `INVALID_CREDENTIALS, ACCOUNT_INACTIVE, PASSWORD_CHANGE_REQUIRED, SELF_DEACTIVATION, LAST_ADMIN` with 401/403/400/404/409 mapping and no existence leak. Full paths/shapes/codes: `api-spec.md`.

## 9. Acceptance Criteria

- AC-01: Active user + valid credentials → login sets session and returns safe identity + role.
- AC-02: `mustChangePassword` user → normal screens/APIs blocked until valid new password saved.
- AC-03: Authenticated Requester + forged `requesterId` → backend still applies session identity, no cross-user data.
- AC-04: Requester requests Internal Notes → rejected with no note content.
- AC-05: Inactive user (correct password) → clear deactivated response; wrong password → generic invalid (no enumeration).
- AC-06: Logged-out user opening protected route/API → blocked (redirect + 401).
- AC-07: Requester posts Public Comment on owned ticket → visible to IT/Admin; empty body rejected.
- AC-08: Requester sets appears-resolved → flag set, status unchanged, IT sees banner.
- AC-09: IT claims/unassigns/reassigns owner → persisted; inactive user as owner rejected.
- AC-10: IT changes `itPriority` → persisted; `requestedPriority` unchanged; Requester attempt rejected.
- AC-11: IT performs allowed transition → persisted; disallowed → rejected; Requester transition rejected.
- AC-12: Queue search/filter/sort/pagination behave per contract; invalid query → 400.
- AC-13: Admin creates user → login requires password change; duplicate email → 409.
- AC-14: Admin edits user; self-deactivate → blocked; demoting/deactivating last Admin → blocked.
- AC-15: Admin reset password → target must change at next login.
- AC-16: Non-Admin accesses admin APIs → 403.
- AC-17: Migrated Lab 2 tickets retain ownership/attachments and `itPriority=requestedPriority`.
- AC-18: All major screens usable desktop/tablet/mobile with Zen Green consistency and safe failure feedback.

Every AC maps to ≥1 planned test in `docs/lab-03/tests.md` (Phase 2, Issue #33 — this PR is spec-only; traceability table lands with the test plan).

## 10. Definition of Done (Product)

- [ ] This spec + `api-spec.md` + `ui-spec.md` approved before main implementation PRs.
- [ ] `tests.md` traceability complete; `npm test` green (Lab 2 regression + Lab 3) and `npm run build` clean on `lab3-staging`.
- [ ] Migration preserves Lab 2 data; seed idempotent; backup taken.
- [ ] Backend enforces authz on every protected endpoint (direct-API evidence, not just hidden buttons).
- [ ] Login/change/logout/inactive/must-change flows demoable; queue/detail/admin flows demoable with validation + safe errors.
- [ ] Screenshots for 4 areas × 3 sizes readable; visual checklist passed.
- [ ] Feature branches → `lab3-staging` → `main` with peer review; Kanban Done; `reviewer.md` + `ai-use.md` complete.

## 11. Assumptions and Decisions

- JWT-in-httpOnly-cookie chosen over `express-session` for statelessness with Vite proxy; no refresh tokens in Lab 3 (8h expiry acceptable for course).
- Admin ticket access is read-only (matrix §5.2) to honor handout §4.3 separation and avoid scope creep; full Admin ticket ops explicitly deferred.
- Seed uses 2 active Admins (handout minimum is 1) solely to distinguish self-deactivation from last-admin tests.
- `client/.../lab-03 tests/` in handout interpreted as `client/tests/lab-03/`; server tests under `server/tests/lab-03/`; vitest configs extended to include new paths alongside legacy `tests/lab-0X/`.
- Password rule mirrors mockup (≥8 + 4 character classes); comment/note limit 2000 aligns with Lab 2 description limit.
