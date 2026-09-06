# AGENTS.md — TokTickIT Working Context

> Handoff log. Read this first when starting a new session so you know exactly where the project stands.

## Project
- **Repo:** `ssiriwan/toktickit` (GitHub). Monorepo:
  - `client/` React + Vite + TS (React Router v7)
  - `server/` Express + TS + Prisma/PostgreSQL
  - Adapters (`adapters/`) + shared tests under root `tests/`
- **Assignee:** ssiriwan. **Peer reviewer (must be done per lab):** Thanabun Tikaew (67070501021, GitHub `thhanabun`), repo `thhanabun/Software_Eng_Lab`.
- **Lab 2 (final):** TokTickIT Requester Ticketing MVP with UI foundation, 60 pts. Style: Engineering spec → TDD (**Spec-Driven Development**). Total 22 FR / 29 BR / 20 AC across 8 GitHub Issues.

## Non-negotiable workflow (labsheet 10.1)
- NEVER commit/directly edit `main` or `lab2-staging`.
- Each Issue: create GitHub Issue → create `feature/N-<slug>` **from latest `lab2-staging`** → implement (write failing test first) → commit → push → PR into `lab2-staging` → peer review by Thanabun → merge stash → next Issue.
- Only ONE issue active at a time. Do NOT start next Issue until current PR is approved+merged (unless the owner explicitly says otherwise).
- Release at the end: PR `lab2-staging` → `main` (only after all 8 Issues done).

## Current status (as of 2026-09-02)
- ✅ **Issue 1 — Specification docs:** PR #11 — MERGED into lab2-staging. All 6 docs in `docs/lab-02/`.
- ✅ **Issue 2 — DB Schema + Seed:** PR #13 — MERGED into lab2-staging. Schema, migration `add_lab2_models`, idempotent seed, seed tests (14 tests).
- ✅ **Issue 3 — Requester Context:** PR #15 — MERGED into lab2-staging (2026-09-03, `98f21b8`). `GET /api/requesters` (name asc), `RequesterUserContext`, `RequesterSelection`, `AppShell`/Change Requester, relative `/api` + Vite proxy. Review fixes: context wiring, relative path, name ordering. 22 tests.
- ✅ **Issue 4 — Ticket Creation:** PR #17 — MERGED into lab2-staging (2026-09-03, `2343675`). `POST /api/tickets` (full details + integer checks, trim, unique `TK-YYYYMMDD-XXXX` with 5-try retry, 404 inactive), `GET /api/related-systems`, `CreateTicket` (read-only system info, field-level validation below field, red * + counters + aria-required, busy/error, success with ticketNumber + View/Create another, Cancel resets), `AppShell` on `react-router-dom` (`/`, `/create`). Review fixes: validation, collision retry, fetch ok check, UI polish, router. 37 tests.
- ✅ **Issue 5 — My Tickets:** PR #19 — MERGED into lab2-staging (2026-09-04, `6d1b369`). `GET /api/tickets` (isolation, search summary+description, filters, sort, pagination; header fallback + strict page/pageSize validation), `MyTickets` (search + Category/System/Status/Priority + Sort + Page size + Prev/Next, server-driven, shows category/priority/date, pagination metadata). Review fixes: header support, NaN→400, double filter removed, full UI controls. 52 tests.
- ✅ **Issue 6 — Ticket Detail + Attachments:** PR #21 — MERGED into lab2-staging (2026-09-04, `251a69c`). `GET /api/tickets/:id` + `POST /attachments` (multer, 5MB, max 5, type check) + `GET /download` (403/410) + `PATCH /remove` (reason), `TicketDetail` (requester/updatedAt, upload/download/remove with error handling, a11y), `MyTickets` keyboard fix, `uploads` helper + .gitignore. Review fixes: missing API-ATT/UI tests, download/remove errors, fileFilter, uploads path, invalid ticket a11y, plus remaining nits (shared uploadsDir helper, input reset, fileURLToPath). 70 tests (17 files), build clean.
- ✅ **Issue 7 — Zen Green Theme Polish:** PR #23 — MERGED into lab2-staging (2026-09-04, `7db39af`). `theme.css` tokens, `zen-header` (56px, NavLink, brand Link), badges, `required-star`/`zen-readonly`, warning/success vars, tablet breakpoint, style test (7 checks) + screenshots placeholders per ui-spec §10-11. Review fixes: nav/brand a11y, dead CSS wired, missing vars, responsive, style test cwd-independent, artifacts. 77 tests (18 files), build clean.
- ⏳ **NEXT — Issue 8: E2E + Release** (E2E flows, final screenshots, `lab2-staging` → `main` release, docs finalization). Then merge docs (ai-use, reviewer, AGENTS) at the very end.
- **Docs:** `docs/lab-02/ai-use.md` + `reviewer.md` + `AGENTS.md` keep unstaged and merge together at the very end per owner decision (reviewer content stashed as `reviewer-content-wip`).

