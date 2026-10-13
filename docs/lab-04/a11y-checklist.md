# Lab 4 Accessibility & Visual Checklist (Part 9)

> Completed verification for the release. Checked against real renders
> (desktop 1280 / tablet 768 / mobile 375) captured under
> `artifacts/lab-04/screenshots/`.

## Screens covered

- [x] Requester Dashboard (`requester-dashboard/dashboard-{desktop,tablet,mobile}.png`)
- [x] Staff Dashboard (`staff-dashboard/dashboard-{desktop,tablet,mobile}.png`)
- [x] Staff Ticket Detail + Actions Taken (`actions-taken/detail-{desktop,tablet,mobile}.png`)
- [x] Requester Ticket Detail read-only (`actions-taken/requester-readonly-{desktop,tablet,mobile}.png`)

## Checklist

- [x] Keyboard: every interactive element is a native `<button>`, `<a>`, `<select>`, `<input>`, or `<textarea>` — tab-reachable with visible focus; dashboard cards are real links; no `outline:none` without replacement.
- [x] Labels: all form controls labelled (`<label>` / `aria-label`); required fields marked with `.required-star` plus messages; `aria-required`/`aria-invalid` on modal inputs; `role=alert` on validation/banners, `role=status` on loading text.
- [x] Contrast (Zen Green): primary `#006B3C` on white, body text `#1A2E1A`, badgesReuse the Lab 2/3 token palette with borders (never color-alone for status meaning — every badge carries text).
- [x] No clipped text: long ticket summaries wrap (`overflow-wrap:anywhere`, verified in queue); dialog content scrolls into view before capture.
- [x] No horizontal overflow at 375px: card grids collapse to 2 columns, detail grids stack, tables switch to cards, header wraps to two rows (fixed during this sprint after a 375px capture showed clipped Logout).
- [x] Read-only vs editable distinct: `.zen-readonly` gray blocks vs white inputs; requester action cards render zero controls (asserted in UI-02).
- [x] Validation placement: red text directly under the field in every Lab 4 form (asserted in UI-01/UI-01b).

## Known non-issues

- `act(...)` warnings in jsdom output are pre-existing test-harness noise (Lab 2/3 suites emit them too); no user-facing effect.
- Mobile header wraps to two rows by design (brand/nav, then role/actions) instead of shrinking tap targets.
