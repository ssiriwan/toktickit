# Lab 2 Test Plan and Results

## 1. Test Strategy

Lab 2 tests are organized into four levels: unit tests, API (integration) tests, UI component tests, and end-to-end tests. Each Acceptance Criterion maps to at least one planned test. Tests cover happy paths, validation failures, ownership enforcement, boundary conditions, loading states, empty states, error states, responsive behavior, and attachment lifecycle.

- **Unit tests**: Ticket Number generation, validation logic, priority enum values
- **API tests**: All 8 endpoints with success, validation, ownership, not-found, and error cases
- **UI component tests**: Form rendering, validation messages, loading/empty/error states, responsive layout, button states
- **E2E tests**: Complete user flows across multiple screens

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| --- | --- | --- | --- | --- | --- | --- |
| API-REQ-01 | API | AC-02 | GET /api/requesters returns only active requesters | 200 with active requesters only; inactive excluded | `server/tests/lab-02/requesters.api.test.ts` | |
| API-REQ-02 | API | AC-02 | GET /api/requesters handles empty result | 200 with empty array when no active requesters | `server/tests/lab-02/requesters.api.test.ts` | |
| API-REQ-03 | API | AC-02 | GET /api/requesters handles DB failure | 500 with safe error message | `server/tests/lab-02/requesters.api.test.ts` | |
| API-CAT-01 | API | FR-08 | GET /api/categories returns seeded categories | 200 with 4 categories | `server/tests/lab-02/requesters.api.test.ts` | |
| API-SYS-01 | API | FR-08 | GET /api/related-systems returns seeded systems | 200 with 6+ systems | `server/tests/lab-02/requesters.api.test.ts` | |
| API-TICKET-01 | API | AC-01 | POST /api/tickets creates a valid ticket | 201 with ticketNumber, status NEW, correct requester | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-TICKET-02 | API | AC-04 | POST /api/tickets rejects missing summary | 400 with field-level error for summary | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-TICKET-03 | API | AC-04 | POST /api/tickets rejects empty description | 400 with field-level error for description | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-TICKET-04 | API | BR-08 | POST /api/tickets rejects invalid categoryId | 400 with error for invalid category | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-TICKET-05 | API | BR-09 | POST /api/tickets rejects invalid relatedSystemId | 400 with error for invalid system | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-TICKET-06 | API | BR-10 | POST /api/tickets rejects invalid priority | 400 with error for invalid priority | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-TICKET-07 | API | BR-03 | POST /api/tickets rejects inactive requester | 404 with error for inactive requester | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-TICKET-08 | API | BR-17 | POST /api/tickets trims whitespace from summary | Summary is trimmed before save | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-TICKET-09 | API | BR-01 | Ticket numbers are unique | Two tickets get different ticket numbers | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-TICKET-10 | API | BR-02 | New ticket has status NEW | currentStatus is NEW in response | `server/tests/lab-02/create-ticket.api.test.ts` | |
| API-LIST-01 | API | AC-05 | GET /api/tickets returns requester's tickets | 200 with tickets for the specified requester | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-LIST-02 | API | AC-06 | GET /api/tickets filters by requester | Other requester's tickets are not returned | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-LIST-03 | API | AC-10 | GET /api/tickets search by summary | Only matching tickets returned | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-LIST-04 | API | AC-11 | GET /api/tickets filter by category | Only tickets matching category returned | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-LIST-05 | API | AC-11 | GET /api/tickets filter by priority | Only tickets matching priority returned | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-LIST-06 | API | FR-13 | GET /api/tickets sort by ticketDate desc | Tickets ordered newest first | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-LIST-07 | API | FR-14 | GET /api/tickets pagination | Correct page subset returned with pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-LIST-08 | API | AC-17 | GET /api/tickets empty list | 200 with empty array and totalItems 0 | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-LIST-09 | API | FR-11 | GET /api/tickets search in description | Matching tickets returned from description field | `server/tests/lab-02/my-tickets.api.test.ts` | |
| API-DETAIL-01 | API | AC-14 | GET /api/tickets/:id returns owned ticket | 200 with full ticket data and attachments | `server/tests/lab-02/ticket-detail.api.test.ts` | |
| API-DETAIL-02 | API | AC-03 | GET /api/tickets/:id rejects cross-requester access | 403 when requesterId does not match ticket owner | `server/tests/lab-02/ticket-detail.api.test.ts` | |
| API-DETAIL-03 | API | AC-03 | GET /api/tickets/:id returns 404 for non-existent | 404 with error message | `server/tests/lab-02/ticket-detail.api.test.ts` | |
| API-ATT-01 | API | AC-08 | POST /api/tickets/:id/attachments uploads valid file | 201 with attachment metadata | `server/tests/lab-02/attachments.api.test.ts` | |
| API-ATT-02 | API | AC-08 | POST /api/tickets/:id/attachments rejects invalid type | 400 with file type error | `server/tests/lab-02/attachments.api.test.ts` | |
| API-ATT-03 | API | AC-07 | POST /api/tickets/:id/attachments rejects 6th file | 400 with max attachments error | `server/tests/lab-02/attachments.api.test.ts` | |
| API-ATT-04 | API | AC-09 | PATCH /api/attachments/:id/remove soft-removes | 200 with isRemoved true and reason | `server/tests/lab-02/attachments.api.test.ts` | |
| API-ATT-05 | API | BR-29 | PATCH /api/attachments/:id/remove requires reason | 400 when reason is empty | `server/tests/lab-02/attachments.api.test.ts` | |
| API-ATT-06 | API | AC-09 | GET /api/attachments/:id/download blocked after removal | 410 for removed attachment | `server/tests/lab-02/attachments.api.test.ts` | |
| API-ATT-07 | API | AC-03 | Attachment operations reject cross-requester | 403 when requester does not own ticket | `server/tests/lab-02/attachments.api.test.ts` | |
| API-ATT-08 | API | AC-09 | Soft-removed attachment metadata retained | Metadata visible, download blocked | `server/tests/lab-02/attachments.api.test.ts` | |
| UI-SELECT-01 | UI | AC-02 | Requester Selection screen renders dropdown | Dropdown with active requesters displayed | `client/src/lab-02/tests/RequesterSelection.test.tsx` | |
| UI-SELECT-02 | UI | BR-22 | Requester Selection empty state | Empty message when no active requesters | `client/src/lab-02/tests/RequesterSelection.test.tsx` | |
| UI-SELECT-03 | UI | BR-23 | Requester Selection error state | Error message on API failure | `client/src/lab-02/tests/RequesterSelection.test.tsx` | |
| UI-SELECT-04 | UI | BR-02 | Continue button disabled until selection | Button disabled when no requester selected | `client/src/lab-02/tests/RequesterSelection.test.tsx` | |
| UI-CREATE-01 | UI | AC-04 | Create Ticket form renders all fields | All required fields visible and correctly labeled | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-CREATE-02 | UI | AC-04 | Required fields show red asterisk | Asterisks visible on required fields | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-CREATE-03 | UI | AC-04 | Read-only fields have distinct styling | Ticket Number, Date, Requester are read-only styled | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-CREATE-04 | UI | AC-04 | Category dropdown loads from API | Categories populated in dropdown | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-CREATE-05 | UI | AC-04 | Priority dropdown shows 4 options | LOW, MEDIUM, HIGH, URGENT visible | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-CREATE-06 | UI | AC-04 | Submit button shows busy state | Button disabled and shows spinner during submit | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-CREATE-07 | UI | AC-04 | Success state shows ticket number | Official ticket number displayed after creation | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-CREATE-08 | UI | AC-04 | Validation errors appear below fields | Field-level messages shown on invalid submit | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-CREATE-09 | UI | AC-04 | Form values preserved after error | Values retained when API fails | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-CREATE-10 | UI | AC-04 | Loading state for reference data | Spinner shown while categories/systems load | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-CREATE-11 | UI | AC-04 | Error state for reference data | Error message when categories fail to load | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-LIST-01 | UI | AC-05 | My Tickets shows ticket list | Tickets displayed in table/card format | `client/src/lab-02/tests/MyTickets.test.tsx` | |
| UI-LIST-02 | UI | AC-06 | Switching requester updates list | Ticket list changes when requester changes | `client/src/lab-02/tests/MyTickets.test.tsx` | |
| UI-LIST-03 | UI | AC-10 | Search input filters tickets | Matching tickets shown, others hidden | `client/src/lab-02/tests/MyTickets.test.tsx` | |
| UI-LIST-04 | UI | AC-11 | Filter controls work correctly | Tickets filtered by category/priority/status | `client/src/lab-02/tests/MyTickets.test.tsx` | |
| UI-LIST-05 | UI | FR-13 | Sort dropdown changes order | Tickets reordered by selection | `client/src/lab-02/tests/MyTickets.test.tsx` | |
| UI-LIST-06 | UI | FR-14 | Pagination controls navigate pages | Page 2 shows different subset | `client/src/lab-02/tests/MyTickets.test.tsx` | |
| UI-LIST-07 | UI | AC-17 | Empty state for no tickets | Empty message when requester has no tickets | `client/src/lab-02/tests/MyTickets.test.tsx` | |
| UI-LIST-08 | UI | AC-18 | No-results state for search/filter | No-results message when no matches | `client/src/lab-02/tests/MyTickets.test.tsx` | |
| UI-LIST-09 | UI | AC-05 | Loading state for ticket list | Spinner shown while loading | `client/src/lab-02/tests/MyTickets.test.tsx` | |
| UI-LIST-10 | UI | AC-13 | Error state for failed request | Error message shown on API failure | `client/src/lab-02/tests/MyTickets.test.tsx` | |
| UI-DETAIL-01 | UI | AC-14 | Ticket Detail shows read-only fields | All fields displayed, none editable | `client/src/lab-02/tests/RequesterTicketDetail.test.tsx` | |
| UI-DETAIL-02 | UI | AC-14 | Attachment section visible | Upload, download, remove actions available | `client/src/lab-02/tests/RequesterTicketDetail.test.tsx` | |
| UI-DETAIL-03 | UI | AC-09 | Removed attachment shows metadata | Filename visible, download blocked | `client/src/lab-02/tests/RequesterTicketDetail.test.tsx` | |
| UI-DETAIL-04 | UI | AC-09 | Soft-remove requires reason | Reason input shown before confirmation | `client/src/lab-02/tests/RequesterTicketDetail.test.tsx` | |
| UI-ATTACH-01 | UI | AC-08 | File type validation on selection | Error shown for non-permitted file types | `client/src/lab-02/tests/AttachmentSection.test.tsx` | |
| UI-ATTACH-02 | UI | AC-07 | Max attachment limit reached | Upload blocked when 5 active attachments | `client/src/lab-02/tests/AttachmentSection.test.tsx` | |
| UI-ATTACH-03 | UI | AC-09 | Download active attachment | File download initiated | `client/src/lab-02/tests/AttachmentSection.test.tsx` | |
| UI-RESP-01 | UI | AC-15 | Desktop layout multi-column | Form uses multi-column layout at >=992px | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-RESP-02 | UI | AC-16 | Mobile layout stacked fields | Fields stack vertically at <768px | `client/src/lab-02/tests/CreateTicket.test.tsx` | |
| UI-RESP-03 | UI | AC-16 | No horizontal scroll on mobile | No overflow on small viewports | `client/src/lab-02/tests/MyTickets.test.tsx` | |
| E2E-01 | E2E | AC-01, AC-05 | Complete ticket creation flow | Select requester, create ticket, find in My Tickets | `e2e/lab-02/requester-ticket-flow.spec.ts` | |
| E2E-02 | E2E | AC-06 | Requester switching flow | Switch requester, verify data isolation | `e2e/lab-02/requester-ticket-flow.spec.ts` | |
| E2E-03 | E2E | AC-09 | Attachment lifecycle flow | Upload, view, soft-remove attachment on ticket | `e2e/lab-02/requester-ticket-flow.spec.ts` | |
| E2E-04 | E2E | AC-03 | Cross-requester access prevention | Verify ticket isolation between requesters | `e2e/lab-02/requester-ticket-flow.spec.ts` | |

