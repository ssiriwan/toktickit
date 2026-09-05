# Lab 2 Peer Review

## My Reviewer (reviewed my Pull Requests)

- Name: Thanabun Tikaew
- Student ID: 67070501021
- GitHub username: thhanabun

### My Pull Requests Reviewed (reviewer repo: ssiriwan/toktickit)

| PR | Issue | Title | Status |
| --- | --- | --- | --- |
| https://github.com/ssiriwan/toktickit/pull/11 | #10 | Lab 2: Sprint Specification and Test Plan | Pending review |

## Pull Requests I Reviewed (in my partner's repository, thhanabun/Software_Eng_Lab)

| PR | Issue | Title | My Review |
| --- | --- | --- | --- |
| https://github.com/thhanabun/Software_Eng_Lab/pull/21 | #13 | Zen Green Theme, App Shell, and Development Requester Selection | Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/22 | #14 | Ticket Creation (API + UI + Validation) | Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/23 | #15 | My Tickets list with search, filter, sort, pagination | Approved |
| https://github.com/thhanabun/Software_Eng_Lab/pull/24 | #16 | Ticket detail and attachment lifecycle | Approved |

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
