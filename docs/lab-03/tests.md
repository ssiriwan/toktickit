# Lab 3 Test Plan — TokTickIT (Test DD + TDD)

> Written before implementation (Phase 2, Issue #33). Every Acceptance Criterion (AC-01..AC-18 in `specification.md`) maps to ≥1 planned test below. `Final` column is updated to `Pass` only from `lab3-staging` green runs. File paths cover labsheet §12 minimum (6 server API + 5 client + 3 E2E) plus 2 Lab-2-pattern splits (`password.unit.test.ts`, `theme.style.test.tsx`) to avoid Divergent Change; regression UI reuses the existing Lab 2 suite.

## 1. Strategy

- TDD: failing test first per Issue (`feature/3x-*` branch), then implementation, then peer review.
- Layers: unit (hashing/validation helpers) → API/integration (supertest/vitest, real DB via `toktickit-db`) → UI component (vitest + jsdom + Testing Library) → E2E (Playwright) → visual/responsive (screenshots desktop/tablet/mobile).
- Security tests call APIs directly (no UI) to prove backend enforcement (AC-03/04/16).
- Regression: full Lab 2 suite (`tests/lab-01|02/`) must stay green alongside Lab 3 paths.
- Config: `server/vitest.config.ts` + `client/vitest.config.ts` extended to include `server/tests/lab-03/**` and `client/tests/lab-03/**` alongside legacy `tests/lab-0X/**` (no deletion of old includes).

## 2. Traceability matrix

| Test ID | Type | AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Valid login (active user) | 200 + session cookie + safe user (no hash) | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-02 | API | AC-01 | Invalid password / unknown email | 401 INVALID_CREDENTIALS generic, no session | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-03 | API | AC-05 | Correct credentials but inactive | 403 ACCOUNT_INACTIVE, clear message | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-04 | API | AC-02 | mustChange login then call queue API | 403 PASSWORD_CHANGE_REQUIRED | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-05 | API | AC-02 | Change password happy path (rule ok, confirm match) | 200, mustChange=false, subsequent queue API allowed | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-06 | API | AC-02 | Change password boundaries (short, no upper, mismatch, wrong current, same-as-current) | 400/401 per field | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-07 | API | AC-01,06 | GET /me with/without cookie; logout clears; reuse after logout | 200 / 401 / 204 then 401 | `server/tests/lab-03/auth.api.test.ts` | Planned |
| UNIT-01 | Unit | AC-01 | bcrypt hashing (cost 12, compare true/false, never plaintext) | hash ≠ password, verify ok | `server/tests/lab-03/password.unit.test.ts` | Planned |
| AUTHZ-01 | API/security | AC-03 | Requester sends forged requesterId / other owner's ticket id | session identity applied, 403, no cross data | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| AUTHZ-02 | API/security | AC-04 | Requester GET/POST internal notes | 403, no note content | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| AUTHZ-03 | API/security | AC-10,11 | Requester PATCH owner/priority/status | 403 for each | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| AUTHZ-04 | API/security | AC-16 | IT + Requester call admin APIs | 403, no user data | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| AUTHZ-05 | API/security | AC-06 | Unauthenticated call to queue/detail/admin/me | 401, no data | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| AUTHZ-06 | API/regression | AC-17 | Lab 2 endpoints without session (old header only) | 401 (header ignored) | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| QUEUE-01 | API | AC-12 | Queue default list + pagination metadata | 200 tickets + pagination | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| QUEUE-02 | API | AC-12 | Search ticketNumber+summary+description | matches, case-insensitive | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| QUEUE-03 | API | AC-12 | Filters status/category/relatedSystem/reqPri/itPri/owner(me/unassigned/id) | correct subsets | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| QUEUE-04 | API | AC-12 | Sort ticketDate/updatedAt/priorities + order | ordered correctly | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| QUEUE-05 | API | AC-12 | Invalid query (NaN ids, bad sort, pageSize>50) | 400 INVALID_QUERY | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| QUEUE-06 | API/security | AC-12 | Requester calls staff queue; Admin read-only GET ok | 403 / 200 | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| DETAIL-01 | API | AC-09 | IT claim/unassign/reassign owner; inactive target rejected | 200 persisted / 400 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| DETAIL-02 | API | AC-09 | Admin PATCH owner (read-only policy) | 403 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| DETAIL-03 | API | AC-10 | IT sets itPriority; requestedPriority unchanged | 200, requested same | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| DETAIL-04 | API | AC-11 | Allowed transition per matrix | 200 new status | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| DETAIL-05 | API | AC-11 | Disallowed transition | 409 INVALID_TRANSITION + allowed[] | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| DETAIL-06 | API | AC-08 | Requester appears-resolved (own / other owner's / idempotent) | 200 flag, status same / 403 / repeat ok | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| DETAIL-07 | API/migration | AC-17 | Migrated Lab 2 ticket: ownership + itPriority=requestedPriority + attachments intact | fields correct | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| CMT-01 | API | AC-07 | Requester posts/lists public on owned ticket | 201/200 visible | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| CMT-02 | API | AC-07 | Empty/whitespace/over-2000 body | 400 | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| CMT-03 | API | AC-04,07 | IT posts public; Admin POST public → 403 read-only | 201 / 403 | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| NOTE-01 | API | AC-04 | IT posts/lists internal; author/time from backend | 201/200 | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| NOTE-02 | API | AC-04 | Requester GET/POST notes; Admin POST notes | 403 no content / 403 | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| ADMIN-01 | API | AC-12 | Admin list + search name/email + role filter + order | 200 correct subset | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| ADMIN-02 | API | AC-13 | Create user happy path → mustChange=true; login requires change | 201 + login locked | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| ADMIN-03 | API | AC-13 | Duplicate email (case-insensitive) + invalid role | 409 / 400 | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| ADMIN-04 | API | AC-14 | Edit name/email/role/active | 200 persisted | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| ADMIN-05 | API | AC-14 | Self-deactivate blocked | 403 SELF_DEACTIVATION | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| ADMIN-06 | API | AC-14 | Demote/deactivate last active Admin blocked | 409 LAST_ADMIN | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| ADMIN-07 | API | AC-15 | Reset initial password → target mustChange=true | 200 + next login locked | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| UI-01 | UI | AC-01,05 | Login: valid/invalid/inactive/busy/safe errors | renders + messages | `client/tests/lab-03/Login.test.tsx` | Planned |
| UI-02 | UI | AC-02 | ChangePassword: rules checklist, mismatch, success redirect | validates + continues | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |
| UI-03 | UI | AC-12 | Queue: search/filter/sort/pagination/empty/no-results/forbidden + responsive cards | controls work | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-04 | UI | AC-08..11 | Detail: owner/priority/status dropdowns, banner, public vs internal distinct, validation | actions + styles | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-05 | UI | AC-13..15 | Admin: table Email column, search/filter, drawer, dup/self/last-admin errors | renders + guards | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| UI-06 | UI/style | AC-18 | Zen Green tokens, badges, readonly vs editable, validation placement, focus | style assertions | `client/tests/lab-03/theme.style.test.tsx` | Planned |
| UI-07 | UI | AC-06,16 | Role nav hidden + forbidden cards (Requester→queue/admin, IT→admin, logged-out→protected) | unauthorized links absent, 403 cards render | `client/tests/lab-03/Login.test.tsx` | Planned |
| UI-08 | UI/regression | AC-17 | Requester regression under session (Lab 2 MyTickets/Create/Detail flows, no selector) | Lab 2 UI suite green with auth identity | `tests/lab-02/my-tickets.ui.test.tsx, create-ticket.ui.test.tsx, ticket-detail.ui.test.tsx` | Planned |
| VIS-01 | Visual | AC-18 | Desktop/tablet/mobile screenshots for authentication, staff-queue, staff-ticket-detail, user-management | readable shots, no overflow, checklist passed | `artifacts/lab-03/screenshots/*` | Planned |
| E2E-01 | E2E | AC-01,02,06 | Login → mustChange → change → app → logout → blocked re-entry | flow green | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-02 | E2E | AC-08..11 | Staff queue → detail → claim → priority → status → comments + notes + banner | flow green | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-03 | E2E | AC-13..16 | Admin create → dup → edit → reset → self/last-admin guards → forbidden for others | flow green | `e2e/lab-03/user-administration.spec.ts` | Planned |

