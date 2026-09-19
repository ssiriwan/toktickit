# Lab 3 Peer Review

## My Reviewer (reviewed my Pull Requests)

- Name: Thanabun Tikaew
- Student ID: 67070501021
- GitHub username: thhanabun

### My Pull Requests Reviewed (reviewer repo: ssiriwan/toktickit)

| PR | Issue | Title | Status |
| --- | --- | --- | --- |
| https://github.com/ssiriwan/toktickit/pull/32 | #32 | docs(lab-03): Sprint 3 spec contract | Merged — 8 fixes |
| https://github.com/ssiriwan/toktickit/pull/33 | #33 | docs(lab-03): test plan with AC traceability | Merged — 5 fixes |
| https://github.com/ssiriwan/toktickit/pull/34 | #34 | feat(lab-03): auth foundation + migration + seed | Merged — 7 fixes |
| https://github.com/ssiriwan/toktickit/pull/35 | #35 | feat(lab-03): requester regression + auth UI + comments | Merged — 4 fixes + JWT hardening |
| https://github.com/ssiriwan/toktickit/pull/36 | #36 | feat(lab-03): staff ticket queue API + UI | Merged — 6 fixes + 2 nits |
| https://github.com/ssiriwan/toktickit/pull/37 | #37 | feat(lab-03): staff ticket detail ops + status matrix + detail UI | Merged — 15 fixes + staff-users Admin guard + Phase 6 spec-consistency pass |
| https://github.com/ssiriwan/toktickit/pull/39 | #38 | feat(lab-03): admin user management API + UI | Merged — distinct role badges + drawer sheet |
| https://github.com/ssiriwan/toktickit/pull/41 | #40 | test(lab-03): E2E flows + responsive screenshots | Merged — 3 fixes (auth await, locator scoping, temp cleanup) |
| https://github.com/ssiriwan/toktickit/pull/43 | #42 | docs: Lab 3 Final — tests.md, ai-use, reviewer, test evidence | Approved by @thhanabun (LGTM) |

### Reviews Received — Details

