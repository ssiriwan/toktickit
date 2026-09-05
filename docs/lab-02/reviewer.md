# Lab 2 Peer Review

## My Reviewer (reviewed my Pull Requests)

- Name: Thanabun Tikaew
- Student ID: 67070501021
- GitHub username: thhanabun

### My Pull Requests Reviewed (reviewer repo: ssiriwan/toktickit)

| PR | Issue | Title | Status |
| --- | --- | --- | --- |
| https://github.com/ssiriwan/toktickit/pull/11 | #10 | Lab 2: Sprint Specification and Test Plan | Approved |
| https://github.com/ssiriwan/toktickit/pull/15 | #14 | Lab 2 Issue 3: Requester Context and Dev Requester Selection | Approved — 3 fixes (context wiring, relative /api, name asc) |
| https://github.com/ssiriwan/toktickit/pull/17 | #16 | Lab 2 Issue 4: Ticket Creation (API + Form) | Approved — 8 fixes (validation, TK retry, fetch, UI polish) + creation-time attachments per updated spec |
| https://github.com/ssiriwan/toktickit/pull/19 | #18 | Lab 2 Issue 5: My Tickets (List, Search, Filter, Sort, Pagination) | Approved — 6 fixes (header/query, NaN/0, double filter, UI controls) |
| https://github.com/ssiriwan/toktickit/pull/21 | #20 | Lab 2 Issue 6: Ticket Detail and Attachments | Approved — 8 fixes (tests, a11y, fileFilter, uploads, detail fields) + follow-up nits |
| https://github.com/ssiriwan/toktickit/pull/23 | #22 | Lab 2 Issue 7: Zen Green Theme Polish | Approved — 6 fixes (NavLink, badges, readonly, tokens, responsive) |
| https://github.com/ssiriwan/toktickit/pull/25 | #24 | Lab 2 Issue 8: E2E Flows and Release Prep | Approved — 3 fixes (duplicate warning, debounce, Playwright) + 7-status revert per labsheet |
| https://github.com/ssiriwan/toktickit/pull/28 | #26 | Lab 2 Docs Finalization: ai-use, reviewer, AGENTS | Pending review |

### Reviews Received — Details

- **PR #15 (Issue 3):** Approved after 3 fixes — verified `GET /api/requesters` filters active, `500 INTERNAL_ERROR`, `AppShell` wired through context, `relative /api` with Vite proxy, `name asc`.
- **PR #17 (Issue 4):** Approved after 8 fixes — full `details` on priority+summary, `P2002` retry up to 5, `res.ok` before `json()`, error below field, `*`/`counters`/`aria-required`, success with `ticketNumber` + `View My Tickets`, `Cancel` reset, `react-router-dom`.
- **PR #19 (Issue 5):** Approved after addressing header vs query (`X-Requester-Id` fallback kept `?requesterId=`), `NaN/0 →400`, removed client summary-only double filter, added full filters/sort/pagination and `category/priority/date` fields.
- **PR #21 (Issue 6):** Approved after 8 fixes + 5 follow-up nits — added `API-ATT`/`UI-DETAIL` tests, `download` 403/410 handling, per-row `removeError`, `tabIndex`/`onKeyDown`, strict `mime` check, `server/uploads` via `fileURLToPath`, `requester/updatedAt` in detail.
- **PR #23 (Issue 7):** Approved after 6 theme nits — `NavLink`/`Link`, `badge-priority-*` wired, `required-star`/`zen-readonly`, missing `--zen-warning`/`--zen-success` + tablet breakpoint, style test.
- **PR #25 (Issue 8):** Approved after revert to `NEW` per labsheet `§4.2` (was `OPEN` + 10-value enum) + E2E rename to integration + `validSorts` doc fix + `hasUserSorted` + `RequesterSelection` verbatim.

## Pull Requests I Reviewed (in my partner's repository, thhanabun/Software_Eng_Lab)