## 3. Coverage checklist

- [ ] Login valid/invalid/inactive/boundaries/logout/me (API-01..07, UI-01, E2E-01)
- [ ] Role nav + direct-API authz + regression header-ignore (AUTHZ-01..06, UI-07)
- [ ] Queue search/filter/sort/pagination/invalid (QUEUE-01..06, UI-03)
- [ ] Ownership / IT priority / status matrix / appearsResolved (DETAIL-01..07, UI-04, E2E-02)
- [ ] Public vs Internal visibility, append-only, validation (CMT-01..NOTE-02)
- [ ] Admin list/search/filter/create/dup/edit/active/reset/self/last/forbidden (ADMIN-01..07, UI-05, E2E-03)
- [ ] Migration (itPriority copy, ownership, attachments) + Lab 2 regression green (DETAIL-07, UI-08, AUTHZ-06)
- [ ] Responsive + visual (VIS-01 shots, UI-03 cards, drawer sheet, detail 1-col) + a11y (labels, alert/status roles, focus, keyboard)
- [ ] Safe failures everywhere (retry, no stacks, no enumeration)

## 4. Execution

- `npm test` (vitest projects: server incl. `server/tests/lab-03/**`, client incl. `client/tests/lab-03/**`) + `npx playwright test e2e/lab-03/` on `lab3-staging` before release.
- Seed uses fake local-only credentials from `specification.md §7` (2 active Admins to separate self vs last-admin tests).
- `Final` column flips to `Pass` only after green run + evidence screenshots under `artifacts/lab-03/screenshots/`.
