# Lab 3 Peer Review

## My Reviewer (reviewed my Pull Requests)

- Name: Thanabun Tikaew
- Student ID: 67070501021
- GitHub username: thhanabun

### My Pull Requests Reviewed (reviewer repo: ssiriwan/toktickit)

| PR | Issue | Title | Status |
| --- | --- | --- | --- |
| https://github.com/ssiriwan/toktickit/pull/32 | #32 | docs(lab-03): Sprint 3 spec contract | Merged — 8 fixes |
| https://github.com/ssiriwan/toktickit/pull/33 | #33 | docs(lab-03): test plan with AC traceability | Merged — 5 fixes |
| https://github.com/ssiriwan/toktickit/pull/34 | #34 | feat(lab-03): auth foundation + migration + seed | Open — pending review |

### Reviews Received — Details

- **PR #32 (Spec contract):** 8 fixes — (1) removed `resolutionSummary` from Ticket + UI (scope creep, deferred to Lab 4), (2) brand typo `TikTockIT` → `TokTickIT`, (3) Admin table now `Name | Email | Role | Status | Edit` on desktop, (4) seed credential placeholder table added, (5) queue search back to `ticketNumber+summary+description`, sort aligned to `ticketDate/updatedAt`, (6) added `relatedSystemId` filter, (7) AC traceability marked as Phase 2, (8) added BR-21 login-attempts (no lockout) + BR-22 CSRF.
- **PR #33 (Test plan):** 5 fixes — (1) non-English leftover `чуж` → `other owner's` (2 spots), (2) added UI-07 role-nav/forbidden cards (AC-06/16), (3) added UI-08 requester regression mapped to Lab 2 UI suite, (4) added VIS-01 screenshots row (AC-18), (5) split UNIT-01 → `password.unit.test.ts` and UI-06 → `theme.style.test.tsx`.
- **PR #34 (Auth foundation):** pending friend review.

## Pull Requests I Reviewed (in my partner's repository, thhanabun/Software_Eng_Lab)

| PR | Issue | Title | My Review |
| --- | --- | --- | --- |
| — | — | Lab 3 reviews pending (partner PRs not opened yet at time of writing) | TBD |

> This file is updated continuously as reviews happen.
