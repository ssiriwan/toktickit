# TokTickIT — CPE334 Lab 2 Requester Ticketing MVP

TokTickIT is a full-stack ticketing system for CPE 334. Lab 2 delivers the Requester-facing MVP with Zen Green Theme: Development Requester selection, Create Ticket, My Tickets, Ticket Detail, and Attachment lifecycle.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 7, Bootstrap 5, React Router 7, Vitest + Testing Library (jsdom)
- **Backend:** Node 20 + Express 4 + TypeScript, Prisma 6 + PostgreSQL 17, Multer, Zod, Vitest + Supertest
- **E2E:** Playwright 1.62
- **DB:** PostgreSQL (Docker, `toktickit-db` on `localhost:5434`)

## Project Structure

```
toktickit/
  client/src/lab-02/{AppShell.tsx, RequesterSelection.tsx, CreateTicket.tsx, MyTickets.tsx, TicketDetail.tsx, theme.css}
  server/src/{app.ts (9 endpoints), db.ts, uploads.ts, ticket-number.ts}
  prisma/{schema.prisma (5 models, 2 enums), seed.ts, migrations/}
  tests/lab-02/{*.server.test.ts, *.ui.test.tsx, theme.style.test.tsx, requester-ticket-flow.integration.test.ts}
  e2e/lab-02/requester-ticket-flow.spec.ts
  docs/lab-02/{specification.md, tests.md, ui-spec.md, api-spec.md, reviewer.md, ai-use.md}
  artifacts/lab-02/screenshots/{requester-selection,create-ticket,my-tickets,ticket-detail}/
  server/uploads/ (gitignored, UUID filenames)
```

## Prerequisites

- Node 20+, Docker Desktop

## Setup

```bash
npm install
# Start DB (once)
docker run -d --name toktickit-db -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5434:5432 -v toktickit_pgdata:/var/lib/postgresql/data postgres:17-alpine
# Or if exists
docker start toktickit-db

# Env
cp .env.example .env
# DATABASE_URL="postgresql://toktickit:toktickit@localhost:5434/toktickit?schema=public"

# DB
npx prisma migrate dev
npm run prisma:seed   # idempotent: 4 categories, 7 systems, 4 active + 1 inactive requesters
```

## Running

```bash
npm run dev:server   # http://localhost:3000 (API)
npm run dev:client   # http://localhost:5173 (Vite, proxy /api → 3000)
# Open http://localhost:5173
```

Uploads are stored at `server/uploads/` (gitignored, `fileURLToPath` based, UUID filenames, 5MB, 5-active limit).

## Tests (Lab 2 — 81 tests)

```bash
npm test                              # 81 passed (19 files: 10 server + 9 client, from lab2-staging/main)
npm run test:server                   # 47 passed (10 files, incl. integration)
npm run test:client                   # 34 passed (9 files, UI + theme)
npx playwright test e2e/lab-02/       # 4 flows (chromium, with webServer)
npm run build                         # tsc + vite clean (client 32 modules)
```

- **Unit:** ticket-number format
- **API:** 8 endpoints (requesters, categories, systems, POST ticket, GET list, GET detail, POST attachment, GET download, PATCH remove) with validation, ownership (403/404), 410 for removed
- **UI:** form validation, loading/empty/error, responsive, badges, a11y (aria-required, role=alert)
- **E2E:** Playwright: create → My Tickets → Detail → attach → remove → cross-requester isolation

All tests pass from `main` after release (`NODE_OPTIONS=--max-old-space-size=4096` for `npm test`).

## Workflow

Feature branches from `lab2-staging` → PR → peer review (see `docs/lab-02/reviewer.md`) → merge to `lab2-staging`. Release PR `lab2-staging` → `main` (Lab 2).

```
lab2-staging
  ├─ feature/1-spec-docs → PR #11
  ├─ feature/2-db-schema → PR #13
  ├─ feature/3-requester-context → PR #15
  ├─ feature/4-ticket-creation → PR #17
  ├─ feature/5-my-tickets → PR #19
  ├─ feature/6-ticket-detail-attachments → PR #21
  ├─ feature/7-zen-green-theme → PR #23
  ├─ feature/8-e2e-release → PR #25
  └─ feature/docs-final → PR #28
```

Lab 1 is at `b5c6bcf` on `main`; Lab 2 release is `lab2-staging` → `main` via PR #29.

## Notes

- Do not commit `.env` or `node_modules/` or `server/uploads/`.
- Lab 2 uses Development Requester selector as a testing mechanism, not real authentication (Lab 3 will add auth).
