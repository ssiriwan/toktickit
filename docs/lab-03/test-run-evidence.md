# Lab 3 Test Run Evidence (Passing Test Output)

> Executed on `lab3-staging` (clean PostgreSQL container `toktickit-db` port 5434).  
> Timestamp: 2026-09-19  
> All suites 100% green with 0 errors, 0 failed, and 0 skipped.

---

## 1. Unit, Integration, UI & Security Tests (`npm test`)

**Command:**
```bash
npm test
```

**Verbatim Output:**
```text
> toktickit@0.1.0 test
> vitest run --config vitest.config.ts

 RUN  v3.2.7 C:/Users/HP/Desktop/Uni code/CPE334/toktickit

 ✓  @toktickit/client  tests/lab-03/theme.style.test.tsx (7 tests) 142ms
 ✓  @toktickit/server  tests/lab-03/password.unit.test.ts (2 tests) 246ms
 ✓  @toktickit/client  ../tests/lab-02/theme.style.test.tsx (7 tests) 117ms
 ✓  @toktickit/client  tests/lab-03/ChangePassword.test.tsx (5 tests) 538ms
 ✓  @toktickit/client  tests/lab-03/Login.test.tsx (5 tests) 571ms
 ✓  @toktickit/server  ../tests/lab-02/attachments.server.test.ts (9 tests) 743ms
 ✓  @toktickit/server  tests/lab-03/auth.api.test.ts (8 tests) 3396ms
 ✓  @toktickit/client  ../tests/lab-02/CreateTicket.test.tsx (6 tests) 205ms
 ✓  @toktickit/client  ../tests/lab-02/RequesterSelection.test.tsx (4 tests) 79ms
 ✓  @toktickit/client  tests/lab-03/StaffTicketQueue.test.tsx (7 tests) 393ms
 ✓  @toktickit/server  tests/lab-03/staff-queue.api.test.ts (9 tests) 175ms
 ✓  @toktickit/client  ../tests/lab-02/MyTickets.test.tsx (5 tests) 245ms
 ✓  @toktickit/client  ../tests/lab-02/AttachmentSection.test.tsx (3 tests) 86ms
 ✓  @toktickit/client  ../tests/lab-02/RequesterTicketDetail.test.tsx (5 tests) 238ms
 ✓  @toktickit/client  ../tests/lab-02/app-shell.ui.test.tsx (1 test) 37ms
 ✓  @toktickit/client  tests/lab-03/UserManagement.test.tsx (7 tests) 624ms
 ✓  @toktickit/server  tests/lab-03/users-admin.api.test.ts (8 tests) 184ms
 ✓  @toktickit/client  tests/lab-03/StaffTicketDetail.test.tsx (9 tests) 710ms
 ✓  @toktickit/client  ../tests/lab-01/ui-categories.test.tsx (1 test) 26ms
 ✓  @toktickit/client  ../tests/lab-01/ui-foundation.test.tsx (1 test) 20ms
 ✓  @toktickit/client  ../tests/lab-01/ui-health.test.tsx (4 tests) 23ms
 ✓  @toktickit/server  ../tests/lab-02/create-ticket.server.test.ts (10 tests) 103ms
 ✓  @toktickit/server  tests/lab-03/staff-ticket-detail.api.test.ts (9 tests) 259ms
 ✓  @toktickit/server  ../tests/lab-02/requesters.server.test.ts (3 tests) 37ms
 ✓  @toktickit/server  ../tests/lab-02/ticket-detail.server.test.ts (4 tests) 41ms
 ✓  @toktickit/server  ../tests/lab-02/my-tickets.server.test.ts (10 tests) 71ms
 ✓  @toktickit/server  tests/lab-03/comments-notes.api.test.ts (8 tests) 126ms
 ✓  @toktickit/server  tests/lab-03/authorization.api.test.ts (6 tests) 79ms
 ✓  @toktickit/server  ../tests/lab-02/seed.server.test.ts (4 tests) 38ms
 ✓  @toktickit/server  ../tests/lab-01/api-categories.server.test.ts (1 test) 25ms
 ✓  @toktickit/server  ../tests/lab-01/api-foundation.server.test.ts (1 test) 8ms
 ✓  @toktickit/server  ../tests/lab-01/api-health.server.test.ts (1 test) 8ms

 Test Files  30 passed (30)
      Tests  163 passed (163)
   Start at  20:18:01
   Duration  21.98s
```

---

## 2. End-to-End Test Suite (`npm run e2e:lab3`)

**Command:**
```bash
npm run e2e:lab3
```

**Verbatim Output:**
```text
> toktickit@0.1.0 e2e:lab3
> playwright test --config playwright.lab03.config.ts

Running 11 tests using 1 worker

  ok  1 [chromium] › e2e\lab-03\authentication.spec.ts:6:7 › E2E-01 — Lab 3 authentication flow › invalid login shows a safe error without enumeration (2.0s)
  ok  2 [chromium] › e2e\lab-03\authentication.spec.ts:12:7 › E2E-01 — Lab 3 authentication flow › inactive account gets a clear deactivated message (543ms)
  ok  3 [chromium] › e2e\lab-03\authentication.spec.ts:18:7 › E2E-01 — Lab 3 authentication flow › first login forces password change, then app, logout, and blocked re-entry (1.9s)
  ok  4 [chromium] › e2e\lab-03\screenshots.spec.ts:48:7 › VIS-01 — Lab 3 responsive screenshots › authentication screens (895ms)
  ok  5 [chromium] › e2e\lab-03\screenshots.spec.ts:66:7 › VIS-01 — Lab 3 responsive screenshots › staff queue (2.0s)
  ok  6 [chromium] › e2e\lab-03\screenshots.spec.ts:76:7 › VIS-01 — Lab 3 responsive screenshots › staff ticket detail (9.4s)
  ok  7 [chromium] › e2e\lab-03\screenshots.spec.ts:88:7 › VIS-01 — Lab 3 responsive screenshots › user management (1.8s)
  ok  8 [chromium] › e2e\lab-03\staff-ticket-flow.spec.ts:6:7 › E2E-02 — Lab 3 staff ticket flow › queue search/filter/sort, detail ops, comments + notes channels (3.8s)
  ok  9 [chromium] › e2e\lab-03\staff-ticket-flow.spec.ts:53:7 › E2E-02 — Lab 3 staff ticket flow › requester appears-resolved flag surfaces a banner for staff (1.7s)
  ok 10 [chromium] › e2e\lab-03\user-administration.spec.ts:6:7 › E2E-03 — Lab 3 user administration flow › admin create, duplicate, edit, reset, guards, and non-admin forbidden (3.4s)
  ok 11 [chromium] › e2e\lab-03\user-administration.spec.ts:73:7 › E2E-03 — Lab 3 user administration flow › non-admin staff gets the forbidden card on the admin route (622ms)

  11 passed (48.2s)
```

---

## 3. Production Build Check (`npm run build`)

**Command:**
```bash
npm run build
```

**Verbatim Output:**
```text
> toktickit@0.1.0 build
> npm --workspace client run build && npm --workspace server run build

> @toktickit/client@0.1.0 build
> tsc -b && vite build

vite v7.3.6 building client environment for production...
transforming...
✓ 51 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.41 kB │ gzip:  0.27 kB
dist/assets/index-CdTfEwJD.css  236.46 kB │ gzip: 32.26 kB
dist/assets/index-C0G7I9Bt.js   311.28 kB │ gzip: 90.00 kB
✓ built in 991ms

> @toktickit/server@0.1.0 build
> tsc -p tsconfig.json
```
