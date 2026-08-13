# Lab 1 Tests

These are the automated tests currently included for the Issue 1 project foundation and Issue 2 health check. Category-list tests will be added later in their own feature Issues.

## Test Summary

| Test ID | Test File | Tool | Test Description | Expected Result |
| --- | --- | --- | --- | --- |
| API-FOUNDATION-01 | `tests/lab-01/api-foundation.server.test.ts` | Vitest + Supertest | Express app starts and returns a JSON 404 response for an unknown route. | Response status is `404` and body is `{ "message": "Route not found" }`. |
| API-HEALTH-01 | `tests/lab-01/api-health.server.test.ts` | Vitest + Supertest | `GET /api/health` returns the API health status. | Response status is `200` and body is `{ "status": "ok", "service": "TokTickIT API" }`. |
| UI-FOUNDATION-01 | `tests/lab-01/ui-foundation.test.tsx` | Vitest + React Testing Library | TokTickIT heading renders on the frontend. | The heading `TokTickIT IT Service Desk` is visible. |
| UI-FOUNDATION-02 | `tests/lab-01/ui-foundation.test.tsx` | Vitest + React Testing Library | The Check System button renders with Bootstrap classes. | The button is visible and has `btn` and `btn-primary` classes. |
| UI-HEALTH-01 | `tests/lab-01/ui-health.test.tsx` | Vitest + React Testing Library | Clicking Check System calls the health API and shows the loading state, then the online status. | A loading state appears, the API is called, and `System Status: Online` is shown. |
| UI-HEALTH-02 | `tests/lab-01/ui-health.test.tsx` | Vitest + React Testing Library | Clicking Check System when the backend is unavailable shows an error message. | An error message "Unable to reach the backend" is shown. |

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

The README test commands were run successfully on the `feature/2-health-check` branch.

```text
npm test
Test Files  4 passed (4)
Tests       6 passed (6)

npm run test:client
Test Files  2 passed (2)
Tests       4 passed (4)

npm run test:server
Test Files  2 passed (2)
Tests       2 passed (2)
```

Live endpoint verification:

```text
GET http://localhost:3000/api/health
{"status":"ok","service":"TokTickIT API"}
HTTP 200
```

## Notes

- `GET /api/categories` tests are not included yet because the Category model, seed, and API belong to Issues 3 and 4.
- The current tests confirm that the frontend, backend, Vitest, React Testing Library, and Supertest setup are working, and that the Issue 2 health check endpoint and UI states behave correctly.
