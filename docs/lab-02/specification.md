# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Deliver a complete Requester-facing IT support ticketing MVP that allows a selected Development Requester to create tickets with attachments, view and manage their own tickets through My Tickets, and inspect ticket details with attachment lifecycle management. Establish the Zen Green Theme and reusable UI component conventions for future labs.

## 2. Stakeholder Request Interpretation

The IT department needs a professional, responsive ticketing interface for end users (Requesters). A Requester must be able to:

- Describe a problem with category and system classification
- Indicate priority and attach supporting evidence
- Submit a ticket and receive an official Ticket Number
- Locate tickets in My Tickets with search, filter, and sort capabilities
- Open Ticket Detail to inspect information and manage permitted attachments

Because real authentication will be introduced in Lab 3, a temporary Development Requester Selection screen serves as a testing mechanism to simulate multi-user ownership. The selected Requester becomes the current session context for all ticket operations.

A consistent Zen Green Theme must be established with reusable form, list, badge, validation, loading, empty, error, and responsive-layout conventions.

## 3. Scope

### Included

- Development Requester Selection screen (temporary login substitute)
- Create Ticket screen with full form, validation, and attachment upload
- My Tickets screen with search, filters, sorting, pagination, and empty/no-results states
- Requester Ticket Detail screen (read-only view with attachment management)
- Attachment lifecycle: upload, download, soft-removal with reason, metadata retention
- Zen Green Theme UI specification and responsive design (desktop, tablet, mobile)
- PostgreSQL database with Prisma ORM: Requester, Ticket, Attachment, Category, RelatedSystem
- Seed data: 4 categories, 6+ related systems, 4+ active requesters, 1 inactive requester
- REST API endpoints for all ticket and attachment operations
- Ownership enforcement: Requester A cannot access Requester B's tickets
- Spec-driven development documentation (specification.md, tests.md, ui-spec.md, api-spec.md)
- Automated tests: unit, API, UI, responsive, and E2E
- GitHub workflow: Issues, feature branches, PRs, staging branch, peer review

### Excluded

- Authentication and security: login, logout, passwords, sessions, tokens, real role-based authorization
- IT Staff workflow: dashboard, queue, claiming, reassigning, IT Priority changes
- Ticket collaboration: Public Comments, Internal Notes, Actions Taken
- Ticket lifecycle beyond creation: status changes beyond New, resolution, closing, reopening, cancelling
- Administration functions: user management, role management, reference data administration

## 4. Functional Requirements

- **FR-01** The system shall display a Development Requester Selection screen on first access, loading active Requesters from the database.
- **FR-02** The system shall allow the user to select one Development Requester as the current session context.
- **FR-03** The system shall display the selected Requester name in the application shell and provide a Change Requester action.
- **FR-04** The system shall provide a Create Ticket screen with fields: Ticket Number (read-only, generated), Ticket Date (read-only, auto-set), Requester (read-only, from selection), Category (dropdown), Related System (dropdown), Ticket Summary (text input), Requested Priority (dropdown), Description (textarea), and Attachments (file upload).
- **FR-05** The system shall validate all required fields on the client side before submission and display field-level error messages.
- **FR-06** The system shall validate ticket data on the server side and return appropriate error responses.
- **FR-07** The system shall generate a unique official Ticket Number upon successful ticket creation.
- **FR-08** The system shall allow attachment upload with file type validation (JPG/JPEG, PNG, WEBP, PDF) and size validation (max 5 MB per file).
- **FR-09** The system shall enforce a maximum of 5 active attachments per ticket.
- **FR-10** The system shall provide a My Tickets screen showing only tickets owned by the selected Requester.
- **FR-11** The system shall support search by ticket summary and description text on the My Tickets screen.
- **FR-12** The system shall support filtering by Category, Related System, and Current Status on the My Tickets screen.
- **FR-13** The system shall support sorting by Ticket Date, Last Updated, and Priority on the My Tickets screen.
- **FR-14** The system shall support pagination with configurable page size on the My Tickets screen.
- **FR-15** The system shall provide a Ticket Detail screen showing all ticket information in read-only mode.
- **FR-16** The system shall allow adding a permitted attachment to an existing ticket from the Ticket Detail screen.
- **FR-17** The system shall allow downloading an active attachment from the Ticket Detail screen.
- **FR-18** The system shall allow soft-removing an attachment with a required reason, retaining metadata but blocking download.
- **FR-19** The system shall enforce ownership checks on all ticket and attachment API operations.
- **FR-20** The system shall display loading, empty, no-results, and error states for all screens.
- **FR-21** The system shall provide responsive layouts for desktop (>=992px), tablet (768-991px), and mobile (<768px).
- **FR-22** The system shall establish Zen Green Theme conventions reusable across future screens.

