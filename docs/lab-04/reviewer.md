# Lab 4 Peer Review

> Evidence for report Part 1. Review record complete through Lab 4 release.

## My Reviewer (reviews my Pull Requests)

- Name: Thanabun Tikaew
- Student ID: 67070501021
- GitHub username: thhanabun
- Repo (mine): `ssiriwan/toktickit` — base branch for Lab 4: `lab4-staging`

### My Pull Requests Reviewed (repo: ssiriwan/toktickit)

| PR | Issue | Title | Status |
| --- | --- | --- | --- |
| https://github.com/ssiriwan/toktickit/pull/46 | #45 (plan: #46) | Sprint 4 Contract & Test Plan (Issue #45) | MERGED into `lab4-staging` (`ea9bd51`, 2026-09-25) — 2 review rounds, all valid points fixed |
| https://github.com/ssiriwan/toktickit/pull/48 | #47 (plan: #47) | Actions Taken foundation (Issue #47) | MERGED into `lab4-staging` (`85e14d2`, 2026-09-25) — round 1 (2 blocking + 3 nits) all fixed in `62fb5b4` |
| https://github.com/ssiriwan/toktickit/pull/50 | #49 (plan: #48) | Actions Taken UI in Ticket Detail (Issue #49) | MERGED into `lab4-staging` (`9be9e1e`, 2026-09-25) — round 1 (Passed + 2 non-blocking) both fixed in `9064cca` |
| https://github.com/ssiriwan/toktickit/pull/52 | #51 (plan: #50) | Role dashboards API (Issue #51) | MERGED into `lab4-staging` (`9a9e798`, 2026-09-26) — no review comments; passed first round |
| https://github.com/ssiriwan/toktickit/pull/54 | #53 (plan: #51) | Role dashboards UI (Issue #53) | MERGED into `lab4-staging` (`37580ee`, 2026-09-29) — round 1 (3 non-blockings: NavLink end fixed, evidence WIP acknowledged) |
| https://github.com/ssiriwan/toktickit/pull/56 | #55 (plan: #49) | Ticket workflow hardening and resolution gate (Issue #55) | MERGED into `lab4-staging` (`06330e2`, 2026-09-29) — round 1 (1 blocking: stale gate) fixed via `onChanged` + UI-06c |
| https://github.com/ssiriwan/toktickit/pull/58 | #57 (plan: #52) | Final hardening, regression, screenshots, release prep (Issue #57) | MERGED into `lab4-staging` (`9654f8a`, 2026-09-29) — round 1 (Passed + E2E race + performer race, both fixed) + round 2 (traceability rows + UI-07 file + smoke-level note) |

### Reviews Received — Details

- **PR #46 (Spec contract):** round 1 comments by @thhanabun (2026-09-24, no formal approve/request-changes yet).
  - Passed: 11 sections per §9 complete; BR-01/02 + 7 exclusions + 7 action fields + matrix/gate/concurrency + 3-role authz; 2 DB justifications; additive migration + backup + seed; api-spec paths/shapes/validation/authz/errors + order matrix→concurrency→gate; tests.md genuinely pre-implementation (Final=Planned), AC-01..20 covered.
  - Issue 1: Requester Dashboard cards mismatch in 3 places — FR-14/API (`totalOpen/waitingForRequester/recentlyUpdated/recentlyResolved`) vs ui-spec §3.1 (My Open/In Progress/Resolved/Closed). Must sync before implementation.
  - Issue 2: tests.md missing §10-mandated types — no unit rows, no UI style test, no performance-smoke; strategy skips them.
  - Issue 3: missing `e2e/lab-04/ticket-resolution.spec.ts` (§12 lists 3 files, only 2 present) — or state explicitly that resolution is folded into E2E-01.
  - Issue 4: no BR for `recentlyResolved`/`closed` (BR-19..21 only); api-spec defers with "(+CLOSED if resolved within window — fixed in implementation PR)". Lock definition before merge.
  - Nits: staff dashboard "5 cards" lists 6 + no `unassignedCount` card; "7 days" lacks timezone/boundary + dashboard empty behavior undocumented; `actionDateTime` validation (invalid ISO? future dates?) has no BR.
  - Status: fixes pushed in `217ca1f` (5 requester cards 1:1, 7 staff cards 1:1, BR-26..29, UNIT-01/02 + UI-07 + PERF-01 + E2E-03, deferral removed) + re-review requested via PR comment — awaiting round 2 verdict.
  - Round 2 (2026-09-25): Passed checklist re-confirmed + BR-26..29 acknowledged, but blocking issues 1–3 and the staff-count nit describe the PRE-fix snapshot — verified the PR already serves fixed content (`git show origin/feature/45-spec-contract`). 2 valid points fixed: `actionDateTime` added to api-spec §5 `details` list, ACT-12 API row for BR-29 added. Replied on PR quoting current lines — awaiting confirmation.
  - Round 2 follow-up (non-blocking, valid): duplicate coverage-checklist line (`tests.md:63` repeated `:62` tail, leftover from UI-07 insert) — deleted, pushed. Acknowledged on PR.

