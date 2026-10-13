# TokTickIT — CPE334 IT Service Desk (Labs 1–4)

TokTickIT is a full-stack ticketing system for CPE 334. Lab 4 completes the service-desk workflow: per-ticket **Actions Taken** with their own lifecycle, a strict 8-state **ticket workflow** (resolution gate + concurrency guard), and **role dashboards** (Requester / Staff / Admin) — all in the Zen Green language, on top of Lab 2 (Requester MVP) and Lab 3 (auth, roles, staff queue/detail, admin users).

## Tech Stack

- **Frontend:** React + TypeScript + Vite 7, Bootstrap 5, React Router 7, Vitest + Testing Library (jsdom)
- **Backend:** Node 20 + Express 4 + TypeScript, Prisma 6 + PostgreSQL 17, Vitest + Supertest
- **E2E:** Playwright (chromium)
- **DB:** PostgreSQL 17 in Docker (`toktickit-db` on `localhost:5434`, volume `toktickit_pgdata`)

## Project Structure (Lab 4 additions marked ★)

```
toktickit/
  client/src/lab-04/{ActionsTakenList.tsx, RequesterDashboard.tsx, StaffDashboard.tsx}  ★
  client/src/lab-02/{AppShell.tsx (Dashboard nav + role home), MyTickets.tsx, TicketDetail.tsx, theme.css}
  client/src/lab-03/{AuthContext, Login, ChangePassword, StaffTicketQueue, StaffTicketDetail, UserManagement}.tsx
  client/tests/lab-04/{ActionsTaken, RequesterDashboard, StaffDashboard, TicketWorkflow, theme.style}.test.tsx  ★
  server/src/{app.ts, auth.ts, auth-middleware.ts, action-validation.ts ★, dashboard-window.ts ★, db.ts}
  server/tests/lab-04/{actions-taken, ticket-workflow, requester-dashboard, staff-dashboard}.api.test.ts  ★
  server/tests/lab-04/{action-validation.unit, dashboard-window.unit, dashboard.perf-smoke}.test.ts  ★
  prisma/{schema.prisma (+ActionTaken, ActionStatus), seed.ts (9 tickets / 8 statuses / 4 actions), migrations/}
  e2e/lab-04/{actions-taken-flow, ticket-resolution, dashboards, screenshots}.spec.ts  ★
  playwright.lab04.config.ts  ★
  docs/lab-04/{specification.md, tests.md, ui-spec.md, api-spec.md, reviewer.md, ai-use.md, a11y-checklist.md ★, test-run-evidence.md ★}
  artifacts/lab-04/screenshots/{requester-dashboard, staff-dashboard, actions-taken, workflow}/  ★
```

## Prerequisites

- Node 20+, Docker Desktop

## Setup

```bash
npm install
# Start DB (once; container often Exited after idle → docker start toktickit-db)
docker run -d --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5434:5432 -v toktickit_pgdata:/var/lib/postgresql/data postgres:17-alpine

# Env
cp .env.example .env
# DATABASE_URL="postgresql://toktickit:toktickit@localhost:5434/toktickit?schema=public"

# DB (run migrate from the REPO ROOT so prisma loads the root .env)
npx prisma migrate dev --schema prisma/schema.prisma
npm run prisma:seed   # idempotent: categories, systems, 12 users, 9 tickets (8 statuses), 4 actions
```

Local seed logins (all start with `mustChangePassword=true`): `requester1@toktickit.local` / `Requester123!`, `it1@toktickit.local` / `Itstaff123!`, `admin1@toktickit.local` / `Admin123!`.

## Running

```bash
npm run dev:server   # http://localhost:3000 (API)
npm run dev:client   # http://localhost:5173 (Vite, proxy /api → 3000)
# Open http://localhost:5173 → login → role dashboard (Requester / Staff / Admin)
```

## Tests (Lab 4)

```bash
npm test              # 41 files / 213 tests green (Labs 1–4, mocked API/UI + real-DB Lab 2)
npm run e2e:lab4      # 8 passed on chromium (E2E-01..03 + VIS-01 ×4, seed-pinned, workers:1)
npm run build         # client (vite) + server (tsc) clean
```

- **Unit:** action validation (BR-05..08/29), dashboard UTC window (BR-28), lifecycle matrices
- **API:** actions CRUD + authz, workflow matrix/gate/409, dashboards (isolation, counts, user summary), perf smoke (p95 < 1s)
- **UI:** action form + debounce + read-only, dashboards cards + drill-down hrefs, status control + gate/409 banners, theme tokens
- **E2E:** Playwright: action lifecycle → requester visibility, gate → resolve → close, drill-down URLs, 15 screenshots (4 areas × 3 viewports)

Full logs: `docs/lab-04/test-run-evidence.md`. Contract: `docs/lab-04/{specification,api-spec,ui-spec,tests}.md`.

## Workflow

Feature branches from `lab4-staging` → PR → peer review by @thhanabun (see `docs/lab-04/reviewer.md`) → merge to `lab4-staging`. Release PR `lab4-staging` → `main` (Lab 4).

```
lab4-staging
  ├─ feature/45-spec-contract → PR #46   (contract + test plan)
  ├─ feature/47-actions-foundation → PR #48
  ├─ feature/49-actions-taken-ui → PR #50
  ├─ feature/51-dashboards-api → PR #52
  ├─ feature/53-dashboards-ui → PR #54
  ├─ feature/55-ticket-workflow → PR #56
  ├─ feature/57-final-release → PR #58 (E2E, screenshots, regression)
  ├─ feature/59-final-docs → PR #60      (reviewer + ai-use)
  └─ feature/61-release-evidence → PR (this PR: shots, checklist, evidence, README)
```

Lab 3 released via PR #44 (`1d8a8be`); Lab 4 bases `lab4-staging` on it.

## Notes

- Do not commit `.env`, `node_modules/`, `server/uploads/`, `test-results/`, or `pgdata_*.tar.gz` backups.
- Never edit an applied `prisma/migrations/*/migration.sql` (checksum drift breaks `migrate dev`); keep `*.sql` LF via `.gitattributes`.
- Run Prisma commands needing `DATABASE_URL` from the repo root (server cwd loads the wrong `.env`).
- Lab 2 suites wipe tickets in setup/teardown — always `npm run prisma:seed` after full runs.