## 3. Acceptance-Criterion Traceability

| AC | Tests |
| --- | --- |
| AC-01 | API-TICKET-01, API-TICKET-10, E2E-01 |
| AC-02 | API-REQ-01, API-REQ-02, UI-SELECT-01, UI-SELECT-02 |
| AC-03 | API-DETAIL-02, API-ATT-07, E2E-04 |
| AC-04 | API-TICKET-02 to API-TICKET-08, UI-CREATE-01 to UI-CREATE-11 |
| AC-05 | API-LIST-01, UI-LIST-01, E2E-01 |
| AC-06 | API-LIST-02, UI-LIST-02, E2E-02 |
| AC-07 | API-ATT-03, UI-ATTACH-02 |
| AC-08 | API-ATT-02, UI-ATTACH-01 |
| AC-09 | API-ATT-04, API-ATT-06, API-ATT-08, UI-DETAIL-03, UI-DETAIL-04, UI-ATTACH-03, E2E-03 |
| AC-10 | API-LIST-03, API-LIST-09, UI-LIST-03 |
| AC-11 | API-LIST-04, API-LIST-05, UI-LIST-04 |
| AC-12 | API-LIST-07, UI-LIST-06 |
| AC-13 | API-REQ-03, UI-LIST-10 |
| AC-14 | API-DETAIL-01, API-DETAIL-03, UI-DETAIL-01, UI-DETAIL-02 |
| AC-15 | UI-RESP-01 |
| AC-16 | UI-RESP-02, UI-RESP-03 |
| AC-17 | API-LIST-08, UI-LIST-07 |
| AC-18 | UI-LIST-08 |
| AC-19 | UI-CREATE-06 |
| AC-20 | UI-CREATE-07 |

## 4. Responsive and Visual Checklist

| Check | Desktop (>=992px) | Tablet (768-991px) | Mobile (<768px) |
| --- | --- | --- | --- |
| Zen Green colors applied | | | |
| Editable vs read-only fields distinct | | | |
| Validation messages below fields | | | |
| Button hierarchy correct | | | |
| No clipping or overlap | | | |
| No horizontal overflow | | | |
| Labels not truncated | | | |
| Touch-friendly targets on mobile | | | |
| Navigation responsive | | | |
| Ticket list table/card responsive | | | |

## 5. Test Commands

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

Run E2E tests:
```bash
npx playwright test e2e/lab-02/
```

## 6. Final Results

Pending implementation. To be updated after all tests pass on the main branch.

## 7. Known Limitations or Deferred Tests

- E2E tests require Playwright browser binaries installed
- Visual regression testing (screenshot comparison) deferred to manual inspection
- Performance/load testing not in scope for Lab 2
- Accessibility audit (WCAG) to be performed manually during visual inspection
