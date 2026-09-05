# AI Use and Reflection

I used **opencode** (model: muse-spark-1.2) for TokTickIT Lab 2 — from specification and test planning to implementation of Issues 2–8. I reviewed every generated file, migration, seed, test, and commit before accepting it.

## Lab 2 — Specification Documents — Session 1

### 1. Review PDF labsheet

**Prompt:** `Review [PDF 1] — summarize what needs to be done`

**Reflection:** The model cannot read PDFs directly, so I worked around it with PyPDF2 in Python to extract the 22-page labsheet. This taught me to solve tool limitations with available libraries.

### 2. Start with spec doc

**Prompt:** `Start with the first part — Spec doc`

**Reflection:** The agent checked the project structure first, then drafted `specification.md` with all 11 required sections. Starting with the spec before any code kept the scope clear.

### 3. Write all 3 docs at once

**Prompt:** `Do all 3 files at once`

**Reflection:** Writing `tests.md`, `ui-spec.md`, and `api-spec.md` in parallel was efficient. The agent reused the format from `docs/lab-01` so the output was consistent.

### 4. Save AI prompts

**Prompt:** `Save AI prompts as well`

**Reflection:** The agent followed the `docs/lab-01/ai_use.md` format and logged the prompts. Keeping the file as evidence is required for the course.

### 5. Save AI prompts and create Issues

**Prompt:** `Save AI prompts and then walk me through creating an Issue`

**Reflection:** The agent explained GitHub Issues as the sprint backlog and created the first Issue together. This clarified the workflow before coding.

## Lab 2 — Issue 2 Database Schema and Seed — Session 2

### 1. Merge confirmed

**Prompt:** `Issue 1 has been merged`

**Reflection:** The agent verified the merge with `gh pr view` and `git fetch` before starting the next Issue. Checking the real git state prevents building on a stale branch.

### 2. Check branch health

**Prompt:** `Check branch status — how does it look now?`

**Reflection:** The agent showed per-branch status and the leftover `reviewer.md` edit from another terminal. Seeing the uncommitted change made the stash decision obvious.

### 3. Start Issue 2

**Prompt:** `Start Issue 2 now`

**Reflection:** Followed a clean pipeline: `Issue #12 → feature/2-db-schema → schema + migration + seed → seed tests → npm test 14 passed → PR #13`. Stashing the leftover `reviewer.md` kept the branch clean.

### 4. Preview website request

**Prompt:** `Do we need UI tests? I want to see what the website will look like`

**Reflection:** The agent answered from `tests.md` (UI-SELECT-01..04) and offered to run the dev server. I chose to wait for approval, so we stayed on one Issue at a time.

## Lab 2 — Issue 3 Requester Context and Dev Selection — Session 3

### 1. Friend review — wire AppShell

**Prompt:** `Friend review: GET /api/requesters correctly filters ... Please wire AppShell ...`

**Reflection:** The friend cited their own spec line numbers (BR-06 is summary 150 in our spec, not persistence). I learned to separate repo-specific differences and fix only what improves our design — context wiring, `relative /api`, and `name asc`.

### 2. Check localStorage

**Prompt:** `Do we have localStorage? / Is localStorage required?`

**Reflection:** Grep showed no `localStorage` in our codebase — only in `reviewer.md` describing the friend's repo. Per `BR-03` (testing context, not auth) it is not required.

### 3. Explain context wiring

**Prompt:** `What does wiring AppShell through context mean?`

**Reflection:** The agent explained the dead code: `AppShell` used local `useState` while the Context was unused. Moving state into the provider lets future screens use `useRequester()` as a single source.

### 4. Fix as promised

**Prompt:** `Fix what we told them we would fix`

**Reflection:** Implemented the three agreed fixes (context wiring, `relative /api` + Vite proxy, `name asc`) and resolved the Docker port `5434` conflict. With `22 tests` passing, the review was resolved.

## Lab 2 — Issue 4 Ticket Creation — Session 4

### 1. Start Issue 4

**Prompt:** `Start now — follow the workflow exactly`

**Reflection:** Created `Issue #16` and `feature/4-ticket-creation` from the latest `lab2-staging`, read `api-spec §4` and `ui-spec §5.2`, and wrote failing `API-TICKET-01..10` + `UI-CREATE` tests first (TDD).

