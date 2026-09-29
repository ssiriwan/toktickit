# AI Use and Reflection — Lab 4

> Evidence for report Part 4. Updated continuously as sessions progress.
> Standing rule (owner instruction 2026-09-22): this file stays **local-only** — update it every session but NEVER commit/push until the owner explicitly orders it.
> Agent: opencode. Model: Muse Spark (Meta).

---

## Selected Key Prompts (running log)

### 1. Review implementation plan + start first issue
**Prompt (TH):**
> *"ตรวจสอบ implementation plan C:\Users\HP\Desktop\Uni code\CPE334\plan\implementation plan lab4.md ว่าต้องทำอะไรบ้าง และเริ่มทำ issue แรกเลย"*

**What the agent did:**
Read `plan/implementation plan lab4.md` (534 lines) + `toktickit/AGENTS.md`, verified repo state (`main @1d8a8be` = Lab 3 release, `npm test` baseline 30 files/163 tests, no `lab4-staging` / `docs/lab-04` yet), stashed an unrelated dirty `reviewer.md` note, created GitHub Issue #45 (plan calls it #46 — numbers drift because Issues/PRs share one sequence), created `lab4-staging` + `feature/45-spec-contract`, authored `docs/lab-04/{specification,api-spec,ui-spec,tests}.md` (FR-01..16, BR-01..25, auth/status matrices, resolution gate, AC-01..20 traceability), committed + pushed + opened PR #46 into `lab4-staging`.

**Reflection:**
Spec-first before code keeps Issues #47+ honest — every later PR can be judged against the contract. Verifying the git baseline first (instead of assuming the plan's branch state) avoided branching from a dirty tree. The numbering drift (plan #46 = real #45) is normal GitHub behavior; recording the mapping in the PR body preserves traceability for the report.

### 2. Standing evidence rule (local-only ai-use/reviewer)
**Prompt (TH):**
> *"ต่อจากนี้ช่วยทำการ update คำสั่งลง ai-use.md ตลอดด้วย และถ้ามีการรีวิวช่วยอัพเดตลง reviewer.md ของ lab4 แต่ว่าไม่ต้อง commit เลย ให้มันเป็น local ตลอด จนกว่าเราจะสั่งให้ commit"*

**What the agent did:**
Created `docs/lab-04/ai-use.md` + `docs/lab-04/reviewer.md` as untracked local-only files; all future commits must use explicit `git add <paths>` (never `git add -A`/`.`) so these two files stay uncommitted until ordered.

**Reflection:**
Keeping evidence files local until the final docs PR avoids polluting code-review diffs and matches the Lab 3 pattern where `reviewer.md` was updated continuously. The risk is forgetting to commit them before the release — mitigated by the DoD checklist item and a final explicit commit order from the owner.

### 3. Read peer review comments on PR #46
**Prompt (TH):**
> *"เพื่อนรีวิวให้แล้ว เข้าไปดูทีว่าเพื่อนคอมเม้นว่าอะไร"*

**What the agent did:**
Pulled PR #46 comments via `gh pr view` (3 comment bodies, no formal `reviewDecision` yet): 1 Passed checklist (11 sections, BRs, matrix/gate/concurrency, DB justifications, pre-implementation tests.md) + 4 issues (dashboard card mismatch across spec/api/ui; missing unit/style/perf-smoke test rows; missing `ticket-resolution.spec.ts`; unlocked `recentlyResolved`/`closed` definition) + 3 nits (staff card count + missing unassigned card; 7-day timezone/empty behavior; `actionDateTime` validation BR). Recorded all of it in local-only `docs/lab-04/reviewer.md`; fixes pending before merge.

**Reflection:**
Reviewing the spec before any code exists is exactly when inconsistencies are cheapest to fix — the dashboard mismatch would otherwise have propagated into API, UI, and tests simultaneously. The reviewer's section/line citations (spec.md:49, ui.md:21, api.md:44) made each fix locatable without a second read-through.

