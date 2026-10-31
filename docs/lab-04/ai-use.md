# AI Use and Reflection — Lab 4

> Evidence for report Part 4 (labsheet §10: 6–10 selected prompts + reflection).
> Curated from the 22-prompt running log kept during the sprint.
> Agent: opencode. Model: Muse Spark (Meta).

---

## Selected Key Prompts (10)

### 1. Review the implementation plan and start the first issue
**Prompt:**
> *"Review the file plan/implementation plan lab4.md, tell me everything it requires, and start the first issue right away."*

**What the agent did:**
Read the 534-line plan plus `toktickit/AGENTS.md`, verified the repo baseline (`main @1d8a8be` = Lab 3 release, 30 files / 163 tests green, no `lab4-staging` yet), stashed an unrelated dirty note, created GitHub Issue #45 (the plan says #46 — Issues and PRs share one numbering sequence, so real numbers drift), created `lab4-staging` + `feature/45-spec-contract`, and authored the four contract docs (`specification`, `api-spec`, `ui-spec`, `tests` with FR-01..16, BR-01..25, matrices, gate, AC-01..20) before any code.

**Reflection:**
Spec-first keeps every later PR honest — code can be judged against the contract instead of opinions. Verifying the git baseline first avoided branching from a dirty tree, and recording the plan-number → real-number mapping in the PR body preserved traceability for the report.

### 2. Fix the full spec review round and align all four contract files
**Prompt:**
> *"Fix all 4 issues plus the 3 nits now — make everything correct and consistent."*

**What the agent did:**
Locked every ambiguous definition the reviewer flagged and synced all four files: requester = 5 cards 1:1 with API metrics (dropping the phantom "In Progress" card), staff = 7 cards 1:1, new BR-26 (`recentlyResolved`), BR-27 (`closed`, all-time), BR-28 (7-day server-UTC window + zeroed empty behavior), BR-29 (`actionDateTime` rules), plus UNIT-01/02, UI-07, PERF-01, and E2E-03 rows; removed the "fixed in implementation PR" deferral.

**Reflection:**
Reviewing before any code exists is when inconsistencies are cheapest — the dashboard mismatch would otherwise have propagated into API, UI, and tests simultaneously. Locking derived-metric definitions up front stopped three future authors from inventing three window semantics.

### 3. Build the Actions Taken foundation with TDD, including migration forensics
**Prompt:**
> *"Proceed with the plan. Also, do we need to start Docker?"*

**What the agent did:**
Started Docker Desktop, backed up the volume, kept every branch, and created Issue #47. Wrote `actions-taken.api.test.ts` first (12/12 red), then hit a migration-drift wall: the applied Lab 3 migration's checksum no longer matched. Proved via sha256-per-version vs `_prisma_migrations` that the drift was a comment-only post-apply edit — repaired with a 1-row metadata update instead of a destructive reset, locked `eol=lf` in `.gitattributes`, and shipped schema + migration + pure validators + 4 endpoints + idempotent seeds. Full suite green.

**Reflection:**
Checksum forensics turned a scary "reset or lose data" ultimatum into a one-row repair — always compare bytes before reaching for destructive commands.

### 4. Verify compliance against the stricter document, not just the labsheet
**Prompt:**
> *"Verify whether this matches the labsheet and the spec — is anything missing?"*

**What the agent did:**
Read `SE+Lab+4.pdf` via PyPDF2 and checked §4.1/§4.3/§4.4/§5.1–5.3/§12 against the branch. Everything passed except one gap our own spec caught: §7 promises 8-status seed coverage but the seed had 7 (no CANCELLED — the labsheet only demands "major" statuses, our contract is stricter). Added the CANCELLED ticket; re-seeded duplicate-free.

**Reflection:**
The contract we wrote is the real bar, and it briefly convicted its own seed data. Checking the stricter document is what caught it.

### 5. Build the Actions Taken UI without breaking legacy suites
**Prompt:**
> *"Continue with the Actions Taken UI plan, and keep it aligned with the spec and the labsheet."*

**What the agent did:**
Verified labsheet §8.3, then TDD (`ActionsTaken.test.tsx` → red on missing module) and built `ActionsTakenList.tsx` (role-scoped fetch, validating modal form, debounce, server-errors-to-fields mapping, Edit / Mark-completed / Cancel-action) wired into both detail pages. The highest-value line was an `Array.isArray` guard: without it, every legacy detail test whose fetch stub answers a ticket object for the new actions URL would have thrown on `.map`.

**Reflection:**
Defensive parsing at trust boundaries beats updating a dozen old stubs — the guard protected all legacy suites with one line.

### 6. Split the dashboards work into API-first, then UI
**Prompt:**
> *"Does the Role dashboards step do UI and API together at once? … Option 2 is better — update the plan."*

