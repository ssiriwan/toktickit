# AGENTS.md — TokTickIT Working Context

> Handoff log. Read this first when starting a new session so you know exactly where the project stands.

## Project
- **Repo:** `ssiriwan/toktickit` (GitHub). Monorepo:
  - `client/` React + Vite + TS (React Router v7)
  - `server/` Express + TS + Prisma/PostgreSQL
  - Adapters (`adapters/`) + shared tests under root `tests/`
- **Assignee:** ssiriwan. **Peer reviewer (must be done per lab):** Thanabun Tikaew (67070501021, GitHub `thhanabun`), repo `thhanabun/Software_Eng_Lab`.
- **Lab 2 (done, released):** Requester Ticketing MVP, 22 FR / 29 BR / 20 AC across 8 Issues. Released via PR #31 `lab2-staging` → `main` (`9ee4973`). Follow-ups: screenshots auto-gen (18 Playwright mock) + README/reviewer docs (PR #28/#30).
- **Lab 3 (active, Sprint 3):** Users/Roles + IT Staff queue/detail + Admin user mgmt. Replaces dev Requester selector with email/password auth (httpOnly JWT) + backend RBAC; keeps Lab 2 requester flows under login identity. Contract: `docs/lab-03/{specification,api-spec,ui-spec,tests}.md` (FR-01..15, BR-01..22 incl. status matrix §5.1, AC-01..18).

## Non-negotiable workflow (labsheet 10.1) — Lab 3 base is `lab3-staging`
- NEVER commit/directly edit `main`, `lab2-staging`, or `lab3-staging`.
- Each Issue: create GitHub Issue → create `feature/N-<slug>` **from latest `lab3-staging`** → implement (write failing test first) → commit → push → PR into `lab3-staging` → peer review by Thanabun → merge → next Issue.
- Only ONE issue active at a time. Do NOT start next Issue until current PR is approved+merged (unless the owner explicitly says otherwise).
- Release at the end: PR `lab3-staging` → `main` (only after all Lab 3 phases done).

