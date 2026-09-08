# Lab 3 UI Spec — TokTickIT (Zen Green)

> Reuses Lab 2 tokens/components. New screens must look like the same app. Routes use `react-router-dom`.

## 1. Tokens & reusable rules (kept from Lab 2)

- `theme.css`: `--zen-green-900..100`, `--zen-bg`, `--zen-card`, `--zen-border`, `--zen-text`, `--zen-danger`, `--zen-warning`, `--zen-success`; header 56px `.zen-header`; `.badge-{status|priority|role}`; `.required-star` red `*`; `.zen-readonly` gray bg; validation text below field (`role=alert`), `aria-required`, `aria-invalid`; focus ring visible; no horizontal overflow at 360px+.
- Badges: status (8 values, distinct hues; `NEW` gray, `IN_PROGRESS` blue, `WAITING` amber, `RESOLVED` green, `CLOSED` dark, `REOPENED` purple, `CANCELLED` red), priority (`LOW` green, `MEDIUM` amber, `HIGH` red-orange, `URGENT` red), role (`REQUESTER` blue, `IT_STAFF` teal, `ADMINISTRATOR` purple), active (`Active` green, `Inactive` red).
- Buttons: primary green (save/login/post), secondary outline (cancel/back), danger outline (deactivate), disabled + spinner during busy.
- Feedback patterns: `loading` skeleton/spinner (`role=status`), `saving` button spinner, `success` green banner, `validation` red under field, `empty` illustration + CTA, `no-results` + clear-filters, `forbidden` 403 card, `safe failure` red banner with retry (no stack).

## 2. AppShell & navigation

- Header: brand link `TikTockIT` → role home; center nav by role:
  - Requester: `My Tickets`, `Create Ticket`.
  - IT Staff: `My Queue` (`/staff/queue`), `Create Ticket` hidden (requesters only create; IT queue is work list).
  - Administrator: `Admin` (`/admin/users`).
- Right: `Profile` menu shows `name + role badge`, `Change password` (always allowed), `Logout`. No unauthorized links rendered (but backend still enforces).
- Guards: unauthenticated → `/login`; `mustChangePassword` → `/change-password` (except logout); role mismatch → `Forbidden` page; after logout, back-button re-entry calls `/me` and redirects to login.

## 3. Screens

### 3.1 Login (`/login`)

- Card centered (max 420px): `Email address`, `Password` (show/hide), `Sign In` primary, `Forgot password?` rendered disabled with tooltip `Contact administrator (Lab 3 has no email reset)`.
- States: field validation (invalid email, required), busy spinner, safe failure `Invalid email or password. Please try again.` for 401; `Account is deactivated. Please contact support.` for 403 inactive; inactive vs invalid visually distinct but messages safe.
- Success: if `mustChangePassword` → `/change-password`, else role home.

### 3.2 Change Password (`/change-password`)

- Card: `Current (temporary) password`, `New password`, `Confirm new password` + live rule checklist (≥8, upper+lower, number, special) turning green; mismatch error under confirm.
- `Continue` disabled until valid; busy → success → role home. No skip/exit except logout.

### 3.3 Requester MyTickets / Create / Detail (`/`, `/create`, `/tickets/:id`)

- Lab 2 preserved (search + Category/System/Status/Priority + sort + page size + Prev/Next, server-driven). Selector + `Change Requester` removed; header shows session user.
- Detail adds: `Public Comments` list (avatar initials, name + role badge, time, escaped body) + `Add Public Comment` box + `Post Comment`; `Problem Appears Resolved` button with confirm dialog (`Mark as appears resolved? IT Staff will verify.`); after set, show info banner `You marked this as appears resolved. Awaiting IT verification.` Button idempotent.
- Attachments section unchanged (upload/download/remove with reason) but identity from session.

### 3.4 Staff Ticket Queue (`/staff/queue`, IT + Admin read-only)