**What the agent did:**
Confirmed the plan bundled them, recommended the API-first split (same rhythm as actions: lock the math before building on it — UTC windows, 8 statuses, role isolation deserve freezing first), and amended the plan from 6 to 7 issues (dashboards API #50, dashboards UI #51, final #52) including the mermaid graph and the Part-1 Kanban range.

**Reflection:**
Small plan edits compound: one split decision shaped the next three issues' review sizes and kept every UI PR building on frozen APIs.

### 7. Ship the dashboards UI while keeping every legacy test green
**Prompt:**
> *"Continue with the dashboard UI."*

**What the agent did:**
Built both dashboards (cards 1:1 with API metrics, drill-down hrefs, admin strip, Refresh) plus validated URL-filter init in both list pages — catching two legacy breaks before pushing: `useSearchParams` needs a Router (Lab 2 tests render bare), so the init reads `window.location.search` instead; and app-shell tests asserted the replaced home text, so two assertions plus dashboard stubs were updated with a contract-justification comment.

**Reflection:**
Replacing a placeholder home looks trivial until the regression suite disagrees — the suite forced an explicit, documented decision instead of a silent break.

### 8. Harden the ticket workflow end to end (matrix, gate, concurrency, UI)
**Prompt:**
> *"They merged. Continue with the Ticket workflow."*

**What the agent did:**
Replaced both status routes with one shared handler enforcing matrix (`400 INVALID_TRANSITION`) → concurrency (`409 STALE_UPDATE`, `clientUpdatedAt` required) → resolution gate (`400 RESOLUTION_GATE_VIOLATION`), and rebuilt the staff status control (matrix-filtered dropdown, pre-round-trip gate warning, `clientUpdatedAt` on save, 409 banner + Refresh). Updated the affected Lab 3 assertions with justification comments and flipped ui-spec §3.3 from planned to implemented. Full suite 41 files / 211 tests green.

**Reflection:**
One shared handler killed a whole class of route-divergence bugs — the staff route and its legacy alias can never disagree again.

### 9. Take E2E and screenshots to green, fixing only real races
**Prompt:**
> *"Fix the screenshots."* (plus review follow-ups across the final issue)

**What the agent did:**
Wrote the lab-04 Playwright setup (seed-pinned accounts, E2E-action cleanup, ticket reset), three flow specs, and a screenshots spec — then fixed only genuine bugs the runs exposed: a performer-default race (backfill effect + UI-01c), an un-awaited `onChanged` gate refresh, and finally a live gate recheck in the status handler after the await proved insufficient. Retook screenshots with loaded-state waits (15 PNGs, 4 areas × 3 viewports). Final: E2E 8/8, `npm test` 41/213, both builds clean.

**Reflection:**
E2E caught what unit tests structurally cannot — the unit suite stubs instant responses, so timing races are invisible there. Different layers cover different bug classes; skipping E2E would have shipped two real bugs.

### 10. Triage reviews by evidence, and keep traceability honest
**Prompt:**
> *"They reviewed — go see what they said."* (recurring)

**What the agent did:**
For every round, pulled comments via `gh`, verified each claim against the actual PR head before touching code — which exposed a fully stale round-2 (reviewed against a pre-fix snapshot; replied with quoted lines instead of re-editing). Closed the loop on valid items the process caught: ACT-12/BR-29 row, lifecycle guard + ACT-13/14, UI-01b/01c/06b/06c rows, the missing UI-07 style test (created — the traceability table had pointed at a file that never existed), and an explicit smoke-level caveat on UI-07 so the report never oversells it.

**Reflection:**
"Verify the remote first" beats "trust the review text" — one `git show origin/...` check saved full re-edit cycles, and insisting that every cited test ID resolve to a real file keeps the traceability table an honest document instead of decoration.

---

## My Reflection

- **Strengths:** the contract-driven workflow (spec → tests → code) caught scope questions early; as a single shared GitHub numbering made branch→issue→PR mapping unambiguous once recorded; and a reviewer who cites file:line turns triage into a checklist.
- **Weaknesses:** the plan's hardcoded issue numbers (#46–#51) drifted on first contact with reality (#45/#46) — future plans should reference logical IDs (e.g. `LAB4-01`) and note that GitHub assigns numbers at creation time. I also corrupted two test files with bare-`});` edit anchors before learning to verify placement by re-reading.
- **Collaboration experience:** the AI specification agent was strongest at consistency enforcement across four contract files, and the AI coding agent at mechanical TDD implementation; both needed human judgment at ambiguity points (lifecycle strictness, card definitions, stale-review triage). The peer reviewer functioned as a second test suite — every blocking item pointed at a genuine spec violation or a real race, and not a single round was noise.
