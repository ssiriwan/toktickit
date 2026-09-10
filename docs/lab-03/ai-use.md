# AI Use and Reflection — Lab 3

I used **opencode** (model: Muse Spark) for TokTickIT Lab 3 — from labsheet review and implementation planning through Spec DD, Test DD, and phased implementation (auth, requester regression, staff queue/detail, admin, E2E, release). I reviewed every generated file, migration, seed, test, and commit before accepting it.

## Lab 3 — Planning — Session 1

### 1. Review PDF labsheet

**Prompt:** `review [PDF 1] ว่าเราต้องทำอะไรบ้าง`

**Reflection:** The agent summarized the 18-page Lab 3 handout into product increments, roles, BR/AC, DB/API/UI scope, and the 9-part PDF submission. Starting from a shared understanding of the 60-point rubric kept later phases aligned.

### 2. Full implementation plan

**Prompt:** `ลองเขียน Implementation Plan ตลอดทั้ง Lab นี้มาให้เราอ่านหน่อย`

**Reflection:** The agent inspected the real repo state (schema, app.ts, vitest configs, main branch) before planning, so the 9-issue plan with branch names and file paths matched reality instead of being generic advice.

### 3. Evaluate 9 suggestions

**Prompt:** `ลองตรวจสอบข้อเสนอแนะเหล่านี้แล้วดูว่าอันไหนที่ควรพิจารณาตามบ้าง`

**Reflection:** The agent checked each suggestion against the labsheet and codebase and adopted 9/9 with reasons (2 active Admins for self vs last-admin tests, inactive anti-enumeration split, mustChange allowlist, Admin read-only tickets, exact test paths). Evidence-based verdicts beat gut feeling.

### 4. Save plan to file

**Prompt:** `เขียน implementation plan.md ใส่ C:\Users\HP\Desktop\Uni code\CPE334\plan`

**Reflection:** The plan became a versioned reference outside the repo. Writing decisions down before coding is the core of Spec DD.

## Lab 3 — Phase 1 Spec Contract — Session 2

### 5. Start Phase 1

**Prompt:** `เริ่มทำตาม phase 1 implementation plan ได้เลย`

**Reflection:** The agent created `lab3-staging` from clean `main` (stashing Lab 2 screenshot leftovers first), branched `feature/32-spec-contract`, and wrote `specification.md`, `api-spec.md`, `ui-spec.md` with consistent decisions (JWT httpOnly, Admin read-only, appearsResolved flag).

### 6. Fix spec inconsistencies

**Prompt:** `แก้ spec คือ` → `แก้ทุกจุดเลยค่ะ`

**Reflection:** The agent re-read the spec and found FR-11 contradicting the authorization matrix (Admin POST vs read-only) plus a queue-search typo. Self-review before commit catches contract bugs that would multiply into code.

### 7. Commit and open PR

**Prompt:** `commit แล้วเปิด PR ให้เพื่อนเราเลย`

**Reflection:** The agent committed, pushed, opened PR #32 into `lab3-staging`, and tagged the reviewer. Keeping the peer-review loop per Issue matches the course workflow.

### 8. Address PR #32 review (8 points)

**Prompt:** `เพื่อนเม้นมา Needs fix: ...` (resolutionSummary scope creep, brand typo, admin Email column, seed table, queue search/sort/filters, tests.md phasing, login-attempt + CSRF BRs)

**Reflection:** All 8 points were valid spec gaps. The fixes (removing scope creep, adding BR-21/22, seed credential table) made the contract internally consistent before any implementation PR.

## Lab 3 — Phase 2 Test Plan — Session 3

### 9. Write tests.md then fix review

**Prompt:** `เริ่ม phase 2 เลย` → `เพื่อนรีวิวมา Needs fix: ...` (non-English text, missing UI-07/UI-08/VIS-01, split unit/style files)

**Reflection:** The test plan mapped AC-01..18 to 50+ rows with exact labsheet paths. During fixes the disk filled to 100% and truncated the file — the agent freed space via `npm cache clean`, restored from git, and re-applied. Tracked beats untracked: committed work survives incidents.

## My Reflection

Using the agent as a **specification agent** (planning, matrices, traceability) forced me to decide auth mechanism, role separation, and transition rules up front, so implementation phases had no ambiguity. As a **coding agent** (migration SQL backfill, auth middleware, seed, TDD tests) it was fastest when the contract already fixed shapes and codes — I only had to verify diffs, test output, and reviewer comments. Peer review by Thanabun caught what generation missed (typos, missing columns, scope creep). I will keep this file updated with each new prompt.

> Log continues below as new sessions happen.
