# Lab 1 Tests

These are the automated tests currently included for the four Lab 1 Issues: project foundation, health check, category seed, and category list.

## Test Summary

| Test ID | Test File | Tool | Test Description | Expected Result |
| --- | --- | --- | --- | --- |
| API-FOUNDATION-01 | `tests/lab-01/api-foundation.server.test.ts` | Vitest + Supertest | Express app starts and returns a JSON 404 response for an unknown route. | Response status is `404` and body is `{ "message": "Route not found" }`. |
| API-HEALTH-01 | `tests/lab-01/api-health.server.test.ts` | Vitest + Supertest | `GET /api/health` returns the API health status. | Response status is `200` and body is `{ "status": "ok", "service": "TokTickIT API" }`. |
| API-CATEGORIES-01 | `tests/lab-01/api-categories.server.test.ts` | Vitest + Supertest | `GET /api/categories` returns the seeded categories. | Response status is `200` and body is the four categories `{ id, name }` in id order. |
| UI-FOUNDATION-01 | `tests/lab-01/ui-foundation.test.tsx` | Vitest + React Testing Library | TokTickIT heading renders on the frontend. | The heading `TokTickIT IT Service Desk` is visible. |
| UI-FOUNDATION-02 | `tests/lab-01/ui-foundation.test.tsx` | Vitest + React Testing Library | The Check System button renders with Bootstrap classes. | The button is visible and has `btn` and `btn-primary` classes. |
| UI-HEALTH-01 | `tests/lab-01/ui-health.test.tsx` | Vitest + React Testing Library | Clicking Check System calls the health API and shows the loading state, then the online status. | A loading state appears, the API is called, and `System Status: Online` is shown. |
| UI-HEALTH-02 | `tests/lab-01/ui-health.test.tsx` | Vitest + React Testing Library | Clicking Check System when the backend is unavailable shows an error message. | An error message "Unable to reach the backend" is shown. |
| UI-CATEGORIES-01 | `tests/lab-01/ui-categories.test.tsx` | Vitest + React Testing Library | Clicking Check System shows a loading state while categories are requested. | A "Loading categories..." state is shown, then the list appears. |
| UI-CATEGORIES-02 | `tests/lab-01/ui-categories.test.tsx` | Vitest + React Testing Library | The categories returned by the API are displayed. | The four categories are visible under `Supported Request Categories`. |
| UI-CATEGORIES-03 | `tests/lab-01/ui-categories.test.tsx` | Vitest + React Testing Library | A failed categories request shows an error message. | An error message "Unable to load categories" is shown. |

## Test Commands

Run all tests:

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

## Latest Test Evidence

The README test commands were run successfully on the `feature/4-category-list` branch.

```text
npm test
Test Files  6 passed (6)
Tests       10 passed (10)

npm run test:client
Test Files  3 passed (3)
Tests       7 passed (7)

npm run test:server
Test Files  3 passed (3)
Tests       3 passed (3)
```

Live endpoint verification:

```text
GET http://localhost:3000/api/health
{"status":"ok","service":"TokTickIT API"}
HTTP 200

GET http://localhost:3000/api/categories
[{"id":1,"name":"Account and Access"},{"id":2,"name":"Hardware"},{"id":3,"name":"Software"},{"id":4,"name":"Network"}]
HTTP 200
```

## Notes

- The Supertest category test requires the local PostgreSQL (Docker) to be running and seeded via `npm run prisma:seed`.
- The current tests confirm that the frontend, backend, Vitest, React Testing Library, and Supertest setup are working, and that the health check and category list features behave correctly.