### 4. Fix peer review round 1 (4 issues + 3 nits)
**Prompt (TH):**
> *"เริ่มแก้ 4 issue + 3 nits เลย เอาให้ถูกและตรงกัน"*

**What the agent did:**
Locked the ambiguous definitions and synced all 4 contract files: requester = 5 cards 1:1 with API metrics (dropped the phantom "In Progress" card; `totalOpen` card links the unfiltered list since it spans 5 statuses); staff = 7 cards 1:1 with API metrics (added missing `Unassigned` + `Urgent` cards with `?owner=unassigned` / `?itPriority=URGENT` drill-downs); added BR-26 (`recentlyResolved` = own RESOLVED within window), BR-27 (`closed` = own CLOSED all-time), BR-28 (window = `updatedAt >= now − 7×24h` server UTC + zeroed-metrics empty behavior), BR-29 (`actionDateTime` ISO rule, ≤24h future tolerance); added UNIT-01/02, UI-07 style, PERF-01 perf-smoke, E2E-03 `ticket-resolution.spec.ts`; removed the "fixed in implementation PR" deferral. Verified with grep (no stale strings; `git status` shows only the 4 spec files modified), committed them explicitly (`ai-use.md`/`reviewer.md` left untracked per standing rule), pushed, and replied on PR #46 asking for re-review.

**Reflection:**
The reviewer's line citations turned a vague "mismatch" into mechanical edits — every fix was a targeted string replacement rather than a redesign. Locking derived-metric definitions (BR-26..28) before any implementation PR prevents the API/UI/tests authors from each inventing their own window semantics.

### 5. Triage peer review round 2 (partly stale)
**Prompt (TH):**
> *"เพื่อน comment แล้ว เข้าไปดู"*

**What the agent did:**
Pulled the 3 new comments: round 2 still lists ui-spec §3.1 "4 cards", missing unit/style/perf rows, missing E2E row, and staff "5 cards" as blocking/stale-state — but verified via `git show origin/feature/45-spec-contract:...` that the PR already serves the fixed content (5 cards, 7 cards, UNIT-01/02 + UI-07 + PERF-01 + E2E-03 all present), so those items were reviewed against a pre-fix snapshot. Fixed the 2 genuinely valid points instead: added `actionDateTime` to the api-spec §5 `details` field list, and added ACT-12 (API-level BR-29 row for invalid/>24h-future `actionDateTime`). Committed the 2 files explicitly, pushed, and replied on the PR quoting current lines.

**Reflection:**
"Verify the remote first" beats "trust the review text" — the 30-second `git show origin/...` check prevented a full wasted re-edit cycle and let the reply cite exact evidence instead of arguing from memory.

### 6. Fix duplicate checklist line (valid non-blocking)
**Prompt (TH):**
> *"Coverage checklist has a leftover duplicate line — line 63 repeats the tail of line 62; delete one"*

**What the agent did:**
Confirmed `tests.md:63` duplicated the tail of `:62` (leftover from inserting the UI-07 row), deleted it, committed `tests.md` explicitly, pushed, and acknowledged on the PR.

**Reflection:**
Small proof that the reviewer actually reads the diff line-by-line — worth one careful self-read of every edited hunk before pushing, to catch this class of leftover-duplicate error at the source.

### 7. PR #46 merged, Issue #45 closed
**Prompt (TH):**
> *"เพื่อน merge แล้ว"*

**What the agent did:**
Verified `MERGED (ea9bd51)` via `gh pr view`, closed Issue #45 with a delivery comment, checked out + pulled `lab4-staging`, deleted local `feature/45-spec-contract`, confirmed `docs/lab-04/` present with `ai-use.md`/`reviewer.md` still untracked local-only, recorded the merge in `reviewer.md`.