## Key decisions (do not silently change)
- API error shape: `{ error: { code, message, details } }`. Codes: `VALIDATION_ERROR`, `INVALID_QUERY`, `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`, `MAX_ATTACHMENTS`, `ACCESS_DENIED`, `NOT_FOUND`, `REMOVED`, `INTERNAL_ERROR`. (Changed from `{message, errors}` to match friend's better design; do not revert.)
- Ticket number format `TK-YYYYMMDD-XXXX`; summary max **150** chars (BR-06). NOT changed to friend's (TK-/120): different repo, no need to align.
- DB uses `isActive` (Py-embedded), NOT friend's `active`.
- Peer-review evidence lives in `docs/lab-02/reviewer.md`. Another opencode terminal owns the review content; the main session should NOT edit it concurrently (conflict risk). Owner decided: merge reviewer.md content at the very end. The reviewer content from the friend's PR #21/#22 review was written, then **git stashed** (stash `reviewer-content-wip`) before starting Issue 2 — restore it when committing reviewer.md at the end.

## Environment quirks
- Windows + git-bash. LF→CRLF warnings are normal, ignore.
- PostgreSQL runs in Docker container **`toktickit-db`** (host port **5434**, DB name `toktickit`, creds in root `.env`: `postgresql://toktickit:toktickit@localhost:5434/toktickit`). Named volume `toktickit_pgdata` holds data.
  - **Port conflicts:** another container `selab24-db` (course-specific, owner decided to STOP it) occupies host port 5434 (`0.0.0.0:5434->5432`). We recreate `toktickit-db` when needed: `docker rm -f toktickit-db && docker run -d --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5434:5432 -v toktickit_pgdata:/var/lib/postgresql/data postgres:17-alpine`. Data persists in the volume.
  - Container often **Exited** after idle → `docker start toktickit-db`; if port binding drops (`5432/tcp=[]`), recreate as above.
- **Prisma**: migration must go through the running DB (docker). Commands: `npm run prisma:generate`, `npm run prisma:migrate`, `npm run prisma:seed` (seed is idempotent upserts).
- Run all tests: `npm test` (vitest, projects). Server tests read `server/vitest.config.ts` (include now covers lab-01 + lab-02 `*.server.test.ts`).
- Labsheet PDF is NOT readable by the AI directly → read via PyPDF2 under Python with `sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')` to dodge cp874 errors.

## Current prompt/evidence file
`docs/lab-02/ai-use.md` — required by labsheet (prompt log + reflections). Update it as sessions progress; it is committed evidence.

## Command cheatsheet
- `gh pr create --base lab2-staging --head feature/N-slug ...`
- `gh pr view <n> --json state,mergeable,reviewDecision`
- `git fetch origin && git log --oneline origin/lab2-staging -3`

## File map
- `docs/lab-02/{specification.md, tests.md, ui-spec.md, api-spec.md, ai-use.md, reviewer.md}`
- `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/`, `tests/lab-02/`
- `server/src/app.ts` (routes/health), `client/src/App.tsx` (still Lab-1 UI until Issue 3+)