| PR | Issue | Title | My Review |
| --- | --- | --- | --- |
| https://github.com/thhanabun/Software_Eng_Lab/pull/21 | #13 | Zen Green Theme, App Shell, and Development Requester Selection | Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/22 | #14 | Ticket Creation (API + UI + Validation) | Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/23 | #15 | My Tickets list with search, filter, sort, pagination | Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/24 | #16 | Ticket detail and attachment lifecycle | Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/25 | #17 | Playwright E2E suite — request flow, ownership, attachments | Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/26 | #17 | Labsheet audit fixes: boundary tests + screenshot folders | Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/27 | #18 | Final documentation, seed/index fixes, reviewer items closed | Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/28 | #11–#18 | Lab 2 Release: lab2-staging → main | Approved |

## Review Details

### Pull Request #21 (Issue #13 — Zen Green Theme, App Shell, Requester Selection)

**Verdict:** Approve — mergeable.

Notes given (non-blocking):
- `requesterStorage.ts` exports `REQUESTER_STORAGE_KEY` but the value is `'toktickit.requesterId'`; consider aligning the name.
- Retry button is not disabled during re-fetch, though the loading state unmounts the Retry UI so it is fine in practice.
- `readStoredRequester` swallows parse errors silently — acceptable for a dev-only localStorage shim, but a `console.warn` would help in production.
- `theme.css` is imported before `index.css`; verify the override order is intentional.

### Pull Request #22 (Issue #14 — Ticket Creation)

**Verdict:** Approve — mergeable.

Comments given (non-blocking):
- `PRIORITIES` in `CreateTicket.tsx:12` duplicates the list in `server/src/routes/tickets.ts:10` — adding a priority would require updating both; consider sharing a single source.
- `generateTicketNumber` uses a `count` scan by prefix on each call, which gets slower as data grows — fine for the current scope, but a dedicated sequence (or DB sequence) would be more scalable.

### Pull Request #23 (Issue #15 — My Tickets list)

**Verdict:** Looks good, approved.

