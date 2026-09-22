# Lab 4 UI Spec — TokTickIT (Zen Green)

> Reuses Lab 2–3 tokens/components. New screens must look like the same app. Routes use `react-router-dom`.

## 1. Tokens & reusable rules (kept)

- `theme.css`: `--zen-green-900..100`, `--zen-bg/card/border/text`, `--zen-danger/warning/success`; header 56px `.zen-header`; `.badge-{status|priority|role|action-status}`; `.required-star`; `.zen-readonly`; validation below field (`role=alert`); `aria-required/invalid`; visible focus; no h-overflow at 360px+.
- Action status badges: `PENDING` slate, `IN_PROGRESS` purple, `COMPLETED` green, `CANCELLED` gray. Follow-up flag: amber `Follow-up` pill + note block.
- Buttons: primary green, secondary outline, danger outline; disabled + spinner while submitting (BR-25); failed save keeps input and shows banner with Retry.
- Feedback: `loading` skeleton/spinner (`role=status`), `saving` button spinner, `success` green banner, `validation` red under field, `empty` illustration + CTA, `forbidden` 403 card, `safe failure` red banner with retry (no stack).

## 2. AppShell & navigation

- Header adds **Dashboard** for every role: Requester `Dashboard (/)`, `My Tickets (/tickets)`, `Create Ticket (/create)`; IT Staff `Dashboard (/)`, `My Queue (/staff/queue)`; Administrator `Dashboard (/)`, `Queue (/staff/queue)`, `Admin (/admin/users)`.
- After login `/` renders the role dashboard (Requester → `RequesterDashboard`, Staff/Admin → `StaffDashboard` with admin strip for Admins). Guards unchanged from Lab 3 (unauthenticated → `/login`, must-change → `/change-password`, role mismatch → Forbidden).

## 3. Screens

### 3.1 Requester Dashboard (`/`, `RequesterDashboard.tsx`)

- Welcome banner `Welcome back, {name}!`; 4 metric cards (My Open Tickets, In Progress, Resolved, Closed) — each a button drilling into `/tickets` with the matching status filter; Quick Actions `+ Create Ticket`, `View My Tickets`; `My Recent Tickets` (5, status badge, click → detail); Loading spinner, Error alert + Retry, Empty state (`No tickets yet — create your first ticket`) when the user never filed.

### 3.2 Staff Dashboard (`/`, `StaffDashboard.tsx`, IT + Admin)

- Welcome banner `Welcome back, {name}!` + `Refresh` button refetching metrics; 5 metric cards (New → `/staff/queue?status=NEW`, Open, In Progress, Waiting for Requester, My Assigned → `/staff/queue?owner=me`) + `Urgent` highlight; Administrator strip: user counts (Total, Requester, Staff, Admin) + link `/admin/users`; `Recent Tickets` (5 latest/urgent, owner + badges, click → detail); Quick Actions `Create Ticket` (requester-mode create is hidden for staff — button opens ticket search), `Search Tickets`, `My Queue`; Loading/Error-Retry/Empty states.

### 3.3 Actions Taken on Staff Ticket Detail (`StaffTicketDetail.tsx` + `lab-04/ActionsTakenList.tsx`)

- New **Actions Taken** section below status/owner (table on desktop, cards on mobile): columns `Date/Time | Description | Result | Performed by | Status | Follow-up | Attachments`.
- `+ Add Action Taken` opens a modal/drawer: `Description *` (textarea, counter, 1..2000), `Date/Time` (default now), `Performed by` (dropdown, active IT Staff/Admin only — inactive excluded, BR-04), `Status` (default PENDING), `Result` (required when COMPLETED, FR-07), `Follow-up Required` toggle revealing `Follow-up Note *`, `Attachment Notes` (text). Client validation mirrors API; submit debounced; failure preserves input.
- Row actions: `Edit` (same drawer), `Mark Completed` (asks for Result if empty), `Cancel action`. Status badge updates optimistically only after `200`.
- **Status control:** ticket status dropdown lists only matrix-allowed targets from current status; choosing `RESOLVED` with zero Completed actions shows the gate warning (`Resolution gate: add at least one Completed action before resolving`) and blocks save with the server `400` message rendered; stale edit (`409`) shows `This ticket was updated elsewhere — refresh and retry` banner with Refresh.

### 3.4 Actions Taken on Requester Ticket Detail (`TicketDetail.tsx`)

- Same data as readable cards (Date/Time, Description, Result, Status badge, Follow-up note if present, Attachment notes), chronological; **no** Add/Edit/Cancel controls (AC-15); empty state `No actions recorded yet — IT staff updates will appear here.`

## 4. Modes & feedback matrix

| Screen | Modes | Key feedback |
|---|---|---|
| Dashboards | loading/loaded/empty/error | skeleton, counts, Retry, empty CTA |
| Action form | idle/valid/invalid/submitting/success/failure | inline errors, spinner, preserved input |
| Status control | idle/saving/gate-blocked/stale/forbidden | gate warning, 409 banner + Refresh |

## 5. Responsive & accessibility

- Breakpoints: desktop ≥1024 (tables, 2-col grids, side drawer), tablet 768–1023 (1-col, collapsible filters), mobile <768 (cards, full-width forms, sheet drawer). Required evidence: every primary screen (Requester Dashboard, Staff Dashboard, Staff Detail+Actions, Requester Detail+Actions) at **1280 / 768 / 375 px**.
- A11y: landmarks, labelled inputs, `aria-required/invalid`, `role=alert/status`, keyboard-operable cards/menus/dialogs, focus trap in modal/drawer, visible focus, Zen Green contrast, no clipping/overlap/h-overflow — checklist verified before release (Part 9).
