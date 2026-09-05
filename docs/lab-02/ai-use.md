# AI Use and Reflection

I used two AI coding agents for TokTickIT Lab 2:

- **opencode** (model: big-pickle) for all Lab 2 work — specification, test plan, UI/API specs, and implementation of Issues 2–8 (database, requester context, ticket creation, my tickets, detail + attachments, theme, E2E).
- I reviewed every generated file, migration, seed, test, and commit before accepting it.

## Lab 2 — Specification Documents (opencode) — Session 1

### 1. Review PDF labsheet

**Prompt:** `review [PDF 1] ว่าต้องทำไรบ้าง`

**Reflection:** The model could not read PDF directly, but I worked around it with PyPDF2 via Python to extract the full 22-page labsheet. This showed me I can solve tool limits with available libraries.

### 2. Start with spec doc

**Prompt:** `เริ่มทำส่วนแรกก่อน Spec doc`

**Reflection:** The agent asked about project structure first, then produced `specification.md` with all 11 required sections. Starting with the spec before code was the right call.

### 3. Write all 3 docs at once

**Prompt:** `ทำ 3 ไฟล์เลย์`

**Reflection:** Writing `tests.md`, `ui-spec.md`, and `api-spec.md` in parallel saved time. The agent read `docs/lab-01` to match the format, so the output was consistent.

### 4. Save AI prompts

**Prompt:** `บันทึก AI prompt ให้ด้วย`

**Reflection:** The agent followed the `docs/lab-01/ai_use.md` format and logged the prompts with reflections. I kept the file as evidence for the course.

### 5. Save AI prompts and create Issues

**Prompt:** `บันทึก AI prompt ให้ด้วยสิ จากนั้นพาเราสร้าง Issue หน่อย ว่าทำยังไง`

**Reflection:** The agent explained GitHub Issues as the sprint backlog and created the first Issue with us, so I understood the workflow before coding.

## Lab 2 — Issue 2 Database Schema and Seed (opencode) — Session 2

### 1. Merge confirmed

**Prompt:** `Issue 1 ถูก merge แล้ว`

**Reflection:** The agent verified the merge with `gh pr view` and `git fetch` before starting the next Issue. Checking real git state saved us from building on a stale branch.

### 2. Check branch health

**Prompt:** `ตรวจสอบสถานะ branch ก่อน ตอนนี้เป็นไงอ่ะ`

**Reflection:** The agent showed per-branch status and the leftover `reviewer.md` edit from another terminal. Seeing the uncommitted change made the stash decision clear.

### 3. Align with reviewer

**Prompt:** `feature/1-spec-docs merge เข้าอะไร`

**Reflection:** The agent proved the merge was only the placeholder `reviewer.md`, not the real review — so we didn't assume it was done.

### 4. Skip reviewer first

**Prompt:** `เรื่อง reviewer.md ค่อยทำตอน feature ที่ 2 ข้ามอันนี้ไปก่อน ขอดูก่อนว่า workflow มันถูกต้องมั้ย`

**Reflection:** I asked to validate the workflow first. The agent compared labsheet §10.1 with what we actually did and confirmed it was correct.

### 5. Start Issue 2

**Prompt:** `เริ่ม Issue 2 เลย`

**Reflection:** Clean pipeline: `Issue #12 → feature/2-db-schema → schema + migration + seed → seed tests → npm test 14 passed → PR #13`. Stashing the leftover `reviewer.md` kept the branch clean.

### 6. Preview website request

**Prompt:** `ต้องมี test หน้าเว็บไรมั้ย เราอยากดูว่าเว็บจะออกมาเป็นไงอ่ะ`

**Reflection:** The agent answered from `tests.md` (UI-SELECT-01..04) and offered to run the dev server. I chose to wait for approval, so we didn't start the next Issue early.

### 7. Persist session log