## Current status (as of 2026-09-15)
- Lab 2: ✅ all 8 Issues done + released to `main` (PR #31). See git log `main` if needed; details below kept short.
- Lab 3 — ✅ **PR #32 Spec contract:** MERGED into lab3-staging. `docs/lab-03/{specification,api-spec,ui-spec}`. Review: 8 fixes (drop `resolutionSummary` → Lab 4, brand typo, admin Email column, seed table, queue search/sort/filters, AC phasing, BR-21 no-lockout + BR-22 CSRF).
- Lab 3 — ✅ **PR #33 Test plan:** MERGED. `docs/lab-03/tests.md` (AC-01..18 → 50+ rows, API/UI/E2E/VIS IDs). Review: 5 fixes (non-English leftover, UI-07/UI-08/VIS-01, split UNIT-01/UI-06).
- Lab 3 — ✅ **PR #34 Auth foundation:** MERGED into lab3-staging (2026-09-11). `User` model + JWT httpOnly cookie session + login/logout/me/change-password + migration + idempotent seed. Review: 7 fixes (dummy bcrypt compare, seed preserves changed passwords, `TK-YYYYMMDD-XXXX` seed numbers, HTTP proof for API-04, split password messages, PG pin `postgres:17-alpine`, `body.requesterId` TODO Phase 4). Plus JWT fail-closed hardening (no fallback secret in production + unit test).
- Lab 3 — ✅ **PR #35 Requester regression:** MERGED into lab3-staging (2026-09-12, `1314c43`). Session identity on all ticket/attachment APIs (selector + `X-Requester-Id` removed), comments/notes + `appearsResolved` role matrix, `Login`/`ChangePassword`/role `AppShell`, Lab 2 tests migrated to real-login helper. Review: 4 fixes (download credentials, notes middleware roles, phase4.* cleanup, placeholder a11y).
- Lab 3 — ✅ **PR #36 Staff queue:** MERGED into lab3-staging (2026-09-12, `8420a56`). `GET /staff/tickets` (strict query validation, search ticketNumber+summary+description, filters, sort ticketDate/updatedAt/priorities, pagination ≤50) + queue UI (desktop table + mobile cards, Retry reloads, 401→login redirect). Review: 6 fixes + 2 nits.
- ⏳ **PR #37 Staff detail (OPEN, needs review):** branch `feature/37-staff-detail` (`792ed60`, 2026-09-15, +710/−8). Claim/assign/reassign owner + `itPriority` (requested immutable) + status matrix + `StaffTicketDetail` UI + `staff-ticket-detail.api.test.ts` + `StaffTicketDetail.test.tsx`.
- ⏳ **NEXT:** merge PR #37 → Admin user management (`users-admin` API + `UserManagement` UI — not yet implemented, no `users-admin.api.test.ts`/`UserManagement.test.tsx` yet) → E2E + screenshots + `lab3-staging` → `main` release.
- **Unstaged right now:** `docs/lab-03/ai-use.md` + `docs/lab-03/reviewer.md` (evidence, updated continuously — do NOT commit mid-phase unless owner says so).
- **Tests (2026-09-15 run):** `npm test` → 28 files / 143 tests passed. 1 non-blocking unhandled rejection in `Login.test.tsx` (`mustChangePassword` of null) — investigate before release.
- **Note:** `docs/lab-03/reviewer.md` table row still says PR #36 "Open" but `gh` shows MERGED (2026-09-12) and its detail line says "Merged after 6 fixes" — fix the table row when touching reviewer.md next.

## Key decisions (do not silently change)
- Lab 2 API error shape: `{ error: { code, message, details } }`. Codes: `VALIDATION_ERROR`, `INVALID_QUERY`, `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`, `MAX_ATTACHMENTS`, `ACCESS_DENIED`, `NOT_FOUND`, `REMOVED`, `INTERNAL_ERROR`. (Changed from `{message, errors}` to match friend's better design; do not revert.)
- Ticket number format `TK-YYYYMMDD-XXXX`; summary max **150** chars (BR-06). NOT changed to friend's (TK-/120): different repo, no need to align.
- DB uses `isActive` (Py-embedded), NOT friend's `active`.
- Lab 3 auth: `bcryptjs` cost 12, JWT in httpOnly `SameSite=Lax` cookie (8h), logout clears server-side, no token in localStorage, fail closed without `AUTH_JWT_SECRET` in production. Password rule ≥8 + upper + lower + digit + special. `mustChangePassword` allowlist only `GET /me`, `POST /change-password`, `POST /logout` → else `403 PASSWORD_CHANGE_REQUIRED`. One role per user, no multi-role, no deletion (deactivate only + `SELF_DEACTIVATION`/`LAST_ADMIN` guards). No lockout (BR-21), CSRF via same-origin + Lax cookie only (BR-22, deferred tokens).
- Lab 3 tickets: `requestedPriority` immutable, `itPriority` = copy at migration, IT-only writes; status matrix per spec §5.1; comments/notes append-only 1..2000 chars; notes hidden from Requester (403, no content); `appearsResolved` flag-only (no status change).
- Migration rule: NEVER edit an applied `migration.sql` (checksum) — put corrections in spec notes / new migration.
- Peer-review evidence lives in `docs/lab-03/reviewer.md` (Lab 2's in `docs/lab-02/reviewer.md`). Lab 3 file is updated continuously (not stashed). Old Lab 2 stash `reviewer-content-wip` (on `feature/1-spec-docs`) is historical — leave it alone.

## Environment quirks
- Windows + git-bash. LF→CRLF warnings are normal, ignore.
- PostgreSQL runs in Docker container **`toktickit-db`** (host port **5434**, DB name `toktickit`, creds in root `.env`: `postgresql://toktickit:toktickit@localhost:5434/toktickit`). Named volume `toktickit_pgdata` holds data.
  - **Port conflicts:** another container `selab24-db` (course-specific, owner decided to STOP it) occupies host port 5434 (`0.0.0.0:5434->5432`). We recreate `toktickit-db` when needed: `docker rm -f toktickit-db && docker run -d --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5434:5432 -v toktickit_pgdata:/var/lib/postgresql/data postgres:17-alpine`. Data persists in the volume.
  - Container often **Exited** after idle → `docker start toktickit-db`; if port binding drops (`5432/tcp=[]`), recreate as above.
- **Prisma**: migration must go through the running DB (docker). Commands: `npm run prisma:generate`, `npm run prisma:migrate`, `npm run prisma:seed` (seed is idempotent upserts).
- Run all tests: `npm test` (vitest, projects). Server tests: `server/vitest.config.ts` (now includes `server/tests/lab-03/**` + legacy `tests/lab-0X/**`); client: `client/vitest.config.ts` (includes `client/tests/lab-03/**`). Lab 2 tests call `ticket.deleteMany` in cleanup → always re-seed after full runs.
- Client test import depth checklist: client tests use `../../src/` (easy to get wrong).
- Labsheet PDF is NOT readable by the AI directly → read via PyPDF2 under Python with `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')` to dodge cp874 errors. Disk-full incident once truncated `tests.md` — freed via `npm cache clean`, restored from git.

## Current prompt/evidence file
`docs/lab-03/ai-use.md` — required by labsheet (prompt log + reflections). Update it as sessions progress; it is committed evidence. (Lab 2's is frozen in `docs/lab-02/`.)

## Command cheatsheet
- `gh pr create --base lab3-staging --head feature/N-slug ...`
- `gh pr view <n> --json state,mergeable,reviewDecision`
- `git fetch origin && git log --oneline origin/lab3-staging -3`

## File map
- `docs/lab-03/{specification.md, tests.md, ui-spec.md, api-spec.md, ai-use.md, reviewer.md}` (Lab 2 frozen in `docs/lab-02/`)
- `prisma/schema.prisma` (+ `User` model), `prisma/seed.ts`, `prisma/migrations/`, `server/tests/lab-03/`, `client/tests/lab-03/`
- `server/src/{app.ts,auth.ts,auth-middleware.ts}` (routes/health/auth/staff), `client/src/lab-03/{Login,ChangePassword,StaffTicketQueue,StaffTicketDetail,AuthContext}.tsx`