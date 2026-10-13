# Lab 4 Test Run Evidence (Part 3)

> Full-suite evidence for the release. Lab 4 runs below are on `lab4-staging`
> (pre-release). The mandatory `main`-branch rerun happens after the release
> PR merges — append its output here before building the PDF.

## 1. Unit + Integration (`npm test`)

```
 Test Files  42 passed (42)
      Tests  215 passed (213 + UI-07 style test)
```

- 41 files: Labs 1–2 (real-DB suites need `toktickit-db` on `:5434`) + Lab 3 (mocked auth/queue/detail/admin) + Lab 4 (mocked actions/workflow/dashboards + pure unit + real-DB perf smoke).
- 0 failed, 0 skipped-in-error. (Lab 2 suites wipe tickets in setup/teardown — reseeded after every full run.)
- Environment note: two runs during this sprint failed purely on load (bcrypt cost-12 > 5 s timeouts, Docker daemon/container down). All failures were infra (`Can't reach database`, wall-clock timeouts), zero assertion failures; clean re-runs after freeing the machine were 41/41 and 41/41.

## 2. E2E (`npm run e2e:lab4`, chromium, workers:1, seed-pinned setup/teardown)

```
  ✓  1 actions-taken-flow — staff creates + completes an action; requester sees it read-only
  ✓  2 dashboards — requester card lands on filtered My Tickets
  ✓  3 dashboards — staff card lands on filtered queue
  ✓  4 screenshots — requester dashboard (3 viewports)
  ✓  5 screenshots — staff dashboard (3 viewports)
  ✓  6 screenshots — actions taken on staff ticket detail (3 viewports)
  ✓  7 screenshots — actions taken read-only on requester ticket detail (3 viewports)
  ✓  8 ticket-resolution — gate blocks RESOLVED, then complete → resolve → close succeeds
  8 passed
```

- Global setup reseeds, pins E2E accounts, deletes `E2E *` actions, resets `TK-20260910-0008` → OPEN (same as teardown — deterministic reruns).
- Two genuine bugs found by E2E (not by unit tests): performer-default race (fixed with backfill effect) and un-awaited gate refresh (fixed with live recheck). See `ai-use.md` §9.

## 3. Builds (`npm run build`)

```
> @toktickit/client@0.1.0 build — tsc -b && vite build — 54 modules transformed, built clean
> @toktickit/server@0.1.0 build — tsc -p tsconfig.json — clean, no errors
```

## 4. Seed idempotency

`npm run prisma:seed` executed before/after every suite: 12 users, 9 tickets (8 statuses), 4 actions — counts stable across ≥5 runs, zero duplicates.

## 5. TODO after release merge (fill in before PDF)

- [ ] `npm test` on `main`: __ files / __ tests (paste output)
- [ ] `npm run e2e:lab4` on `main`: __ passed (paste output)
- [ ] `npm run build` on `main`: clean (paste output)
