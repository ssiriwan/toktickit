# Lab 4 Test Plan — TokTickIT (Test DD + TDD)

> Written before implementation (Issue #45). Every Acceptance Criterion (AC-01..AC-20 in `specification.md`) maps to ≥1 planned test below. `Final` flips to `Pass` only from `lab4-staging` green runs. Covers handout minimums (server API + client + E2E) plus regression.

## 1. Strategy

- TDD: failing test first per Issue (`feature/*` branch), then implementation, then peer review by `@thhanabun`. One issue active at a time; merge into `lab4-staging`; release `lab4-staging` → `main` at the end.
- Layers: unit (pure helpers: window math, payload validation) → API/integration (supertest/vitest, real DB `toktickit-db`) → UI component (vitest + jsdom + Testing Library) → UI style (Zen Green tokens/badges/focus assertions) → E2E (Playwright) → performance-smoke (dashboard p95 on seeded DB) → visual/responsive (3-viewport screenshots).
- Security tests call APIs directly (no UI) to prove backend enforcement (AC-03/05/08/09).
- Regression: full Lab 1–3 suites stay green alongside Lab 4 paths; legacy tickets covered by AC-18.
- Config: `server/vitest.config.ts` includes `server/tests/lab-04/**/*.test.ts`; `client/vitest.config.ts` includes `client/tests/lab-04/**/*.test.tsx` (additive, no deletion of old includes).

## 2. Traceability matrix

| Test ID | Type | AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-02,10 | "Recently" window helper: UTC boundary incl. exactly-7d edge, future `updatedAt` excluded | boundary dates classified correctly | `server/tests/lab-04/dashboard-window.unit.test.ts` | Planned |
| UNIT-02 | Unit | AC-01 | Action payload validation helper: trim/blank description, invalid ISO, >24h-future `actionDateTime` | per-field verdicts match BR-05/BR-29 | `server/tests/lab-04/action-validation.unit.test.ts` | Planned |
| ACT-01 | API | AC-01 | Staff creates action (defaults: self performer, PENDING, now) | 201 + linked `ticketId` + performer=self | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-02 | API | AC-01 | List actions asc by `actionDateTime` with performer object | 200 ordered array | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-03 | API/security | AC-03 | Assign action to inactive staff | `400 INACTIVE_ASSIGNEE` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-04 | API | AC-04 | `followUpRequired=true` without note | `400 VALIDATION_ERROR` (`details:[{field:followUpNote}]`) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-05 | API | AC-04 | `followUpRequired=false` with null note | 201 accepted | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-06 | API/security | AC-05 | Requester POST/PATCH action | `403 ACCESS_DENIED` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-07 | API/security | AC-05 | Requester reads another owner's actions | `403 ACCESS_DENIED` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-08 | API | AC-01 | Requester owner reads own actions | 200 read-only array | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-09 | API | AC-07 | PATCH action → COMPLETED with result | 200 + `status=COMPLETED` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-10 | API | AC-07 | PATCH action → COMPLETED without result | `400 VALIDATION_ERROR` (`details:[{field:result}]`) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-11 | API | AC-05 | Blank/over-2000 description | `400 VALIDATION_ERROR` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-12 | API | AC-01 | Invalid ISO / >24h-future `actionDateTime` (BR-29) | `400 VALIDATION_ERROR` (`details:[{field:actionDateTime}]`) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| WF-01 | API | AC-06 | `IN_PROGRESS → RESOLVED` with zero actions | `400 RESOLUTION_GATE_VIOLATION` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-02 | API | AC-07 | `IN_PROGRESS → RESOLVED` with 1 COMPLETED action | 200 `RESOLVED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-03 | API | AC-08 | Off-matrix (e.g. `NEW → RESOLVED`, `CANCELLED → OPEN`) | `400 INVALID_TRANSITION` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-04 | API | AC-09 | Stale `clientUpdatedAt` (DB newer) | `409 STALE_UPDATE` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-05 | API | AC-09 | Fresh `clientUpdatedAt` succeeds | 200 new status | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-06 | API/regression | AC-18 | Legacy Lab 1–3 ticket readable, `actionsTaken=[]`, data intact | 200 + fields intact | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-07 | API/security | AC-05 | Requester PATCH ticket status | 403 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| RD-01 | API | AC-02 | Requester dashboard self-scoping (second requester isolated) | 200 self-only metrics | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| RD-02 | API | AC-02 | Open/waiting/recent counts match DB fixtures | counts equal direct queries | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| RD-03 | API/security | AC-02 | Staff/Admin call requester dashboard | 403 | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| SD-01 | API | AC-10 | Staff dashboard unassigned/myAssigned/status/urgent counts | match DB | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SD-02 | API | AC-11 | Admin dashboard = staff metrics + `userSummary` | user counts match DB | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SD-03 | API/security | AC-10 | Requester calls staff/admin dashboards | 403 | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| UI-01 | UI | AC-14 | Action form: validation + debounce (double-click = 1 POST) | 1 request, errors shown | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-02 | UI | AC-15 | Requester detail: actions visible, Add/Edit absent | read-only list | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-03 | UI | AC-12 | RequesterDashboard: 5 cards 1:1 with API metrics + drill-down nav | nav to `/tickets` + matching filter | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-04 | UI | AC-13 | StaffDashboard: 7 cards 1:1 with API metrics + queue filter nav | nav to `/staff/queue?…` | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-05 | UI | AC-16 | Status control lists only allowed targets | options == matrix row | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-06 | UI | AC-17 | Gate warning on RESOLVED attempt w/o Completed | warning rendered, save blocked | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-07 | UI/style | AC-12,13,15 | Zen Green tokens, action-status badges, readonly vs editable, validation placement, focus | style assertions | `client/tests/lab-04/theme.style.test.tsx` | Planned |
| PERF-01 | Perf-smoke | AC-10,11 | Requester/staff/admin dashboards p95 < 1s on seeded DB | timing assertion green | `server/tests/lab-04/dashboard.perf-smoke.test.ts` | Planned |
| E2E-01 | E2E | AC-19 | Create action → complete with result → requester sees read-only | flow green | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-20 | Dashboard metrics → drill-down lands filtered | flow green | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-03 | E2E | AC-06,07,19 | Gate blocks RESOLVED → complete action → resolve → close | flow green | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| VIS-01 | Visual | Part 9 | 4 primary screens × 3 viewports (1280/768/375) | readable, no overflow | `artifacts/lab-04/screenshots/*` | Planned |

## 3. Coverage checklist

- [ ] Actions CRUD + validation + inactive-assignee + requester-403 (ACT-01..12, UNIT-02, UI-01/02, E2E-01)
- [ ] Workflow matrix + gate + concurrency + legacy regression (WF-01..07, UI-05/06, E2E-03)
- [ ] Dashboards server-computed + role-isolated + drill-down (UNIT-01, RD-01..03, SD-01..03, UI-03/04, PERF-01, E2E-02)
- [ ] Style consistency Lab 4 screens (UI-07) + responsive + visual (VIS-01) + a11y (labels, alert/status roles, focus, keyboard)
- [ ] Responsive + visual (VIS-01) + a11y (labels, alert/status roles, focus, keyboard)
- [ ] `npm test` green (legacy + new), `npm run build` clean, seed idempotent, backup taken

## 4. Execution

- `npm test`: _to run on `lab4-staging` after implementation PRs (target: 30+ files / >190 tests, 0 failed)._
- `npm run e2e:lab4` (to add): _E2E-01..03 green on chromium with seed pinning._
- `npm run build`: _client (vite) + server (tsc) clean._
- Seed fixtures for tests: requesters ×2 (isolation), active/inactive staff, tickets across 8 statuses + unassigned, actions (0 / 1-completed / multi-performer / follow-up).
- `Final` column flips to `Pass` only after the 100% green run + evidence screenshots under `artifacts/lab-04/screenshots/`.
