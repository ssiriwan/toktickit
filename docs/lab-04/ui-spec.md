# Lab 4 UI Spec — TokTickIT (Zen Green)

> Reuses Lab 2–3 tokens/components. New screens must look like the same app. Routes use `react-router-dom`.

## 1. Tokens & reusable rules (kept)

- `theme.css`: `--zen-green-900..100`, `--zen-bg/card/border/text`, `--zen-danger/warning/success`; header 56px `.zen-header`; `.badge-{status|priority|role|action-status}`; `.required-star`; `.zen-readonly`; validation below field (`role=alert`); `aria-required/invalid`; visible focus; no h-overflow at 360px+.
- Action status badges: `PENDING` slate, `IN_PROGRESS` purple, `COMPLETED` green, `CANCELLED` gray. Follow-up flag: amber `Follow-up` pill + note block.
- Dashboard metric cards (both roles): rounded `0.75rem`, label top-left `#374151` non-bold with reserved height so values align (two lines on requester, one line on staff), black bold value, green `View all` footer; rows centered (`justify-content-center`).
- Buttons: primary green, secondary outline, danger outline; disabled + submitting text while submitting (BR-25); failed save keeps input and shows banner (resubmit to retry).
- Feedback: `loading` text (`role=status`), `saving` button text, `validation` red under field, `empty` text + CTA link, `forbidden` 403 card, `safe failure` red banner with retry (no stack).

## 2. AppShell & navigation

- Header adds **Dashboard** for every role: Requester `Dashboard (/)`, `My Tickets (/tickets)`, `Create Ticket (/create)`; IT Staff `Dashboard (/)`, `My Queue (/staff/queue)`; Administrator `Dashboard (/)`, `Queue (/staff/queue)`, `Admin (/admin/users)`.
- After login `/` renders the role dashboard (Requester → `RequesterDashboard`, Staff/Admin → `StaffDashboard` with admin strip for Admins). Guards unchanged from Lab 3 (unauthenticated → `/login`, must-change → `/change-password`, role mismatch → Forbidden).

## 3. Screens

### 3.1 Requester Dashboard (`/`, `RequesterDashboard.tsx`)

- Welcome banner `Welcome back, {name}!`; 5 metric cards in one row 1:1 with `GET /api/requester/dashboard` metrics — `My Open Tickets (totalOpen)` → `/tickets`, `Waiting for Requester` → `/tickets?status=WAITING_FOR_REQUESTER`, `Recently Updated` → `/tickets?sort=updatedAt&order=desc`, `Recently Resolved` → `/tickets?status=RESOLVED`, `Closed` → `/tickets?status=CLOSED` (`totalOpen` spans 5 statuses so its card links the unfiltered list); Quick Actions `+ Create Ticket`, `View My Tickets`; `My Recent Tickets` in a rounded bordered box with thin dividers in aligned columns (Ticket = green ticket-number link over black summary | Status | Updated), click number → detail; Loading text, Error alert + Retry, Empty state (`No tickets yet — create your first ticket`) when the user never filed.

### 3.2 Staff Dashboard (`/`, `StaffDashboard.tsx`, IT + Admin)

- Welcome banner `Welcome back, {name}!` + `Refresh` button (with refresh icon) refetching metrics; 7 metric cards 1:1 with `GET /api/staff/dashboard` metrics — `New` → `/staff/queue?status=NEW`, `Open` → `?status=OPEN`, `In Progress` → `?status=IN_PROGRESS`, `Waiting for Requester` → `?status=WAITING_FOR_REQUESTER`, `My Assigned` → `/staff/queue?owner=me`, `Unassigned` → `/staff/queue?owner=unassigned`, `Urgent` → `/staff/queue?itPriority=URGENT`; Administrator strip: user counts (Total, Requester, Staff, Admin) + link `/admin/users`; `Recent Tickets` in a rounded bordered box: header row holds `Recent Tickets` + thin green `View my tickets` (`/staff/queue?owner=me`) right-aligned (no `Search tickets` link, no quick-actions bar); 5 latest/urgent rows with thin dividers in aligned columns (Ticket = green ticket-number link over summary | IT Priority | Status | Owner | Last Updated), click number → detail; Loading/Error-Retry/Empty states.

### 3.3 Actions Taken on Staff Ticket Detail (`StaffTicketDetail.tsx` + `lab-04/ActionsTakenList.tsx`)

- New **Actions Taken** section below the tabs as a card list (one article per action showing Date/Time, Description, Result, Performed by, Status badge, Follow-up flag/note, Attachment notes).
- `+ Add Action Taken` opens an inline form card (`role=dialog`): `Description *` (textarea, `maxLength` 2000), `Date/Time` (default now), `Performed by` (dropdown, active IT Staff/Admin only — inactive excluded, BR-04), `Status` (default PENDING; edit mode lists lifecycle-allowed targets only), `Result` (required when COMPLETED, FR-07), `Follow-up Required` toggle revealing `Follow-up Note *`, `Attachment Notes` (text). Client validation mirrors API; submit debounced; failure preserves input.
- Row actions: `Edit` (same form), `Mark completed` (opens the editor when Result is missing), `Cancel action`. List refetches after `200` (no optimistic update).
- **Status control (planned — workflow hardening, plan Issue #49, not yet implemented):** ticket status dropdown will list only matrix-allowed targets; choosing `RESOLVED` with zero Completed actions will show the gate warning and block save; stale edits will show the `409` banner with Refresh. Current behavior: full status list, Lab 3 matrix enforced server-side only.

### 3.4 Actions Taken on Requester Ticket Detail (`TicketDetail.tsx`)

- Same data as readable cards (Date/Time, Description, Result, Status badge, Follow-up note if present, Attachment notes), chronological; **no** Add/Edit/Cancel controls (AC-15); empty state `No actions recorded yet — IT staff updates will appear here.`

## 4. Modes & feedback matrix

| Screen | Modes | Key feedback |
|---|---|---|
| Dashboards | loading/loaded/empty/error | loading text, counts, Retry, empty CTA |
| Action form | idle/valid/invalid/submitting/success/failure | inline errors, submitting text, preserved input, banner |
| Status control | *(planned, plan Issue #49)* idle/saving/gate-blocked/stale/forbidden | gate warning, 409 banner + Refresh |

## 5. Responsive & accessibility

- Breakpoints: desktop ≥1024 (tables, 2-col grids, side drawer), tablet 768–1023 (1-col, collapsible filters), mobile <768 (cards, full-width forms, sheet drawer). Required evidence: every primary screen (Requester Dashboard, Staff Dashboard, Staff Detail+Actions, Requester Detail+Actions) at **1280 / 768 / 375 px**.
- A11y: landmarks, labelled inputs, `aria-required/invalid`, `role=alert/status`, keyboard-operable cards/links/menus/dialogs, visible focus, Zen Green contrast, no clipping/overlap/h-overflow (long summaries wrap) — checklist verified before release (Part 9).
