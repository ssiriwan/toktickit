# Lab 4 Specification — TokTickIT Actions Taken, Dashboards, Final Regression (Sprint 4)

> Engineering contract for Sprint 4. Extends Labs 1–3. AI coding agent may report completion only when this contract + Product Definition of Done are satisfied.
> Details: `api-spec.md`, `ui-spec.md`, `tests.md`.
> Base: `main @1d8a8be` (Lab 3 released, PR #44). Base branch: `lab4-staging`. DB: PostgreSQL 17 (`toktickit-db`, host port 5434).

## 1. Sprint Goal

Add the operational core that Lab 3 deferred: per-ticket **Actions Taken** (staff work log with own lifecycle), a strict **ticket workflow** (8-state matrix + resolution gate + concurrency guard), and **role-appropriate dashboards** (Requester / Staff / Admin) — while keeping all Lab 1–3 flows regression-green and shipping Zen Green responsive UI with evidence (report Parts 1–9, 60 pts).

## 2. Stakeholder Request (interpretation)

Stakeholder wants proof of work: every ticket shows what IT actually did (who, when, result, follow-up), tickets cannot be marked Resolved without at least one Completed action, concurrent edits are rejected safely, and each role lands on a dashboard that answers "what needs my attention?" with drill-down into the right ticket list. Requesters see progress read-only; staff/admin own the workflow. No new external systems (no SLA clock, no email/SMS, no inventory/billing, no multi-approval, no BI export, no multi-tenant).

## 3. Scope

### Included

- `ActionTaken` model + migration + idempotent seed (BR-01..08, §7).
- Actions Taken REST APIs (staff create/update/list + requester read-only) with backend authorization.
- Ticket Detail UI: staff list/create/edit actions + requester read-only list.
- Ticket workflow hardening: strict 8-state permitted matrix, resolution gate (`RESOLVED` requires ≥1 `COMPLETED` action), `clientUpdatedAt` concurrency → `409 STALE_UPDATE`, `appearsResolved` stays flag-only.
- Dashboards: `GET /api/requester|staff|admin/dashboard` (server-computed metrics) + `RequesterDashboard` / `StaffDashboard` UI with drill-down links + Admin user summary.
- AppShell Dashboard nav per role; `/` resolves to the role dashboard after login.
- Button debounce / submitting state on all forms; failed saves keep input.
- Regression: Lab 1–3 suites stay green; Playwright E2E for action flow + dashboard drill-down; 3-viewport screenshots; `reviewer.md` + `ai-use.md`; release PR `lab4-staging` → `main`.

### Explicitly excluded (plan §9 — do NOT build)

1. SLA timers and escalation. 2. Outbound messaging (Email/SMS/LINE/Push). 3. Spare-parts inventory/purchasing. 4. Timesheet/billing/payroll. 5. Multi-level approvals and digital signatures. 6. External BI / data-warehouse export. 7. Multi-tenant organization.

## 4. Functional Requirements

- FR-01: IT Staff and Administrator can create a new Action Taken under an accessible ticket.
- FR-02: Creator can set description, result, date-time, and performer (`performedBy`).
- FR-03: Performer defaults to the logged-in user; picker may select another active IT Staff/Admin.
- FR-04: `followUpRequired=true` requires a non-empty Follow-up Note.
- FR-05: User may attach Attachment Notes (filename/reference pointer, not a file upload).
- FR-06: IT Staff and Administrator can update an action or transition its status (`PENDING` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`).
- FR-07: Transitioning an action to `COMPLETED` requires a non-empty Result.
- FR-08: Requester can list all Actions Taken on own tickets, read-only.
- FR-09: Requester create/update/delete on actions → `403`.
- FR-10: System enforces the ticket status permitted-transition matrix strictly.
- FR-11: Ticket → `RESOLVED` requires the resolution gate (≥1 `COMPLETED` action).
- FR-12: Requester `appearsResolved` is a display flag + banner for staff; never changes ticket status.
- FR-13: Stale ticket-status edits (via `updatedAt`) → `409`.
- FR-14: Requester Dashboard shows own-ticket stats (Open, Waiting, Recently Updated, Recently Resolved) + drill-down.
- FR-15: Staff Dashboard shows operational stats (Unassigned, My Assigned, status breakdown, Urgent) + drill-down.
- FR-16: Admin Dashboard shows staff-dashboard stats plus user-account summary.

## 5. Business Rules

- BR-01: Each Action Taken belongs to exactly one Ticket (parent-child, cascade on ticket delete).
- BR-02: Ticket Owner owns the ticket overall; individual actions may be performed by a different IT Staff member.
- BR-03: `performedById` must be a user with role `IT_STAFF` or `ADMINISTRATOR`.
- BR-04: Assigning/logging an action for `isActive=false` → `400 INACTIVE_ASSIGNEE`.
- BR-05: Action Description 1..2000 chars after trim; blank rejected.
- BR-06: `followUpRequired=true` → `followUpNote` 1..2000 chars after trim.
- BR-07: `followUpRequired=false` → `followUpNote` may be `null`/empty.
- BR-08: Action → `COMPLETED` requires non-empty `result`.
- BR-09: Requester reads actions only on own tickets.
- BR-10: Requester cross-ticket action access or any action mutation → `403 ACCESS_DENIED`.
- BR-11: Ticket status set (8): `NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED`.
- BR-12: Permitted transitions (§5.1 matrix); all else rejected.
- BR-13: Resolution gate — no `RESOLVED` without ≥1 `COMPLETED` action on that ticket.
- BR-14: Gate violation → `400 RESOLUTION_GATE_VIOLATION` with clear message.
- BR-15: Off-matrix transition → `400 INVALID_TRANSITION`.
- BR-16: Requester `appearsResolved` sets `appearsResolved=true` + `appearsResolvedAt`; `currentStatus` unchanged.
- BR-17: Status edits send `clientUpdatedAt`; DB newer → `409 STALE_UPDATE`.
- BR-18: Requester dashboard metrics filter `requesterId = self` only.
- BR-19: Requester `totalOpen` = statuses `[NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED]`.
- BR-20: Requester `waitingForRequester` = status `WAITING_FOR_REQUESTER`.
- BR-21: Requester `recentlyUpdated` = own tickets updated within last 7 days.
- BR-22: Staff `unassigned` = `ownerId IS NULL` AND status NOT IN `(CLOSED, CANCELLED)`.
- BR-23: Staff `myAssigned` = `ownerId = self` AND status NOT IN `(CLOSED, CANCELLED)`.
- BR-24: All dashboard numbers are computed by server-side DB queries; never client-side.
- BR-25: Every form disables double-submit (submitting state) and preserves input on failed save.

### 5.1 Ticket status transition matrix (permitted actor: IT Staff and Administrator)

```
NEW → OPEN, CANCELLED
OPEN → IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED
IN_PROGRESS → WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
WAITING_FOR_REQUESTER → IN_PROGRESS, CANCELLED
RESOLVED → CLOSED, REOPENED
CLOSED → REOPENED
REOPENED → IN_PROGRESS, CANCELLED
CANCELLED → (terminal)
```

Resolution gate applies on any transition whose target is `RESOLVED` (BR-13/14). Concurrency check applies on every status mutation (BR-17). `CANCELLED` is terminal.

### 5.2 Authorization matrix

| Operation | Requester (owner) | Requester (other) | IT Staff | Administrator |
|---|:---:|:---:|:---:|:---:|
| List actions (`GET /tickets/:id/actions`) | ✅ | ❌ 403 | ✅ (staff route) | ✅ (staff route) |
| Create action (`POST /staff/tickets/:id/actions`) | ❌ 403 | ❌ 403 | ✅ | ✅ |
| Update action (`PATCH /staff/tickets/:id/actions/:actionId`) | ❌ 403 | ❌ 403 | ✅ | ✅ |
| Requester dashboard (`GET /requester/dashboard`) | ✅ (self only) | ❌ 403 | ❌ 403 | ❌ 403 |
| Staff dashboard (`GET /staff/dashboard`) | ❌ 403 | ❌ 403 | ✅ | ✅ |
| Admin dashboard (`GET /admin/dashboard`) | ❌ 403 | ❌ 403 | ❌ 403 | ✅ |
| Change ticket status (`PATCH /staff/tickets/:id/status`) | ❌ 403 | ❌ 403 | ✅ | ✅ |
| Set appears-resolved (`PATCH /tickets/:id/appears-resolved`) | ✅ (own) | ❌ 403 | ❌ 403 | ❌ 403 |

Rationale: staff routes are the IT/Admin contract (Lab 3 AD-13 extended); requester routes stay owner-scoped. Backend enforces everything; hidden buttons are not security.

## 6. UI Specification Summary

AppShell gains a **Dashboard** entry per role; `/` renders the role dashboard after login. Requester Dashboard: welcome banner, 4 metric cards with drill-down to My Tickets, quick actions, 5 most-recent tickets, loading/error/empty states. Staff Dashboard: welcome banner + Refresh, 5 metric cards with drill-down to Staff Queue (status/owner filters), admin user-summary strip + link to `/admin/users`, recent/urgent tickets, quick actions. Ticket Detail (staff): Actions Taken section (table/cards with Date/Time, Description, Result, Performed-by, Status badge, Follow-up flag/note, Attachment notes), `+ Add Action Taken` modal, edit/status drawer, performer dropdown lists active IT Staff/Admin only, status dropdown filtered to matrix-allowed targets, resolution-gate warning blocks `RESOLVED` without a Completed action. Ticket Detail (requester): same data as readable cards, no Add/Edit controls. Full spec: `ui-spec.md`.

## 7. Data Changes

- New enum `ActionStatus { PENDING, IN_PROGRESS, COMPLETED, CANCELLED }`.
- New `ActionTaken { id, ticketId→Ticket cascade, actionDateTime @default(now()), description, result?, status @default(PENDING), performedById→User, followUpRequired @default(false), followUpNote?, attachmentNotes?, createdAt, updatedAt }`, indexes `(ticketId, actionDateTime)`, `(performedById)`.
- `Ticket` += `actionsTaken ActionTaken[]`; `User` += `actionsTaken ActionTaken[]`. No other Lab 1–3 columns change.
- Migration: additive only; legacy tickets keep all data with `actionsTaken = []`; already-`RESOLVED`/`CLOSED` legacy tickets keep status and count in dashboards; moving a legacy open ticket to `RESOLVED` still requires the gate. Never edit an applied `migration.sql` (checksum) — corrections go in a new migration.
- Backup before migrate: `docker start toktickit-db` then tar `toktickit_pgdata` to `pgdata_lab3_final.tar.gz`. Requires PostgreSQL ≥ 12 (project pins `postgres:17-alpine`).
- Seed (idempotent upserts): ≥2 tickets with zero actions (gate-block + empty-state proof); ≥1 ticket with exactly 1 `COMPLETED` action (resolvable proof); ≥1 ticket with several actions by different IT Staff (BR-02 proof); ≥1 action with `followUpRequired=true` + note + attachment notes; coverage across all 8 statuses, 4 priorities, assigned + unassigned. Local-only credentials reused from Lab 3 spec §7.

### DB justifications (mandatory, §5.1 of handout)

1. **Separate `ActionTaken` table instead of a JSON array or reusing Comment/Note tables.** Actions have their own lifecycle (`ActionStatus`), need indexed lookup by performer (`performedById`) and time (`actionDateTime`), and need FK integrity to `User` so assigning an inactive staff member is rejected precisely and fast.
2. **Separate Ticket Owner (`ticket.ownerId`) from Action Performer (`actionTaken.performedById`).** Per BR-02 one ticket has one coordinating owner but each work step may be executed by a different IT staff member; separate fields give a clear audit trail of who performed each action.

## 8. API Contract

Error shape kept from Labs 2–3: `{ error: { code, message, details? } }` + `RESOLUTION_GATE_VIOLATION, STALE_UPDATE, INACTIVE_ASSIGNEE, INVALID_TRANSITION, ACCESS_DENIED`. Actions: `GET /staff/tickets/:id/actions`, `POST /staff/tickets/:id/actions` (201), `PATCH /staff/tickets/:id/actions/:actionId` (partial), `GET /tickets/:id/actions` (requester owner-only, read-only). Dashboards: `GET /requester|staff|admin/dashboard` (admin = staff metrics + `userSummary`). Status: `PATCH /staff/tickets/:id/status { status, clientUpdatedAt }` validated in order matrix → concurrency → gate. Full paths/shapes/codes: `api-spec.md`.

## 9. Acceptance Criteria

- AC-01: Create action under correct ticket with auto performed-by. — `server/tests/lab-04/actions-taken.api.test.ts`
- AC-02: Requester dashboard returns self-only stats. — `server/tests/lab-04/requester-dashboard.api.test.ts`
- AC-03: Inactive assignee → `400 INACTIVE_ASSIGNEE`. — actions-taken API
- AC-04: `followUpRequired=true` without note → `400`. — actions-taken API
- AC-05: Requester action mutation → `403 ACCESS_DENIED`. — actions-taken API
- AC-06: `RESOLVED` without Completed action blocked. — `server/tests/lab-04/ticket-workflow.api.test.ts`
- AC-07: `RESOLVED` with Completed action allowed. — ticket-workflow API
- AC-08: Off-matrix transition → `400 INVALID_TRANSITION`. — ticket-workflow API
- AC-09: Stale `updatedAt` → `409 STALE_UPDATE`. — ticket-workflow API
- AC-10: Staff dashboard counts match DB. — `server/tests/lab-04/staff-dashboard.api.test.ts`
- AC-11: Admin dashboard = staff stats + user summary. — staff-dashboard API
- AC-12: Requester Dashboard cards render + drill-down navigates. — `client/tests/lab-04/RequesterDashboard.test.tsx`
- AC-13: Staff Dashboard cards + queue filter navigation. — `client/tests/lab-04/StaffDashboard.test.tsx`
- AC-14: Action form validates client-side + blocks double-submit. — `client/tests/lab-04/ActionsTaken.test.tsx`
- AC-15: Requester detail shows actions read-only, no edit controls. — ActionsTaken UI
- AC-16: Staff status control lists only matrix-allowed targets. — `client/tests/lab-04/TicketWorkflow.test.tsx`
- AC-17: Gate warning shown when `RESOLVED` attempted without Completed action. — TicketWorkflow UI
- AC-18: Migrated legacy tickets readable, no data loss. — ticket-workflow API
- AC-19: Full action→resolve→close flow green end-to-end. — `e2e/lab-04/actions-taken-flow.spec.ts`
- AC-20: Dashboard drill-down correct in a real browser. — `e2e/lab-04/dashboards.spec.ts`

Every AC maps to ≥1 test in `docs/lab-04/tests.md` (this PR is spec-only; implementation PRs #47+ turn rows green).

## 10. Definition of Done (Product)

- [ ] This spec + `api-spec.md` + `ui-spec.md` + `tests.md` merged into `lab4-staging` before code PRs.
- [ ] Migration + idempotent seed run clean with backup taken and zero legacy data loss.
- [ ] Backend enforces authz + gate + concurrency at the API layer (direct-API evidence).
- [ ] `npm test` 100% green (legacy + new, target >190 tests) and `npm run build` clean on `lab4-staging`.
- [ ] Zen Green responsive UI on desktop/tablet/mobile with a11y checklist passed.
- [ ] Feature branches → `lab4-staging` → `main` with peer review (`@thhanabun`); Kanban Done; `reviewer.md` + `ai-use.md` complete; submission PDF covers all 9 parts.

## 11. Assumptions and Decisions

- Additive Prisma migration only; dashboards are read-model aggregations, no new write paths beyond actions/status.
- `attachmentNotes` is a text pointer (Lab 2 attachment binaries stay on tickets; no file upload on actions).
- Action status lifecycle is linear `PENDING → IN_PROGRESS → COMPLETED` with `CANCELLED` as side-exit; no reopen of cancelled actions (create a new one).
- Dashboard windows: "recently" = 7 days (BR-21); "recent tickets" lists = 5 latest by `updatedAt`.
- Vitest configs extended to `server/tests/lab-04/**` and `client/tests/lab-04/**` alongside existing includes.