**Reflection:**
Spec-first phase is officially done — the contract is now the immutable baseline on `lab4-staging`. Every implementation PR (#47+ in plan numbering) will be judged against it; any contract change from here on needs its own justification, not a silent edit.

### 8. Actions Taken foundation (Issue #47) — TDD implementation
**Prompts (TH):**
> *"คราวหลังไม่ต้องลบ branch ทิ้ง แล้วก็ ทำตามแผนต่อไปได้เลย"* (+ *"ต้องเปิด docker ไหม"*)

**What the agent did:**
Docker Desktop daemon was down → started it; `toktickit-db` healthy on 5434. Backed up the volume (`pgdata_lab4_before.tar.gz`, local-only). Created Issue #47 + `feature/47-actions-foundation` (branch kept, not deleted, per standing rule). TDD: wrote `actions-taken.api.test.ts` (ACT-01..12, mock-based like Lab 3) → 12/12 red (404s). Hit 2 infra snags: (1) `prisma migrate` loaded `server/.env` (no DATABASE_URL) → ran from repo root; (2) Lab 3 migration drift — worktree CRLF vs applied LF **plus** a comment-only post-apply edit in `f29876d` (proven by matching DB checksum `72d20a43…` to `36807a4` bytes) → normalized files to LF, locked `prisma/migrations/*.sql text eol=lf` in new `.gitattributes`, repaired the single checksum metadata row (no schema/data change), migrated clean. Implemented: `ActionStatus`+`ActionTaken` schema, `20260925161247_lab4_actions_taken`, pure `action-validation.ts` + UNIT-02, 4 routes in `app.ts` (staff GET/POST/PATCH + requester GET), idempotent action seeds (0-action ×3, 1-completed, multi-performer+follow-up). Fixed a `string|string[]` params typing error. Green: lab-04 17/17, full suite 32 files/180 tests, both builds clean; re-seeded (8 tickets/4 actions).

**Reflection:**
Checksum forensics (sha256 per git version vs `_prisma_migrations`) turned a scary "reset or lose data" ultimatum into a 1-row metadata repair — always compare bytes before reaching for destructive commands. The CRLF drift would have bitten every Windows checkout, so the `.gitattributes` lock pays for itself permanently.

### 9. Compliance check vs labsheet + spec (Issue #47)
**Prompt (TH):**
> *"ตรวจสอบว่าตรง labsheet และ spec แล้วใช่มั้ย"*

**What the agent did:**
Read `SE+Lab+4.pdf` via PyPDF2 (11 pages) and checked §4.1/§4.3/§4.4/§5.1–5.3/§12 against the branch: all 7 §4.1 fields in model+API, §4.3 backend-enforced authz, BR-01/02, cascade FK, idempotent seed (ran 3×, counts stable), exact §12 path `server/tests/lab-04/actions-taken.api.test.ts`. Found 1 gap: our spec §7 promises 8-status seed coverage but seed had 7 (no CANCELLED; labsheet §5.3 only demands "major" statuses, but our contract is stricter). Added `TK-20260910-0009` CANCELLED + extended the seed union type, re-seeded (9 tickets/8 statuses/4 actions, duplicate-free), lab-04 tests still 17/17, committed `850e69e`.

**Reflection:**
Checking the stricter document (our spec) instead of just the labsheet minimum is what caught the gap — the contract we wrote is the real bar, and it briefly convicted its own seed data.

### 10. PR #48 review round 1 — all fixable, all fixed
**Prompt (TH):**
> *"เพื่อนรีวิวแล้ว"*

**What the agent did:**
Pulled 3 comments (Passed + 2 blocking + 3 nits). Blocking 1 was a genuine spec-§11 violation (PATCH accepted any enum value) → added `ACTION_TRANSITIONS` + `isActionTransitionAllowed` to the validation module, enforced in PATCH with `Transition from X to Y is not permitted`, added ACT-13 + unit cases, documented the matrix in api-spec. Blocking 2 (drift proof) → ran `migrate status` ("up to date", 4/4) and verified per-file checksums; learned Prisma's checksum is line-ending-insensitive, so the true root cause was only the comment edit. Nits: explicit-clear 400 (ACT-14), numeric-datetime guard (+ unit), requireAuth-inactive confirmation by code citation (no change). Green 20/20 + tsc; committed `62fb5b4`; replied with proof; recorded here + reviewer.md (local-only).

**Reflection:**
A reviewer who cites file:line turns triage into a checklist — the only judgment call was lifecycle strictness (no PENDING→COMPLETED skip), resolved by re-reading spec §11's "linear" wording literally.

### 11. PR #48 merged, Issue #47 closed
**Prompt (TH):**
> *"เพื่อน merge แล้ว"*

**What the agent did:**
Verified `MERGED (85e14d2)`, closed Issue #47 with delivery comment, pulled `lab4-staging`, kept `feature/47-actions-foundation` (standing rule: never delete branches), confirmed evidence files still untracked local-only, recorded the merge in `reviewer.md`.

**Reflection:**
Foundation phase done with zero open threads — backend contract for actions is now merge-locked, so Issues #48+ (UI, workflow, dashboards) build on frozen APIs.

### 12. Actions Taken UI (Issue #49) — TDD implementation
**Prompt (TH):**
> *"ทำแผน Action Taken UI ต่อเลย ตรวจสอบให้ตรงกับ spec และโจทย์ด้วย"*

**What the agent did:**
Verified labsheet §3/§8.3 + ui-spec §3.3/3.4 (staff list/table + create + view/edit; requester sees items read-only). Created Issue #49 + `feature/49-actions-taken-ui` (kept). TDD: `ActionsTaken.test.tsx` (UI-01 validate+debounce, UI-02 read-only) → red on missing module. Built `lab-04/ActionsTakenList.tsx` (role-scoped fetch, modal form with BR-mirroring client validation, submitting-ref debounce, server details→field mapping, Edit + Mark-completed (opens editor on 400-result) + Cancel-action, `.badge-action-*` tokens) + wired into staff + requester details with `Array.isArray` guards so legacy fetch stubs can't crash old suites. Fixed a client `noImplicitAny` build error. Green: client 15 files/68 tests, full `npm test` 33 files/185 tests, both builds clean; re-seeded.

**Reflection:**
The `Array.isArray` guard was the highest-value line in the PR — without it, every legacy detail test whose fetch stub returns a ticket object for the new actions URL would have thrown on `.map`. Defensive parsing at trust boundaries beats updating a dozen old stubs.

### 13. PR #50 review — non-blockings only, fixed same session
**Prompt (TH):**
> *"เพื่อนคอมเม้นมาแล้ว"*

**What the agent did:**
Passed + 2 non-blocking, zero blocking: (1) edit-mode status dropdown unfiltered → added `EDIT_STATUS_OPTIONS` client mirror (create keeps all 4); (2) datetime seconds-churn → PATCH omits `actionDateTime` when minute-unchanged. Added UI-01b covering both (first run failed on an over-broad option query hitting the performer select — scoped to the status select, then green). 3/3 + client build clean; committed `9064cca`; replied; recorded in reviewer.md (caught and repaired a self-inflicted header overwrite while editing it — verified by re-reading the file).

**Reflection:**
Non-blocking doesn't mean later — fixing in-session keeps the PR merge-ready and compounds reviewer trust. The test-query bug (scope discipline in `within()`) was a miniature of the Array.isArray lesson: always query the narrowest true scope.

### 14. PR #50 merged, Issue #49 closed — Lab 4 halftime status
**Prompt (TH):**
> *"เพื่อน merge แล้ว แผนที่เหลือคืออะไร ยังไม่ต้องเริ่ม"*

**What the agent did:**
Verified `MERGED (9be9e1e)`, closed Issue #49, pulled `lab4-staging` (kept feature branch), recorded the merge locally. Summarized remaining plan without starting (see reply).

### 15. Split dashboards into API → UI (plan amendment)
**Prompts (TH):**
> *"ตอน Role dashboard คือทำทั้ง UI และ API ทีเดียวเลยหรอ"* → *"เอาแบบ 2 ดีกว่า ปรับแผน"*

**What the agent did:**
Confirmed the plan had dashboards as one issue, recommended the API-first split (same rhythm as actions #47→#49; dashboard math deserves locking before UI), and amended `plan/implementation plan lab4.md`: 6→7 issues (dashboards API #50, dashboards UI #51, final #52), updated mermaid + table + Part-1 Kanban range; refreshed the reviewer.md numbering note. No code started.

### 16. Dashboards API (Issue #51) — TDD implementation
**Prompt (TH):**
> *"แผนต่อไป Role dashboards API"*

**What the agent did:**
Checked labsheet §4.6/§6.2 (backend-computed, exact names, UTC boundaries, drill-down links, empty behavior) — contract already compliant. Created Issue #51 + `feature/51-dashboards-api` (kept). TDD: RD/SD/UNIT/PERF tests → red (404s + missing module). Implemented `dashboard-window.ts` (BR-28, both-ends-inclusive per tests.md row) + 3 endpoints reusing moved-up `adminGuards` (fixed a TDZ ordering bug before it bit). Fixed a test mock routing gap (admin id) and made PERF-01 load root `.env` + skip gracefully when DB is down (Docker daemon had died mid-session; restarted Desktop + container). Green: dashboard 9/9 incl. real-DB PERF-01, full suite 37 files/195 tests, tsc clean; re-seeded.

**Reflection:**
The TDZ catch (adminGuards declared after use) is the kind of bug that passes tests but crashes production boot — route registration runs at import time, so only a real `createApp()` smoke would catch it; our supertest suite does exactly that on every run, which is why mock-based API tests still earn their keep.

### 17. Dashboards API compliance re-check (1 gap found + fixed)
**Prompt (TH):**
> *"ตรวจสอบดูว่าตรง spec ไหม หรือมีอะไรขาดรึเปา่"*

**What the agent did:**
Re-read `api-spec.md §3` line by line against `app.ts`: requester shape/filters/guards ✓, staff counts/exclusions ✓, admin userSummary ✓, window + empty behavior ✓. Found 1 gap: staff `recentTickets` must be "5 latest favouring urgent" but the query sorted by `updatedAt` only → changed to `orderBy: [{ itPriority: 'desc' }, { updatedAt: 'desc' }]` (PG enum order puts URGENT first) + strengthened SD-01 to assert the ordering. 9/9 green, tsc clean, pushed to PR #52.

### 18. PR #52 merged, Issue #51 closed
**Prompt (TH):**
> *"เพื่อน merge แล้ว"*

**What the agent did:**
Verified `MERGED (9a9e798)` with zero review comments, closed Issue #51, pulled `lab4-staging`, kept the feature branch, recorded locally. Dashboards API locked — UI issue next.

### 19. Dashboards UI (Issue #53) — TDD implementation
**Prompt (TH):**
> *"dashboard UI ต่อเลย"*

**What the agent did:**
Explored routing (real root = `lab-02/AppShell`, not the Lab 1 placeholder `App.tsx`) and found list pages ignore URL query. Created Issue #53 + kept branch. TDD: UI-03/UI-04 → red on missing modules. Built `RequesterDashboard` (5 cards 1:1 + hrefs, quick actions, recent, empty/error states) + `StaffDashboard` (7 cards, Refresh, admin strip, role-picked endpoint), wired `/` per role + Dashboard nav in AppShell, added validated URL-filter init to both list pages. Caught 2 legacy breaks before pushing: (1) `useSearchParams` needs a Router (Lab 2 tests render bare) → switched to `window.location.search` (works under BrowserRouter, defaults safely in tests); (2) app-shell tests asserted the replaced home text → updated 2 assertions + dashboard stubs with a contract justification comment. Full suite first ran red on DB-down (container had exited — restarted); clean re-run: 39 files/201 tests, both builds clean; re-seeded.

**Reflection:**
Replacing a placeholder home looks trivial until the regression suite disagrees — the suite did its job by forcing an explicit, documented decision (update stale assertions vs preserve dead text) instead of a silent break.

### 20. Dashboards UI spec re-check (1 gap + 1 deviation documented)
**Prompt (TH):**
> *"recheck กับ spec หน่อยว่าตกหล่นไหม"*

**What the agent did:**
Checked ui-spec §2/§3.1/§3.2 + spec §6 + FR-14..16 line by line: nav, `/` routing, 5+7 cards + hrefs, admin strip counts, quick actions, recent lists, modes, a11y — all present except staff Quick Actions (only "My Queue", contract wants a bar). Added "Search Tickets" (`/staff/queue`) + asserted both hrefs; documented the deliberate deviation in ui-spec §3.2 (no Create Ticket: creation is requester-only, a staff button would 403). 6/6 green, client build clean, pushed to PR #54.

### 21. Staff Dashboard polish (no-commit mode)
**Prompts (TH):**
> *"หลังจากนี้ยังไม่ต้อง commit ... ในหน้า Staff Dashboard: ปุ่ม refresh ให้มีไอคอน, card ให้ข้อความสถานะอยู่มุมบนซ้ายตัวหนาสีเทาเข้ม ตัวเลขสีเขียวเข้มเข้า theme ตัวหนาอยู่ตรงกลาง, 3 card ล่างกึ่งกลางไม่ชิดซ้าย"*

**What the agent did (all local, NOT committed per order):**
Added a stroke-based refresh SVG (aria-hidden) to the Refresh button; restyled staff cards (label top-left `fw-bold #374151`, value centered `fw-bold var(--zen-primary)`); added `justify-content-center` to the card row (full rows unaffected, leftover columns centered on all breakpoints). Fixed the test's link-name regexes for the new label-first order ("New 2"). 6/6 green.

### 22. Ticket workflow hardening (Issue #55) — TDD implementation
**Prompt (TH):**
> *"เพื่อน merge แล้ว ทำ Ticket workflow ต่อไปได้เลย"*

**What the agent did:**
Merged PR #54, closed #53, created Issue #55 + branch. TDD: `ticket-workflow.api.test.ts` (WF-01..07) → 4 red on the new behaviors. Replaced both status routes with one shared handler enforcing matrix (now `400 INVALID_TRANSITION`) → concurrency (`409 STALE_UPDATE`, `clientUpdatedAt` required) → resolution gate (`400 RESOLUTION_GATE_VIOLATION`) in contract order; updated 2 Lab 3 code assertions + added `clientUpdatedAt` to DETAIL-04/05 with a justification comment. Staff detail: matrix-filtered dropdown, gate warning blocking RESOLVED pre-round-trip, `clientUpdatedAt` on save, 409 banner + Refresh; fixed the Lab 3 UI test to an allowed target and added the missing `updatedAt` fixture. Flipped ui-spec §3.3 from planned to implemented. Full suite 41 files/211 tests green (first run failed only on a dead Docker daemon — restarted, clean re-run); re-seeded.

---

## My Reflection (draft — to expand at release)

- **Strengths:** contract-driven workflow (spec → tests → code) caught scope questions early;asa single shared GitHub numbering made branch→issue→PR mapping unambiguous once recorded.
- **Weaknesses:** plan's hardcoded issue numbers (#46–#51) drifted on first contact with reality (#45/#46); future plans should reference logical IDs (e.g. `LAB4-01`) plus a note that GitHub numbers are assigned at creation time.
- **Collaboration experience:** TBD after implementation + peer-review rounds.