What stands out:
- Ownership is enforced properly — `X-Requester-Id` required, invalid/missing → 400, unknown → 404, and the SQL scopes every row to that requester
- Search is scoped to summary + description only, case-insensitive, with `%`/`_`/`\` properly escaped
- Sort is whitelisted with a SQL CASE for priority rank (AD-09) and stable secondary `ticketNumber DESC`
- Clean split: unknown query params are ignored (BR-16) but invalid known ones → 400
- Dynamic WHERE built with parameterized `$queryRaw` + `Prisma.join` — no injection risk
- Client keeps filter state in the URL → shareable links, back-button friendly, and changing filters resets to page 1
- Loading / error / empty / no-results are distinct states with the right CTAs
- Tests cover API-07..13 on the server and UI-15..17 on the client — both suites green

### Pull Request #24 (Issue #16 — Ticket detail and attachment lifecycle)

**Verdict:** Looks good, approved. Verified by running the suite on the PR code: server 40/40, client 34/34 pass.

What stands out:
- Ownership enforced on every endpoint — missing/invalid `X-Requester-Id` → 400, unknown → 404, and a non-owned ticket/attachment returns 404 like it doesn't exist (no info leaks)
- Ticket Detail renders read-only with category/related system/requester names + ordered attachments
- Upload guarded properly — extension **and** MIME checked (415), 5 MB cap (413), 5-active limit (409), and rejected files are cleaned off disk (no orphans)
- Soft removal is clean: required reason (1–200), metadata stays visible, removed download → 410, re-remove → 409
- The create-then-attach flow fails gracefully — ticket kept, failed files reported with a "retry in Detail" hint (AC-30/BR-22)
- Modal is accessible (`role="dialog"`, Escape/overlay close, labelled reason field)

Two small notes (non-blocking):
- Upload check order runs as ownership → size → count → type (multer enforces size before the handler reaches the count check), while api-spec §3 lists ownership → count → size → type. Behavior is correct since the cases don't overlap for a single file, just slightly different from the doc.
- The README still only covers Lab 1 — Lab 2 setup (migrate, seed, `server/uploads/`) isn't documented yet, whereas the spec's Definition of Done asks for current setup/test instructions.

### Pull Request #25 (Issue #17 — Playwright E2E suite)

**Verdict:** Approved — good to merge.

What stands out:
- Full E2E coverage: E2E-01 (create → detail → search), E2E-02 (cross-requester 404 in UI + direct API), E2E-03 (upload → download → remove → 410), E2E-04 (responsive screenshots at 3 viewports), E2E-05 (keyboard-only AC-28)
- Real-stack `webServer` (API 3001 + Vite 5173) with `reuseExistingServer: true` and `workers: 1` for shared DB isolation
- `table-responsive` wrapper in `MyTickets.tsx:278` fixes mobile clipping (AC-27) and the screenshot wait-for-Category flake fix

Follow-up nits addressed on branch (commit `240264b`):
- E2E-03 410 assertion made unconditional (`expect(attachmentId).toMatch(/^\d+$/)` fails loudly if parse breaks)
- `e2e/package.json` pinned to `^1.62.1` to match lockfile

### Pull Request #26 (Issue #17 audit — Labsheet audit fixes)

**Verdict:** Approved.

What was fixed:
- Added API-04b boundary tests (labsheet §9.2): summary 120 → 201 / 121 → 400, description 2000 → 201, 5 attachments → 201 (6th already by API-20)
- Screenshot structure now `artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/{desktop,tablet,mobile}.png` per labsheet §12 (was flat `viewport-screen.png`) via `shot()` helper
- Added `e2e/tsconfig.json` with `strict` + `typescript`/`@types/node` so `tsc --noEmit` passes; removed unused `dialog` var (oxlint)
- Verification: server 43/43, client 34/34, e2e 5/5

### Pull Request #27 (Issue #18 docs — Final documentation & fixes)

**Verdict:** Approved.

What it closed (reviewer open items 1–6):
- `Attachment.ticketId` index migration `20260904081240` + rationale in specification.md §7 (Postgres doesn't auto-index FKs)
- `seed.ts` upserts no longer re-force `active` — manual deactivation survives re-seed
- `api-spec.md §4` matrix now documents inactive-read = 200 (audit retention) vs create = 400 (BR-23)
- `api-spec.md §3` upload order reconciled to actual `ownership → size → count → type` with body-drain explanation
- `README` rewritten for Lab 2 (migrate/seed/uploads, all three test suites, staging workflow)
- `tests.md` finalized: all `Planned → Pass`, duplicate UI-13/14 fixed via UI-15, `§5` commands corrected to `npx playwright test`, `§4` checklist ticked with `1280×900` viewport, `§6` filled 43/43 · 34/34 · 5/5
- `ai-use.md` new: 10 key prompts + reflection
- Verification: server 43/43, client 34/34, e2e 5/5, builds pass

### Pull Request #28 (Issues #11–#18 — Lab 2 Release: lab2-staging → main)

**Verdict:** Approved (release PR). Aggregates 29 commits / 64 files / +6752 from Lab 1 `main`.

What `main` gains:
- Data: RequesterUser/Category/RelatedSystem/Ticket/Attachment with justified indexes, 3 migrations, idempotent seed (4 + 7 systems, never re-forces `active`)
- API: 12 endpoints per api-spec (TKT-YYYYMMDD-####, owned list with SQL priority rank, full attachment lifecycle with correct status codes)
- UI: Zen Green foundation, guarded AppShell, two-step create→upload, URL-synced My Tickets, Ticket Detail with accessible modal
- Tests: 43/43 · 34/34 · 5/5 all green at `faa7a54`; docs complete, no skipped tests, screenshots + report generated, DoD checklist in specification.md §10 verified — ready to move Kanban to Done