- Toolbar: `Search by ticket number or summary…` + `Filters` toggle (Status, Category, Req Priority, IT Priority, Owner: All/Mine/Unassigned) + result count `Showing 1 to 10 of N tickets`.
- Desktop: table columns `Ticket No. | Created Date | Summary | Category | Req. Priority | IT Priority | Status | Owner` + row click/`Open` → detail. No mega-grid: summary truncated 2 lines with title tooltip.
- Mobile (<768px): cards with `No + status badge`, `summary`, `meta (category • date)`, `priorities + owner` row, `Open →` button.
- Pagination: `Previous 1 2 3 … N Next`, page-size select. Empty (`No tickets yet`), no-results (`No tickets match — Clear filters`), forbidden (Admin mutation hidden; Requester gets 403 card), failure (retry).
- Admin view: same list but all mutation buttons hidden + `Read-only` tag.

### 3.5 Staff Ticket Detail (`/staff/tickets/:id`, IT editable; Admin read-only)

- Breadcrumb `My Queue > Ticket Detail` + `Back to Queue`.
- Top grid (read-only except noted): `Ticket No., Category, Related System, Requester, Requested Priority (readonly badge), Current Status (IT: dropdown of allowed next only), Ticket Owner (IT: dropdown active IT/Admin + Unassigned), IT Priority (IT: dropdown)`, `Summary`, `Description`, `Resolution Summary` (IT editable textarea, visible to requester).
- `appearsResolved` banner (amber, prominent): `Requester indicates this appears resolved at <time>. Please verify before Resolving/Closing.` Hidden when false.
- Tabs: `Public Comments (n)` (white/green) | `Internal Notes (n)` (amber-tinted + 🔒 `Private — IT & Admin only`) | `Attachments (n)` (read/download; upload disabled for staff in Lab 3) | (`Service Actions` tab hidden — Lab 4).
- Composer areas visually distinct (different bg + lock icon + placeholder `Type internal note… (private)` vs `Type your comment here…`); posting to wrong channel impossible by layout (separate tabs).
- Admin mode: all dropdowns/textareas/composers disabled with `Read-only` hint; lists still visible.

### 3.6 Admin User Management (`/admin/users`, Administrator only)

- Left: `Users` + `Create User` primary; `Search users…` + `Filters` (single role select: All/Requester/IT Staff/Administrator); table `Name | Role | Status | (Email shown below name on mobile)` + `Edit` per row.
- Right drawer `Create New User / Edit User`: `Full Name *`, `Email Address *`, `Role *` (select one), `Active` toggle (Yes/No), `Initial Password` (create/reset only, rule hint, `User must change at next login` note), `Save User` primary, `Deactivate/Activate User` danger-outline (edit only), `Cancel`.
- Guards in UI: self row `Deactivate` disabled with tooltip; last-admin deactivation shows confirm + backend error rendering; duplicate email shows field error; non-Admin route → 403 card.
- No pagination/sort/multi-filter in Lab 3 (intentionally simple); list scrolls; responsive: drawer becomes full-screen sheet on mobile.

## 4. Modes & feedback matrix

| Screen | Modes | Key feedback |
|---|---|---|
| Login | idle/validating/busy/success/failure | inline field errors, safe banner, spinner |
| ChangePassword | idle/valid/invalid/busy/success | rule checklist, mismatch, success redirect |
| Queue | loading/loaded/empty/no-results/forbidden/failure | skeleton, counts, retry |
| Detail | view/saving(owner|priority|status|comment|note)/validation/success/forbidden | per-section spinner, banner, tab counts |
| Admin | list/creating/editing/saving/validation/conflict/forbidden | drawer errors, 409 rendering, toggle states |

## 5. Responsive & accessibility

- Breakpoints: desktop ≥1024 (tables, 2-col detail grid, side drawer), tablet 768–1023 (1-col detail, collapsible filters), mobile <768 (cards, full-width forms, sheet drawer).
- A11y: landmarks, label-associated inputs, `aria-required/invalid`, `role=alert/status`, keyboard-operable tables/menus/dialogs, focus trap in drawer/dialog, visible focus, contrast per Lab 2, no `outline:none` without replacement.
- Visual checklist (for Part 9): tokens, header/nav, badges, required-star, readonly style, validation placement, focus, no clipping/overlap/h-overflow — verified on all 4 areas × 3 sizes before release.