### 2. How to build/test

**Prompt:** `Friend told us to try building/testing ourselves — how?` / `Still don't understand — let's just run the tests`

**Reflection:** The agent explained `docker ps` + `npm test` + `npm run build`. Running the full suite (12 files, 37 passed, build clean) showed the warnings were not failures.

### 3. Friend review — 8 fixes

**Prompt:** `Friend review: https://github.com/ssiriwan/toktickit/pull/17 Needs fix: server/src/app.ts:71 ...`

**Reflection:** The eight points (validation details, `TK` collision retry, `fetch` check, error placement, `*`, counters, success state, `react-router-dom`) all improved robustness, so I applied them.

### 4. Create-time attachments

**Prompt:** `Allow upload when creating a Ticket — just update the spec` / `Then add it at creation — good`

**Reflection:** First reverted the upload-at-creation as out-of-scope, then updated `specification.md` to document “Create with Attachments” (sequential `POST /:id/attachments` after creation) before re-adding the file input. Now it is spec-before-code.

## Lab 2 — Issue 5 My Tickets — Session 5

### 1. Friend review — 6 fixes

**Prompt:** `Friend review: Needs fix: server/src/app.ts:214 ...`

**Reflection:** The review covered header vs query, `pageSize`, double filtering, and missing UI controls. Fixing `NaN/0 →400` and rebuilding `MyTickets` as server-driven brought us to `52 tests` passed.

### 2. Do good fixes

**Prompt:** `If it's good, go ahead`

**Reflection:** The agent kept `?requesterId=` plus `X-Requester-Id` fallback for flexibility — a pragmatic compromise that keeps existing tests green.

## Lab 2 — Issue 6 Ticket Detail and Attachments — Session 6

### 1. Start Issue 6

**Prompt:** `Ready — let's start`

**Reflection:** Created `Issue #20` and `feature/6-ticket-detail-attachments`, read `api-spec §6-9` and `ui-spec §5.4`, and added `multer` + `uuid`.

### 2. Remaining nits

**Prompt:** `Remaining nits: ...`

**Reflection:** The nits (orphan file, cwd-dependent `uploads` path, input reset, `Invalid ticket` a11y) were all valid. Extracting `uploadsDir` to `server/src/uploads.ts` and fixing the input reset prevents subtle bugs.

## Lab 2 — Issue 7 Zen Green Theme Polish — Session 7

### 1. Start Issue 7

**Prompt:** `Friend has merged — let's start, please check against the spec we wrote`

**Reflection:** Checked `ui-spec §1-10` and `FR-22` before coding. Created `theme.css` with tokens and a persistent `zen-header` with `NavLink`.

### 2. Remaining theme nits

**Prompt:** `Remaining nits: AppShell nav, badge-priority ...`

**Reflection:** Dead CSS (`.badge-priority-*` defined but not used) and missing `--zen-warning`/`--zen-success` were gaps. Wiring the classes and adding the tablet breakpoint completed the theme.

## Lab 2 — Issue 8 E2E and Release — Session 8

### 1. Add E2E

**Prompt:** `Start now — please check against the spec we wrote (Issue 8)`

**Reflection:** Added `e2e/lab-02/requester-ticket-flow.spec.ts` with Playwright (4 flows) and `playwright.config.ts` with two `webServer` entries (Windows-safe). Kept the `supertest` integration at `tests/...integration.test.ts` for API coverage.

## Reflection

Using AI was helpful for turning the Lab 2 requirements into a clean vertical slice. The key was giving clear constraints — “do not implement beyond Issue X” and “review issue N before implementing”. This kept each Issue self-contained on its own branch for peer review.

I learned to control the workflow explicitly: review first, implement, then commit and push as separate steps so I could inspect each diff. I also learned to always verify with real test output and acceptance criteria, not just the agent's summary.

Peer review taught me to distinguish repo-specific spec differences and fix only what improves our design. TDD with failing tests first caught validation gaps early, and handling edge cases like Docker port conflicts, file inputs, and single-fork test isolation prevented flaky failures.

Going forward, I will keep `ai-use.md` updated after every conversation and keep `AGENTS.md` as the handoff log so any new session can resume without re-explaining.
