# TokTickIT

TokTickIT is the Lab 1 full-stack starter for CPE 334. This repository contains a React/Vite frontend, an Express/TypeScript backend, Prisma configuration, and test tooling for Vitest and Supertest.

## Project Structure

```text
toktickit/
├── client/
├── server/
├── prisma/
├── tests/
│   └── lab-01/
├── docs/
│   └── lab-01/
├── .env.example
├── .gitignore
└── README.md
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and update `DATABASE_URL` for your local PostgreSQL database.

3. Generate the Prisma client:

```bash
npm run prisma:generate
```

## Development

Start the backend:

```bash
npm run dev:server
```

Start the frontend:

```bash
npm run dev:client
```

## Tests

Run all configured tests:

```bash
npm test
```

Run frontend tests only:

```bash
npm run test:client
```

Run backend tests only:

```bash
npm run test:server
```

## Notes

- Do not commit `.env` files or `node_modules/`.
- Lab 1 feature endpoints and database models should be added in their own feature branches.
