# Lab 4 Peer Review

> Updated continuously as reviews happen.
> Standing rule (owner instruction 2026-09-22): this file stays **local-only** — NEVER commit/push until the owner explicitly orders it.

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
| https://github.com/ssiriwan/toktickit/pull/54 | #53 (plan: #51) | Role dashboards UI (Issue #53) | Open — awaiting @thhanabun review |

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
  - **PR #50 (Actions Taken UI):** round 1 by @thhanabun (2026-09-25) — Passed (staff modal + debounce + error mapping + quick actions, requester read-only, additive wiring, badges, states/a11y).
    - Non-blocking 1 (status dropdown lists all 4 when editing): edit mode now filters to lifecycle-allowed targets (server still enforces); create keeps all 4. Covered by new UI-01b.
    - Non-blocking 2 (datetime churn on seconds): PATCH omits `actionDateTime` when the minute value is unchanged. Covered by UI-01b (asserts key absent).
    - Status: both fixed in `9064cca`, replied on PR — awaiting verdict.
  - **PR #48 (Actions Taken foundation):** round 1 by @thhanabun (2026-09-25) — Passed (migration matches spec §7, pure validators + UNIT-02, 4 endpoints match api-spec, ACT-01..12, idempotent seed incl. CANCELLED, .gitattributes + vitest include).
    - Blocking 1 (no lifecycle guard): enforced `ACTION_TRANSITIONS` matrix in `62fb5b4` — off-lifecycle → 400 `details:[{field:status}]`; added ACT-13 + unit cases; api-spec PATCH documents matrix.
    - Blocking 2 (drift proof): root cause = `f29876d` comment-only edit of applied migration (DB checksum `72d20a43…` == `36807a4` bytes); repaired 1 checksum metadata row; `migrate status` → "up to date" (4/4). Proof pasted on PR.
    - Nits: explicit `result:""` clear while COMPLETED → 400 (ACT-14); datetime rejects numbers/booleans (+ unit cases); requireAuth already 403s inactive callers (`auth-middleware.ts:63-70`) — confirmed, no change.

## Pull Requests I Reviewed (partner repo: thhanabun/Software_Eng_Lab)

| PR | Title | Verdict |
| --- | --- | --- |
| _none yet_ | | |

> Numbering note: the implementation plan labels Lab 4 work #46–#52 (7 issues after splitting dashboards into API #50 + UI #51), but GitHub Issues and PRs share one numbering sequence, so actual numbers drift (first issue = #45, first PR = #46). The "Issue" column above shows the real GitHub number with the plan number in parentheses.