- **PR #32 (Spec contract):** 8 fixes — (1) removed `resolutionSummary` from Ticket + UI (scope creep, deferred to Lab 4), (2) brand typo `TikTockIT` → `TokTickIT`, (3) Admin table now `Name | Email | Role | Status | Edit` on desktop, (4) seed credential placeholder table added, (5) queue search back to `ticketNumber+summary+description`, sort aligned to `ticketDate/updatedAt`, (6) added `relatedSystemId` filter, (7) AC traceability marked as Phase 2, (8) added BR-21 login-attempts (no lockout) + BR-22 CSRF.
- **PR #33 (Test plan):** 5 fixes — (1) non-English leftover `чуж` → `other owner's` (2 spots), (2) added UI-07 role-nav/forbidden cards (AC-06/16), (3) added UI-08 requester regression mapped to Lab 2 UI suite, (4) added VIS-01 screenshots row (AC-18), (5) split UNIT-01 → `password.unit.test.ts` and UI-06 → `theme.style.test.tsx`.
- **PR #34 (Auth foundation):** Merged after 7 fixes — (1) dummy bcrypt compare on fixed hash for null user (same timing path), (2) seed upsert preserves changed passwords (hash/mustChange on create only; proven by change→reseed→preserved test), (3) seed ticketNumbers `TKT-` → `TK-YYYYMMDD-XXXX` per BR-20, (4) API-04 rewritten as HTTP integration proof (mustChange login → `/me` 200 → `/requesters` 403) with auth mounted on deprecated endpoint, (5) split digit vs special password messages, (6) pinned PostgreSQL >= 12 (`postgres:17-alpine`) for multi-value enum ALTER, (7) marked `body.requesterId` trust as known gap with `TODO(Phase 4)`.
- **PR #35 (Requester regression):** 4 fixes — (1) download fetch sends credentials, (2) notes roles enforced at middleware layer, (3) phase4.* test users cleaned in every afterAll, (4) placeholder spans get title + aria-disabled. Plus: JWT fail-closed hardening, auth-test bcrypt-once speedup, migration checksum protected (PG pin kept in spec only).
- **PR #36 (Staff queue):** Merged after 6 fixes + 2 nits (401 redirect asserted, Res example ticketDate).
- **PR #37 (Staff detail):** Merged after 15 fixes — staff routes (claim/assign/priority/status/comments/notes/download/directory), 3 matrix rows corrected + 400 VALIDATION_ERROR, NEW↔OPEN coupling, Admin full staff ops (AD-13), confirm modals, 401→login, queue/detail UI polish (green Open button, Updated column, date-only, always-visible filters, header sort, requester-style dropdowns, auto-save detail, magnifier search) + Phase 6 spec-consistency pass (FR-07/FR-11/matrix/api-spec/ui-spec/tests.md aligned to AD-13).
- **PR #39 (Admin user management):** Merged — `GET/POST/PATCH/reset-password /api/admin/users` + `UserManagement` UI + `users-admin.api.test.ts`/`UserManagement.test.tsx` (ADMIN-01..07, UI-05, AUTHZ-04). Review round 1: role badges must use distinct ui-spec §1 colors (fixed with `.badge-role-*` tokens reusing the badge-status palette + UI/style test assertions); StaffTicketDetail author badges intentionally left channel-colored (public gray vs internal amber per ui-spec tabs).
- **PR #41 (E2E flows + screenshots):** Merged after 3 fixes — (1) await auth responses in login/change helpers to prevent form unmount swallowing responses, (2) scope responsive-duplicate locators to visible elements, (3) accept appears-resolved confirmation dialog and clean temp test users in setup.
- **PR #43 (Docs finalization):** Approved by @thhanabun ("lgtm."). Delivers: (1) `tests.md` flipped to 100% Pass across all 30 test files / 163 test cases with full AC traceability, (2) `ai-use.md` curated with 10 representative prompts and reflections across 5 phases, (3) `test-run-evidence.md` with complete verbatim logs for unit/integration (`npm test`), E2E (`npm run e2e:lab3`), and full build (`npm run build`), (4) `Login.tsx` null dereference fix on unauthenticated error responses, (5) 36 automated responsive screenshots across 4 categories (authentication, staff-queue, staff-ticket-detail, user-management) with `fullPage: true` capture and verified non-empty state, and (6) `prisma/seed.ts` reset fix for idempotent test runs.

## Pull Requests I Reviewed (partner repo: thhanabun/Software_Eng_Lab)

| PR | Title | Verdict |
| --- | --- | --- |
| https://github.com/thhanabun/Software_Eng_Lab/pull/37 | Lab 3 Sprint Specification and Test Plan (Issue #29) | Merged — approve, 6 non-blocking + 2 re-review rounds |
| https://github.com/thhanabun/Software_Eng_Lab/pull/38 | Lab 3 Authentication Foundation (Issue #30) | Merged — request changes (2 blockers), re-review conditional approve |
| https://github.com/thhanabun/Software_Eng_Lab/pull/39 | Lab 3 Requester Regression (Issue #31) | Merged — approve, 5 non-blocking |
| https://github.com/thhanabun/Software_Eng_Lab/pull/40 | Lab 3 IT Staff Ticket Queue (Issue #32) | Merged — approve, 3 nits |
| https://github.com/thhanabun/Software_Eng_Lab/pull/41 | Lab 3 IT Staff Ticket Detail Operations (Issue #33) | Merged — approve, 5 follow-ups |
| https://github.com/thhanabun/Software_Eng_Lab/pull/42 | Lab 3 Administrator User Management (Issue #34) | Merged — request changes (1 high), re-review approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/43 | Lab 3 E2E Tests and Responsive Visual Evidence (Issue #35) | Merged — approve, 3 non-blocking, re-review all closed |
| https://github.com/thhanabun/Software_Eng_Lab/pull/44 | docs: Lab 3 Final — tests.md + README (Issue 36) | Merged — approve, 4 non-blocking |
| https://github.com/thhanabun/Software_Eng_Lab/pull/45 | release: Lab 3 Auth, Roles, and Admin → main | Open — request changes (1 code + 3 docs blockers) |