**Prompt:** `ถ้ามีการเก็บ log หรือ prompt หรือข้อมูลเอาไว้ให้ AI อ่านก็ดี แบบ ตอนที่เราเปิด AI ขึ้นมาใหม่จะได้ไม่ต้องเริ่มใหม่ แต่ว่าอ่านจากที่เคยคุยกันไว้`

**Reflection:** I asked for a handoff log. The agent created `AGENTS.md` at the repo root (auto-loaded by opencode) + a pointer at the workspace root.

## Lab 2 — Issue 3 Requester Context and Dev Selection (opencode) — Session 3

### 1. Ask Issue 3 scope

**Prompt:** `Issue 3 ทำไรอ่ะ ยังไม่ต้องทำนะ รอเพื่อน approve ก่อน อันนี้แค่สอบถามเฉย ๆ`

**Reflection:** The agent clarified Issue 3 is `RequesterUserContext` + Dev Selection UI + app shell. I chose to wait, so we stayed on one Issue at a time.

### 2. Friend review — wire AppShell

**Prompt:** `เพื่อนรีวิวมาแบบนี้ GET /api/requesters correctly filters ... Please wire AppShell ...`

**Reflection:** Friend cited their own spec line numbers (BR-06 is summary 150 in our spec, not persistence). I learned to separate repo-specific spec differences and fix only what improves our design (context wiring, relative /api, name asc).

### 3. Check localStorage

**Prompt:** `แล้วเรามี localStorage รึเปล่า` / `จำเป็นต้องมี localStorage มั้ย`

**Reflection:** Grep showed no `localStorage` in our codebase — only in `reviewer.md` describing the friend's repo. Per our `BR-03` (testing context, not auth) it is not required.

### 4. Explain context wiring

**Prompt:** `Wire AppShell ผ่าน context คืออะไร`

**Reflection:** The agent explained the dead code (AppShell used local `useState` while Context was unused) and why moving state into the provider lets future screens use `useRequester()`.

### 5. Fix as promised

**Prompt:** `ให้แก้ตามที่เราบอกเขาเลยว่าจะแก้อะไรบ้าง`

**Reflection:** Implemented the 3 agreed fixes (context wiring, `relative /api` + Vite proxy, `name asc`) and handled the Docker port `5434` conflict. `22 tests` passed, so the review was resolved.

## Lab 2 — Issue 4 Ticket Creation (API + Form) (opencode) — Session 4

### 1. Start Issue 4

**Prompt:** `เริ่มเลย เอาตาม workflow เป๊ะ ๆ เลยนะ`

**Reflection:** Created `Issue #16` and `feature/4-ticket-creation` from latest staging, read `api-spec §4` and `ui-spec §5.2`, and wrote failing `API-TICKET-01..10` + `UI-CREATE` tests first (TDD).

### 2. How to build/test

**Prompt:** `เพื่อนบอกให้เราลอง build test เองก่อนทำยังไงอ่ะ` / `ก็ยังไม่เข้าใจว่าคืออะไร งั้นลองเทสเลย`

**Reflection:** The agent explained `docker ps` + `npm test` + `npm run build`. Running the full suite (12 files, 37 passed, build clean) proved the warnings were not failures.

### 3. Friend review — 8 fixes

**Prompt:** `https://github.com/ssiriwan/toktickit/pull/17 เพื่อนเรา review ว่า Needs fix: server/src/app.ts:71 ...`

**Reflection:** Friend requested validation details, `TK` collision retry, `fetch ok` check, error placement, `*`, counters, success state, and `react-router-dom`. All 8 improved robustness and spec compliance, so I applied them.

### 4. Create-time attachments

**Prompt:** `ตอน create Ticket ให้ Upload ได้ด้วยสิ แค่ไปแก้ spec` / `ถ้างั้นเพิ่มตอน create ได้เลยก็ดี`

**Reflection:** I first reverted the upload-at-creation as out-of-scope, then updated `specification.md` to document “Create with Attachments” (sequential `POST /:id/attachments` after creation) before re-adding the file input. Now it is spec-before-code.