- **PR #48 (Actions Taken foundation):** round 1 by @thhanabun (2026-09-25) — Passed (migration matches spec §7, pure validators + UNIT-02, 4 endpoints match api-spec, ACT-01..12, idempotent seed incl. CANCELLED, .gitattributes + vitest include).
  - Blocking 1 (no lifecycle guard): enforced `ACTION_TRANSITIONS` matrix in `62fb5b4` — off-lifecycle → 400 `details:[{field:status}]`; added ACT-13 + unit cases; api-spec PATCH documents matrix.
  - Blocking 2 (drift proof): root cause = `f29876d` comment-only edit of applied migration (DB checksum `72d20a43…` == `36807a4` bytes); repaired 1 checksum metadata row; `migrate status` → "up to date" (4/4). Proof pasted on PR.
  - Nits: explicit `result:""` clear while COMPLETED → 400 (ACT-14); datetime rejects numbers/booleans (+ unit cases); requireAuth already 403s inactive callers (`auth-middleware.ts:63-70`) — confirmed, no change.

- **PR #50 (Actions Taken UI):** round 1 by @thhanabun (2026-09-25) — Passed (staff modal + debounce + error mapping + quick actions, requester read-only, additive wiring, badges, states/a11y).
  - Non-blocking 1 (status dropdown lists all 4 when editing): edit mode now filters to lifecycle-allowed targets (server still enforces); create keeps all 4. Covered by new UI-01b.
  - Non-blocking 2 (datetime churn on seconds): PATCH omits `actionDateTime` when the minute value is unchanged. Covered by UI-01b (asserts key absent).
  - Status: both fixed in `9064cca`, replied on PR — approved and merged.

- **PR #52 (Role dashboards API):** no review comments — passed first round, merged as-is.