### Reviews Given — Details

- **PR #37 (spec contract):** Approve. 6 non-blocking: (1) assign POST vs PATCH consistency, (2) unassign-from-OPEN rule, (3) Created Date visibility, (4) shorter pending-change expiry, (5) requester→staff-download 403 assert, (6) fill reviewer.md/ai-use.md in #36. Re-review `45fec14`: 5/6 closed, one nit left (BR-10/AD-01 not synced on 30-min pending). Re-review `03993b0`: synced — good to merge.
- **PR #38 (auth foundation):** Request changes — 2 blockers: (1) inactive session still usable (`resolveSession`/`requireAuth` ignore `active`), (2) migration `ADD VALUE` 7 times in one txn risks PG failure. Majors: (3) `cors(*)` without credentials, (4) login timing oracle + garbage-hash crash, (5) middleware not reusing `req.user`. Re-review `ee3684e`: 4/5 closed — conditional approve pending clean-DB `migrate deploy` log.
- **PR #39 (requester regression):** Approve. 5 non-blocking: (1) [Med] `owner.email` sent to requester — keep `{id,name}`, (2) [Med] no inactive read-only banner, (3) [Low] `returnTo` lost after forced-change, (4) [Low] standalone `RequireRole` skips must-change, (5) [Low] fire-and-forget logout.
- **PR #40 (staff queue):** Approve. 3 nits: owner filter only Anyone/Unassigned/Mine (API supports more), UI sort 6/10 of API, `searchInput` not synced on back/forward.
- **PR #41 (staff detail):** Approve. 5 follow-ups: (1) [Med] duplicated client/server matrix needs parity test, (2) [Med] CANCELLED still allows claim/assign/priority, (3) [Low] unassign on terminal leaves ownerless ticket, (4) [Low] `runOp` doesn't refresh `updatedAt`, (5) [Low] silent directory failure.
- **PR #42 (admin users):** Request changes (1 high): 409 duplicate email missing `details:[{field:email}]` so client field highlight falls back to generic banner. Non-blocking: no list pagination cap, last-admin check race (use `$transaction`), POST `active` silent coercion, reset without confirm field. Re-review `52433d6`+`10f6bd2`: 409 details fixed on both create/update + stray `SE_Implement.md` (3434 lines) removed — good to merge.
- **PR #43 (e2e):** Approve. 3 non-blocking: (1) mustchange test fails on isolated re-run without setup, (2) screenshots gitignored so reviewer can't inspect directly, (3) missing change-password screenshots. Re-review `f0a2049`/`ab70bad`/`5da4d8a`: all 3 closed (self-healing comment, §12 screenshot paths, change-password PNGs in 3 viewports) + full `ai-use.md`/`reviewer.md` rewrite — good to merge.
- **PR #44 (final docs):** Approve. 4 non-blocking: confirm UI password hint matches backend rule, duplicate mismatch texts need distinct aria roles, confirm server-side LAST_ADMIN 409, attach real test output before PDF Part 9.
- **PR #45 (release to main):** Request changes — 1 code blocker: (1) login `||` short-circuits the dummy-hash compare (`routes/auth.ts:43`), so unknown-email skips bcrypt entirely — timing oracle contradicting the comment above it; fix `verifyLoginPassword(password, user?.passwordHash ?? null)`. 3 docs blockers: (2) CN-01..05 map to non-existent `comments-notes.api.test.ts` (CN-05 boundary has zero evidence anywhere), (3) MIG-02 points to non-existent `migration.api.test.ts` (real tests in `users-admin`), (4) docs cite `artifacts/lab-03/screenshots/` paths but `.gitignore` ignores artifacts and zero PNGs are tracked — commit them or reword to PDF-reference. Nits: README still documents Lab 2 selector + omits dev logins, no global 401→login (error banner instead), last-admin guard reads filtered list client-side, dead clause in ChangePassword, reviewer.md #43 status stale, `Lab_3_sheet.pdf` tracked despite ignore rule.

> This file is updated continuously as reviews happen.