## Lab 2 — Issue 5 My Tickets (opencode) — Session 5

### 1. Friend review — 6 fixes

**Prompt:** `เพื่อน review ว่า Needs fix: server/src/app.ts:214 ...`

**Reflection:** The review covered header vs query, `pageSize`, double filtering, missing UI controls, and badge fields. Fixing `NaN/0 →400`, removing client summary-only filter, and rebuilding `MyTickets` as server-driven brought us to `52 tests` passed.

### 2. Do good fixes

**Prompt:** `ถ้าดีก็ทำเลยเพื่อน`

**Reflection:** The agent implemented the fixes and kept the query param + `X-Requester-Id` fallback for flexibility, which is a good compromise.

## Lab 2 — Issue 6 Ticket Detail and Attachments (opencode) — Session 6

### 1. Start Issue 6

**Prompt:** `พร้อมแล้ว เริ่มเลย`

**Reflection:** Created `Issue #20` and `feature/6-ticket-detail-attachments`, read `api-spec §6-9` and `ui-spec §5.4`, and added `multer` + `uuid` for the attachment lifecycle.

### 2. Remaining nits

**Prompt:** `Remaining nits: ...`

**Reflection:** The nits (orphan file, cwd-dependent `uploads` path, input reset, `Invalid ticket` a11y) were all valid. Extracting `uploadsDir` to `server/src/uploads.ts` (fileURLToPath) and fixing the input reset prevents re-selecting the same bad file from being ignored.

## Lab 2 — Issue 7 Zen Green Theme Polish (opencode) — Session 7

### 1. Start Issue 7

**Prompt:** `เพื่อน merge ให้แล้ว` / `เริ่มเลย ช่วยดูให้ถูกตาม spec ที่เขียนไว้ด้วย`

**Reflection:** Checked `ui-spec §1-10` and `FR-22` before coding. Created `theme.css` with tokens (`#006B3C` header, `#F5F7F6` page) and a persistent `zen-header` with `NavLink`.

### 2. Remaining theme nits

**Prompt:** `Remaining nits: ... AppShell nav... badge-priority ...`

**Reflection:** The nits pointed out dead CSS (`.badge-priority-*` defined but not used) and missing `--zen-warning`/`--zen-success`. Wiring the classes and adding the tablet breakpoint completed the theme.

## Lab 2 — Issue 8 E2E and Release (opencode) — Session 8

### 1. Add E2E

**Prompt:** `เริ่มเลย ช่วยดูให้ถูกตาม spec ที่เขียนไว้ด้วย` (Issue 8)

**Reflection:** Added `e2e/lab-02/requester-ticket-flow.spec.ts` with Playwright (4 flows) and `playwright.config.ts` with two `webServer` entries (Windows-safe, no `&`). Kept the `supertest` integration at `tests/...integration.test.ts` for API coverage.

## Reflection

Using AI was helpful for turning the Lab 2 requirements into a clean project foundation and then the full vertical slice. The most important part was giving clear constraints, especially “do not implement features beyond Issue X” and “review issue N to me and implement the issue N”. These kept each Issue self-contained on its own branch so it could be peer-reviewed separately.

I learned to control the workflow explicitly: review first, implement, then commit and push as separate steps so I could inspect each diff. I also learned to always verify the result — acceptance criteria tables and real test output — instead of trusting the agent's summary alone.

For Issue 3, the peer review taught me to distinguish repo-specific spec differences and to fix only what improves our design. For Issue 4, TDD with failing tests first caught validation gaps early. For Issue 5, fixing server validation and rebuilding `MyTickets` as server-driven brought us to `52 tests` passed. For Issue 6, extracting `uploadsDir` and fixing input reset prevented subtle bugs. For Issue 7, wiring the theme tokens and adding the style test completed the visual checklist.

Going forward, I will keep `ai-use.md` updated after every conversation and keep `AGENTS.md` as the handoff log so any new session resumes without re-explaining.