- **PR #54 (Role dashboards UI):** round 1 by @thhanabun (2026-09-29) — 3 non-blockings, no blocking.
  - Non-blocking 1 (Dashboard `NavLink to="/"` lacks `end`, renders active on every route): one-prop fix in `d5c0417`.
  - Non-blocking 2 (reviewer.md hierarchy: PR #48/#50 detail bullets nested under PR #46): acknowledged; restructured to top-level bullets before release.
  - Non-blocking 3 (ai-use.md needs release curation: 21 prompts → 6–10, draft TBD, typo, stale local-only note): acknowledged; curated to 10 selected prompts with finished reflection before release.

- **PR #56 (Ticket workflow hardening):** round 1 by @thhanabun (2026-09-29) — Passed (shared handler order matrix → 409 → gate, identical client/server matrices, UI-05/06/06b, WF-01..07, honest legacy maintenance).
  - Blocking 1 (stale gate input after child action mutations): wired `onChanged` refresh from `ActionsTakenList` + new UI-06c pinning warn → create COMPLETED → RESOLVED-sends-PATCH. Fixed, re-reviewed, merged.

- **PR #58 (Final hardening, regression, screenshots, release prep):** round 1 by @thhanabun (2026-09-29) — Passed (E2E-01 lifecycle through Edit, E2E-03 off-matrix respected + gate asserted mid-flow, E2E-02 drill-downs land filtered with rows, deterministic setup/teardown, 15 PNGs match §12 paths, gate live-check + performer backfill, tests.md all Pass).
  - Blocking (round 1 was green except): E2E-only performer-default race + gate-refresh race found during the run — fixed via backfill effect + awaited `onChanged` + live gate recheck; E2E 8/8 on re-run.
  - Round 2: non-blocking traceability (UI-01b/01c/06b/06c lacked matrix rows) — added 4 rows; missing UI-07 style test created (the table had pointed at a nonexistent file); UI-07 explicitly marked smoke-level so the report never oversells it. Approved.

## Pull Requests I Reviewed (partner repo: thhanabun/Software_Eng_Lab)

| PR | Issue | Title | Verdict |
| --- | --- | --- | --- |
| https://github.com/thhanabun/Software_Eng_Lab/pull/59 | #51 | Lab 4 Sprint Specification and Test Plan (Spec DD) | Approved — no blockers; 8 follow-ups, all addressed in `043ff6f`, re-verified |
| https://github.com/thhanabun/Software_Eng_Lab/pull/60 | #52 | Lab 4 Actions Taken Foundation (Model, Migration, Seed, APIs) | Request-changes (envelope mismatch) → fixed in `27165b1` → 1 nit (BR-07 sync) → fixed in `4b3e0de` → Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/61 | #53 | Lab 4 Actions Taken UI (Ticket Detail Section) | Approved + 7 nits → 6 fixed in `c7ad364` (+`--tg-warning` check residual) → Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/62 | #54 | Lab 4 Ticket Workflow (Resolution Gate, Transitions, Concurrency) | Request-changes (claim path had no stamp) → fixed in `c130988` (+4 notes) → Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/63 | #55 | Lab 4 Dashboards API (Requester + Staff Metrics) | Request-changes (metric drill-downs incomplete per BR-16) → fixed in `bdc7917` (+4 notes) → Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/64 | #56 | Lab 4 Dashboards UI (Requester + Staff Pages) | Request-changes (`recentResolved` dropped, unused import, stale BR-16 example) → fixed in `79baa22` → Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/65 | #57 | Lab 4 E2E Tests, Hardening and Visual Evidence | Request-changes (E2E-06 missing edit step, stale-base question, `ticketUpdatedAt` unasserted) → fixed in `fef305d` → Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/66 | #58 | Final Lab 4 Docs and Release Integration | Conditional approve (6 pre-merge checks) → fixed in `cce2984` → Approved |

### Reviews Given — Details

- **PR #59 (Spec contract):** Approved, no blockers. Spec complete across §9 (FR-01..13 / BR-01..18 / AC-01..11 / AD-01..06), traceability full. 8 non-blocking follow-ups: requester `GET /api/tickets/:id/actions` split, DELETE single 405 behavior, BR-03 UTC/Bangkok wording, missing PERF-01 + MIG-03, concurrent-create semantics, PATCH flip-clear rule, seed-on-terminal clarification, ai-use prompt count (deferred to #58). All fixed in `043ff6f`; re-verified clean. Residual nits accepted as-is: 403-vs-404 split kept with rationale (403 = wrong path, 404 = no leakage), commit-msg typo ignored.
- **PR #60 (Actions foundation):** 1 blocking change — response shape violated api-spec §1 (bare arrays + flat `performedByName`/`performedByRole` instead of `{ items }` + nested `performedBy:{id,name}`); would have forced UI rework in #53. Fixed via shared `serializeAction` in `27165b1` + extra contract tests (both-win, spoof-ignore, BR-02 cross-staff, 404/400 stamps, real actionId, `METHOD_NOT_ALLOWED`, requester-DELETE=403 matrix fix). 1 residual nit (BR-07 `404/405` wording) fixed in `4b3e0de`. Residual nits left open (no fix): `MIG-03` lives in the workflow test file instead of its own, `PERF-01` asserts latency only without a payload-bound assertion. Approved.
- **PR #61 (Actions UI):** Approved + 7 nits: missing STYLE-03 assertions, `--tg-warning` token existence unverified, conflict reload didn't refetch actions list, cancel left 409 banner stuck, counters lacked `aria-describedby`, section placement vs ui-spec §3.2, heading emoji consistency. 6 fixed in `c7ad364` (STYLE-03 test, refetch+null-guard, banner clear, counter wiring, ui-spec placement lock with symmetry rationale); `--tg-warning` left as residual check. Approved.
- **PR #62 (Workflow):** 1 blocking-adjacent fix — `claimTicket` carried no stamp while assign/priority/status did, leaving the classic two-staff claim race unprotected despite "stamps on all ops" claim. Fixed in `c130988` (optional stamp through claim + `updatedAt` on all claim/assign branches incl. no-ops + claim-race test). Notes: BR-11 best-effort wording, RREG-02 deliberate Lab 3 walk-test exception recorded, WF-05 rescoped to API. Gate-before-stamp order (400 gate before 409 on simultaneous violations) confirmed as documented intent. Approved.
- **PR #63 (Dashboards API):** 1 blocking fix — BR-16 violated: requester metrics had zero drill-downs, staff `byStatus`/`byItPriority` lacked per-key links (would have forced #56 to hardcode queries). Fixed in `bdc7917` + api-spec sync. Notes: resolved30d boundary test, `ownedByMe` DB cross-check, role-before-freshness 403-precedence test + doc, unassigned-includes-terminal documented. Approved.
- **PR #64 (Dashboards UI):** 3 fixes requested: `recentResolved` fetched but never rendered (FR-09/Part 8 gap), unused `ApiRequestError` import (tsc `noUnusedLocals` build risk), stale `?ownerId=` example in spec BR-16. All fixed in `79baa22` (resolved section + empty state, imports removed + build green, BR-16 with `useSearchParams` line cites) + aria-labels, loading skeleton, forbidden/breakdown-href tests (76/76). Approved.
- **PR #65 (E2E):** 3 fixes requested: E2E-06 title/tests.md promised an edit step the body never performed; suite-count discrepancy (125/126 vs 134/135) suggested a stale base; new `ticketUpdatedAt` field had no API assertions. Fixed in `fef305d` (edit round-trip, merge-base verified current + reporting error admitted with real 134/135, create+edit stamp assertions, PATCH doc). Residual nits deferred to #58 (closed in #66): actions screenshot spec grabs the first "Open" link (seed-dependent, pin if flaky), §4 visual checklist ticked during release. Approved.
- **PR #66 (Release):** Conditional approve with 6 pre-merge checks: unchecked §4 visual checklist, stale `What It Tests` text, artifacts-vs-evidence duplication story, `blob/main` links dead until release PR merges (order: #66 → release → PDF), `.gitignore` claim without diff, unverified `#b54708` fallback reference. All fixed in `cce2984` (checklist checked, descriptions synced, duplication story stated in both files, check-ignore verification noted, fallback wording corrected). Approved with merge-order reminder.

> Numbering note: the implementation plan labels Lab 4 work #46–#52 (7 issues after splitting dashboards into API #50 + UI #51), but GitHub Issues and PRs share one numbering sequence, so actual numbers drift (first issue = #45, first PR = #46). The "Issue" column above shows the real GitHub number with the plan number in parentheses.