## 5. Business Rules

- **BR-01** The official Ticket Number is generated by the backend and must be unique across all tickets.
- **BR-02** A new Ticket begins with Current Status set to New.
- **BR-03** Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing only and is not authentication.
- **BR-04** The inactive Development Requester must not appear in the selector dropdown.
- **BR-05** When a different Requester is selected via Change Requester, all ticket data is reloaded for the new Requester context.
- **BR-06** Ticket Summary is required and must not be empty after trimming. Maximum length: 150 characters.
- **BR-07** Description is required and must not be empty after trimming. Maximum length: 2000 characters.
- **BR-08** Category is required and must match an active Category from the database.
- **BR-09** Related System is required and must match an active Related System from the database.
- **BR-10** Requested Priority is required and must be one of: LOW, MEDIUM, HIGH, URGENT.
- **BR-11** Attachment file type must be one of: JPG, JPEG, PNG, WEBP, PDF. Other types are rejected with a clear error message.
- **BR-12** Attachment file size must not exceed 5 MB per file. Oversized files are rejected with a clear error message.
- **BR-13** A ticket may have at most 5 active (non-removed) attachments. Upload is blocked when the limit is reached.
- **BR-14** Soft-removed attachments retain their metadata (filename, type, size, upload date, removal reason) but cannot be downloaded or previewed.
- **BR-15** Only the ticket owner (selected Requester) may view, download, or manage attachments on their tickets.
- **BR-16** Direct API access to a Ticket or Attachment belonging to a different Requester is rejected with a 403 or 404 response.
- **BR-17** All form input values are trimmed of leading and trailing whitespace before validation and submission.
- **BR-18** Duplicate form submissions are prevented by disabling the Submit button and showing a busy state during processing.
- **BR-19** After a failed submission, form values are preserved and displayed to the user for correction.
- **BR-20** The Ticket Date is set automatically to the server timestamp at creation and is not user-editable.
- **BR-21** The Requester field on the Create Ticket form is populated from the selected Development Requester and is read-only.
- **BR-22** When no active Requesters exist, the selector displays an appropriate empty state message.
- **BR-23** When the API fails to load Requesters, categories, or systems, a safe error state is displayed without crashing.
- **BR-24** Search is case-insensitive and matches against Ticket Summary and Description fields.
- **BR-25** Default sort order for My Tickets is by Ticket Date descending (newest first).
- **BR-26** Pagination defaults to page 1 with a page size of 10, configurable by the user.
- **BR-27** Empty state is shown when the selected Requester has no tickets. No-results state is shown when search/filter returns no matches.
- **BR-28** The Ticket Detail screen fields are all read-only for the Requester; no editing is permitted in Lab 2.
- **BR-29** Removal of an attachment requires a non-empty reason text before confirmation.

## 6. UI Specification Summary

### Zen Green Theme Tokens

| Token | Value | Usage |
|---|---|---|
| Primary green | #006B3C | App header, primary actions, strong emphasis |
| Secondary green | #0B7A46 | Active tabs, focus accents, links, hover states |
| Pale green | #EAF6EF | Selected items, success backgrounds, subtle emphasis |
| Page background | #F5F7F6 | Page body background |
| Surface / cards | White (#FFFFFF) with subtle border and shadow | Cards, form containers |
| Text | Dark charcoal-green (#1A2E1A) | Body text, not pure black |
| Editable field | White background, neutral border | Input fields, dropdowns |
| Read-only field | Soft gray-green or warm ivory shading | Display-only fields |
| Error | Dark red text and border | Validation errors, inline below field |
| Warning | Amber callout or badge | Warning states |
| Success | Green confirmation text | Success messages |

### Application Shell

- TokTickIT branding in header
- Navigation: My Tickets, Create Ticket
- Selected Requester name displayed with Change Requester action
- Active page indication (highlighted nav item)
- Responsive mobile navigation (hamburger menu or stacked)

### Create Ticket Screen

- System-generated fields at top (Ticket Number, Ticket Date, Requester)
- Classification fields grouped (Category, Related System, Priority)
- Summary and Description with sufficient width
- Attachments section below main fields
- Primary Submit action at bottom
- Field-level validation messages below each field
- Required fields marked with red asterisk

### My Tickets Screen

- Search bar at top
- Filter controls (Category, Status, Priority)
- Sort dropdown
- Ticket list with columns: Ticket Number, Summary, Category, Status, Priority, Last Updated
- Desktop: table layout; Mobile: card layout
- Pagination controls at bottom
- Create Ticket action button
- Loading spinner, empty state, no-results state, error state

### Ticket Detail Screen

- Read-only ticket information header
- Attachment section with upload, download, and remove actions
- Attachment states: active, uploading, invalid, removed, unavailable
- Back navigation to My Tickets

### Responsive Breakpoints

| Viewport | Behavior |
|---|---|
| Desktop >= 992px | Multi-column layout, content centered with max-width |
| Tablet 768-991px | Two-column where practical, adequate field widths |
| Mobile < 768px | Fields stack vertically, touch-friendly buttons, no horizontal scroll |

## 7. Data Changes

### New Prisma Models

#### RequesterUser

| Field | Type | Constraints |
|---|---|---|
| id | Int | @id @default(autoincrement()) |
| name | String | required |
| email | String | @unique, required |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

#### RelatedSystem

| Field | Type | Constraints |
|---|---|---|
| id | Int | @id @default(autoincrement()) |
| name | String | @unique, required |
| isActive | Boolean | @default(true) |
| createdAt | DateTime | @default(now()) |

#### Ticket

| Field | Type | Constraints |
|---|---|---|
| id | Int | @id @default(autoincrement()) |
| ticketNumber | String | @unique, required (generated format: TK-YYYYMMDD-XXXX) |
| summary | String | required, max 150 |
| description | String | required, max 2000 |
| currentStatus | TicketStatus | @default(NEW) |
| requestedPriority | Priority | required |
| ticketDate | DateTime | @default(now()) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |
| requesterId | Int | required, FK to RequesterUser |
| categoryId | Int | required, FK to Category |
| relatedSystemId | Int | required, FK to RelatedSystem |

#### Attachment

| Field | Type | Constraints |
|---|---|---|
| id | Int | @id @default(autoincrement()) |
| filename | String | required (original filename) |
| storedFilename | String | @unique, required (safe storage name) |
| mimeType | String | required |
| fileSize | Int | required (bytes) |
| ticketId | Int | required, FK to Ticket |
| isRemoved | Boolean | @default(false) |
| removalReason | String? | nullable |
| removedAt | DateTime? | nullable |
| createdAt | DateTime | @default(now()) |

### Modified Models

#### Category (existing)

Add relation: `tickets Ticket[]`

### Enums

```prisma
enum TicketStatus {
  NEW
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

### Relationships

- RequesterUser 1 --* Ticket (one Requester owns many Tickets)
- Ticket *--1 RequesterUser (one Ticket belongs to one Requester)
- Ticket 1--* Attachment (one Ticket has many Attachments)
- Category 1--* Ticket (one Category used by many Tickets)
- RelatedSystem 1--* Ticket (one Related System used by many Tickets)

### Indexes

- Ticket: composite index on (requesterId, createdAt) for My Tickets list query
- Ticket: index on ticketNumber for lookup
- Ticket: index on currentStatus for filtering
- Attachment: index on ticketId for ticket detail attachment list

### Seed Data

- 4 Categories: Account and Access, Hardware, Software, Network
- 6+ Related Systems: Email, Campus Wi-Fi, VPN, LEB2 App, Grade Submission App, Printer, Corporate Laptop
- 4+ active Development Requesters with realistic names and emails
- 1 inactive Development Requester (isActive = false)

## 8. API Contract

### Base URL

`http://localhost:3000/api`

### Endpoints

#### GET /api/requesters

Retrieve active Development Requesters.

- **Response 200**: `[{ id, name, email }]`
- **Response 500**: `{ error: { code: "INTERNAL_ERROR", message: "Failed to load requesters" } }`

#### GET /api/categories

Retrieve active Categories. (Existing endpoint, unchanged.)

- **Response 200**: `[{ id, name }]`

#### GET /api/related-systems

Retrieve active Related Systems.

- **Response 200**: `[{ id, name }]`

#### POST /api/tickets

Create a new Ticket.

- **Request Body**:
  ```json
  {
    "requesterId": 1,
    "summary": "Laptop battery drains quickly",
    "description": "Detailed description of the issue...",
    "categoryId": 2,
    "relatedSystemId": 1,
    "requestedPriority": "MEDIUM"
  }
  ```
- **Response 201**: `{ id, ticketNumber, summary, description, currentStatus, requestedPriority, ticketDate, createdAt, requester: { id, name }, category: { id, name }, relatedSystem: { id, name } }`
- **Response 400**: `{ error: { code: "VALIDATION_ERROR", message, details: [{ field, message }] } }`
- **Response 404**: `{ error: { code: "NOT_FOUND", message: "Requester not found" } }`
- **Response 500**: `{ error: { code: "INTERNAL_ERROR", message: "Failed to create ticket" } }`

#### GET /api/tickets

Retrieve paginated tickets for the selected Requester.

- **Query Parameters**:
  - `requesterId` (required): Selected Requester ID
  - `search` (optional): Text search in summary and description
  - `categoryId` (optional): Filter by category
  - `relatedSystemId` (optional): Filter by related system
  - `status` (optional): Filter by current status
  - `priority` (optional): Filter by requested priority
  - `sort` (optional): Sort field (ticketDate, updatedAt, requestedPriority). Default: ticketDate
  - `order` (optional): asc or desc. Default: desc
  - `page` (optional): Page number. Default: 1
  - `pageSize` (optional): Items per page. Default: 10
- **Response 200**:
  ```json
  {
    "tickets": [{ id, ticketNumber, summary, currentStatus, requestedPriority, ticketDate, updatedAt, category: { id, name }, relatedSystem: { id, name } }],
    "pagination": { page, pageSize, totalItems, totalPages }
  }
  ```
- **Response 400**: `{ error: { code: "INVALID_QUERY", message: "Invalid query parameters" } }`
- **Response 500**: `{ error: { code: "INTERNAL_ERROR", message: "Failed to load tickets" } }`

#### GET /api/tickets/:id

Retrieve a single owned Ticket with attachments.

- **Query Parameter**: `requesterId` (required for ownership check)
- **Response 200**:
  ```json
  {
    "id", "ticketNumber", "summary", "description", "currentStatus",
    "requestedPriority", "ticketDate", "createdAt", "updatedAt",
    "requester": { "id", "name", "email" },
    "category": { "id", "name" },
    "relatedSystem": { "id", "name" },
    "attachments": [
      { "id", "filename", "mimeType", "fileSize", "isRemoved", "createdAt" }
    ]
  }
  ```
- **Response 403**: `{ error: { code: "ACCESS_DENIED", message: "Access denied" } }` (ownership violation)
- **Response 404**: `{ error: { code: "NOT_FOUND", message: "Ticket not found" } }`
- **Response 500**: `{ error: { code: "INTERNAL_ERROR", message: "Failed to load ticket" } }`

#### POST /api/tickets/:id/attachments

Upload an attachment to a ticket.

- **Query Parameter**: `requesterId` (required for ownership check)
- **Request**: `multipart/form-data` with field `file`
- **Response 201**: `{ id, filename, mimeType, fileSize, isRemoved: false, createdAt }`
- **Response 400**: `{ error: { code: "INVALID_FILE_TYPE" | "FILE_TOO_LARGE" | "MAX_ATTACHMENTS", message } }`
- **Response 403**: `{ error: { code: "ACCESS_DENIED", message: "Access denied" } }`
- **Response 404**: `{ error: { code: "NOT_FOUND", message: "Ticket not found" } }`
- **Response 500**: `{ error: { code: "INTERNAL_ERROR", message: "Failed to upload attachment" } }`

#### GET /api/attachments/:id/download

Download an active attachment.

- **Query Parameter**: `requesterId` (required for ownership check)
- **Response 200**: File stream with appropriate Content-Type and Content-Disposition headers
- **Response 403**: `{ error: { code: "ACCESS_DENIED", message: "Access denied" } }`
- **Response 404**: `{ error: { code: "NOT_FOUND", message: "Attachment not found" } }`
- **Response 410**: `{ error: { code: "REMOVED", message: "Attachment has been removed" } }`
- **Response 500**: `{ error: { code: "INTERNAL_ERROR", message: "Failed to download attachment" } }`

#### PATCH /api/attachments/:id/remove

Soft-remove an attachment.

- **Query Parameter**: `requesterId` (required for ownership check)
- **Request Body**: `{ "reason": "No longer needed" }`
- **Response 200**: `{ id, filename, isRemoved: true, removalReason, removedAt }`
- **Response 400**: `{ error: { code: "VALIDATION_ERROR", message, details: [{ field: "reason", message }] } }`
- **Response 403**: `{ error: { code: "ACCESS_DENIED", message: "Access denied" } }`
- **Response 404**: `{ error: { code: "NOT_FOUND", message: "Attachment not found" } }`
- **Response 500**: `{ error: { code: "INTERNAL_ERROR", message: "Failed to remove attachment" } }`

### HTTP Status Codes Summary

| Code | Use |
|---|---|
| 200 | Successful retrieval or update |
| 201 | Resource created successfully |
| 400 | Invalid input or validation failure |
| 403 | Ownership violation |
| 404 | Resource not found |
| 410 | Attachment has been soft-removed |
| 500 | Unexpected server error |

## 9. Acceptance Criteria

- **AC-01** Given valid ticket data, when the Requester submits the Create Ticket form, then one Ticket is saved with status New and the official Ticket Number is displayed.
- **AC-02** Given no Development Requester is selected, when the user attempts to navigate to My Tickets or Create Ticket, then the Requester Selection screen is shown.
- **AC-03** Given Requester B is selected, when a Ticket belonging to Requester A is requested via the API, then the ticket data is not returned and an access denied response is issued.
- **AC-04** Given the Create Ticket form with empty Summary, when the Requester clicks Submit, then a field-level validation message appears below the Summary field and the API is not called.
- **AC-05** Given a valid ticket is created with attachments, when the Requester opens My Tickets, then the new ticket appears in the list sorted by Ticket Date descending.
- **AC-06** Given Requester A has tickets, when the user switches to Requester B via Change Requester, then Requester A's tickets disappear and Requester B's tickets (or empty state) are shown.
- **AC-07** Given a ticket with 5 active attachments, when the Requester attempts to upload a 6th attachment, then the upload is blocked with a message indicating the limit is reached.
- **AC-08** Given an attachment of type .exe, when the Requester selects it for upload, then a validation error is shown indicating the file type is not permitted.
- **AC-09** Given a ticket with an active attachment, when the Requester soft-removes it with a reason, then the attachment metadata is retained, marked as removed, and download is blocked.
- **AC-10** Given a search term, when the Requester enters it in the My Tickets search bar, then only tickets matching the term in summary or description are displayed.
- **AC-11** Given filters for Category and Priority, when the Requester applies them, then only tickets matching both criteria are shown.
- **AC-12** Given the My Tickets list with multiple pages, when the Requester navigates to page 2, then the correct subset of tickets is displayed.
- **AC-13** Given the backend is stopped or returns an error, when the Requester is on any screen, then a safe error state is displayed with form values preserved (for Create Ticket).
- **AC-14** Given the Requester opens a Ticket Detail screen, then all ticket fields are displayed as read-only and attachment actions (add, download, soft-remove) are available.
- **AC-15** Given a desktop viewport (>=992px), when any screen is rendered, then the layout follows the multi-column Zen Green Theme specification without clipping or overflow.
- **AC-16** Given a mobile viewport (<768px), when any screen is rendered, then fields stack vertically, buttons are touch-friendly, and no horizontal scrolling occurs.
- **AC-17** Given an empty ticket list for the selected Requester, when My Tickets loads, then an appropriate empty state message is displayed.
- **AC-18** Given a search or filter that returns no matches, when the results are computed, then a no-results state message is displayed.
- **AC-19** Given the Submit button is clicked, when the request is in progress, then the button shows a busy state and is disabled until the request completes.
- **AC-20** Given a ticket is created, when the success state is shown, then the official Ticket Number from the backend is displayed along with a next-action prompt.

## 10. Definition of Done

### Product Completion

- [ ] All 22 functional requirements are implemented and working
- [ ] All 29 business rules are enforced in the code
- [ ] All 20 acceptance criteria have corresponding passing automated tests
- [ ] Database schema matches the specification with all models, relationships, and indexes
- [ ] All API endpoints return correct responses for success, validation, ownership, not-found, and error cases
- [ ] Zen Green Theme is applied consistently across all screens
- [ ] Responsive layouts work correctly at desktop, tablet, and mobile viewports
- [ ] Loading, empty, no-results, and error states are handled on every screen
- [ ] All unit, API, UI, and E2E tests pass from the main branch
- [ ] No required test is skipped, disabled, or commented out
- [ ] README setup and test instructions are current
- [ ] Seed data runs idempotently without creating duplicates

### Course Delivery

- [ ] GitHub Issues created and decomposed for all sprint work
- [ ] Feature branches used for each Issue with PRs through staging workflow
- [ ] Peer review completed with reviewer.md documentation
- [ ] All required docs exist in docs/lab-02/: specification.md, tests.md, ui-spec.md, api-spec.md, reviewer.md, ai-use.md
- [ ] Test files exist at correct paths: server/tests/lab-02/, client/.../lab-02/tests/, e2e/lab-02/
- [ ] Screenshots captured in artifacts/lab-02/screenshots/
- [ ] Final submission PDF follows Answer Part 1 through Part 9 format

## 11. Assumptions and Decisions

- **Ticket Number Format**: TK-YYYYMMDD-XXXX where XXXX is a zero-padded sequential counter per day (e.g., TK-20260831-0001). This provides human-readable, date-ordered ticket numbers with daily reset of the counter.
- **File Storage**: Attachments are stored on the local filesystem under a `uploads/` directory relative to the server root. A future lab may migrate to cloud storage.
- **Pagination**: Server-side pagination is used. The client sends page and pageSize parameters and receives totalItems and totalPages in the response.
- **Search**: Search is performed using PostgreSQL ILIKE for case-insensitive matching against summary and description fields. Full-text search may be added in a later lab.
- **Ownership Check**: The `requesterId` is passed as a query parameter for GET/PATCH requests and in the request body for POST requests. This is a testing mechanism, not secure authentication. Lab 3 will replace this with proper session-based auth.
- **Attachment Naming**: Original filenames are preserved for display, but stored filenames use a UUID-based scheme to prevent conflicts and path traversal.
- **Soft Removal**: Soft removal sets `isRemoved = true`, records `removalReason` and `removedAt`. The file remains on disk but is not served via download. A future lab may implement permanent cleanup.
- **Status Model**: Lab 2 uses a simplified single-status model with only the `NEW` status. The `TicketStatus` enum is designed to be extended in Lab 3 with additional statuses (IN_PROGRESS, RESOLVED, CLOSED, etc.).
- **Priority as Enum**: Requested Priority is stored as a Prisma enum (LOW, MEDIUM, HIGH, URGENT) rather than a separate table, since the values are fixed and few.
- **No IT Priority in Lab 2**: IT Priority is excluded and will be introduced in Lab 3 when IT Staff workflow is implemented.
