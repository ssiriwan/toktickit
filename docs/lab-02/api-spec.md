# Lab 2 API Specification

## Base URL

```
http://localhost:3000/api
```

Content-Type for JSON: `application/json`
Content-Type for file upload: `multipart/form-data`

---

## 1. GET /api/requesters

Retrieve active Development Requesters for the selection screen.

### Response 200 OK

```json
[
  { "id": 1, "name": "John Smith", "email": "john.smith@example.com" },
  { "id": 2, "name": "Jane Doe", "email": "jane.doe@example.com" }
]
```

### Response 500 Internal Server Error

```json
{ "message": "Failed to load requesters" }
```

---

## 2. GET /api/categories

Retrieve active ticket categories.

### Response 200 OK

```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

### Response 500 Internal Server Error

```json
{ "message": "Failed to load categories" }
```

---

## 3. GET /api/related-systems

Retrieve active related systems.

### Response 200 OK

```json
[
  { "id": 1, "name": "Email" },
  { "id": 2, "name": "Campus Wi-Fi" },
  { "id": 3, "name": "VPN" },
  { "id": 4, "name": "LEB2 App" },
  { "id": 5, "name": "Grade Submission App" },
  { "id": 6, "name": "Printer" },
  { "id": 7, "name": "Corporate Laptop" }
]
```

### Response 500 Internal Server Error

```json
{ "message": "Failed to load related systems" }
```

---

## 4. POST /api/tickets

Create a new support ticket for the selected Development Requester.

### Request Body

```json
{
  "requesterId": 1,
  "summary": "Laptop battery drains quickly",
  "description": "The laptop battery only lasts about 2 hours even with minimal usage. It used to last 6+ hours.",
  "categoryId": 2,
  "relatedSystemId": 7,
  "requestedPriority": "MEDIUM"
}
```

### Validation Rules

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| requesterId | number | Yes | Must be a positive integer; must match an active RequesterUser |
| summary | string | Yes | 1-150 characters after trimming |
| description | string | Yes | 1-2000 characters after trimming |
| categoryId | number | Yes | Must be a positive integer; must match an active Category |
| relatedSystemId | number | Yes | Must be a positive integer; must match an active RelatedSystem |
| requestedPriority | string | Yes | Must be one of: LOW, MEDIUM, HIGH, URGENT |

### Ticket Number Generation

Format: `TK-YYYYMMDD-XXXX`

- `YYYYMMDD` = creation date
- `XXXX` = zero-padded sequential counter per day (0001, 0002, ...)
- Generated server-side after validation passes

### Response 201 Created

```json
{
  "id": 1,
  "ticketNumber": "TK-20260831-0001",
  "summary": "Laptop battery drains quickly",
  "description": "The laptop battery only lasts about 2 hours even with minimal usage. It used to last 6+ hours.",
  "currentStatus": "NEW",
  "requestedPriority": "MEDIUM",
  "ticketDate": "2026-08-31T10:30:00.000Z",
  "createdAt": "2026-08-31T10:30:00.000Z",
  "requester": {
    "id": 1,
    "name": "John Smith"
  },
  "category": {
    "id": 2,
    "name": "Hardware"
  },
  "relatedSystem": {
    "id": 7,
    "name": "Corporate Laptop"
  }
}
```

### Response 400 Bad Request (Validation Failure)

```json
{
  "message": "Validation failed",
  "errors": [
    { "field": "summary", "message": "Summary is required" },
    { "field": "categoryId", "message": "Invalid category" }
  ]
}
```

### Response 404 Not Found

```json
{ "message": "Requester not found" }
```

### Response 500 Internal Server Error

```json
{ "message": "Failed to create ticket" }
```

---

## 5. GET /api/tickets

Retrieve a paginated, filtered, sorted list of tickets for the selected Requester.

### Query Parameters

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| requesterId | number | Yes | — | ID of the selected Development Requester |
| search | string | No | — | Case-insensitive text search in summary and description |
| categoryId | number | No | — | Filter by category ID |
| relatedSystemId | number | No | — | Filter by related system ID |
| status | string | No | — | Filter by current status |
| priority | string | No | — | Filter by requested priority |
| sort | string | No | ticketDate | Sort field: ticketDate, updatedAt, requestedPriority |
| order | string | No | desc | Sort direction: asc, desc |
| page | number | No | 1 | Page number (minimum 1) |
| pageSize | number | No | 10 | Items per page (minimum 1, maximum 50) |

### Example Request

```
GET /api/tickets?requesterId=1&search=laptop&categoryId=2&page=1&pageSize=10&sort=ticketDate&order=desc
```

### Response 200 OK

```json
{
  "tickets": [
    {
      "id": 1,
      "ticketNumber": "TK-20260831-0001",
      "summary": "Laptop battery drains quickly",
      "currentStatus": "NEW",
      "requestedPriority": "MEDIUM",
      "ticketDate": "2026-08-31T10:30:00.000Z",
      "updatedAt": "2026-08-31T10:30:00.000Z",
      "category": {
        "id": 2,
        "name": "Hardware"
      },
      "relatedSystem": {
        "id": 7,
        "name": "Corporate Laptop"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### Response 400 Bad Request

```json
{ "message": "Invalid query parameters" }
```

### Response 500 Internal Server Error

```json
{ "message": "Failed to load tickets" }
```

---

## 6. GET /api/tickets/:id

Retrieve a single Ticket with all details and attachments.

### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| requesterId | number | Yes | For ownership verification |

### Response 200 OK

```json
{
  "id": 1,
  "ticketNumber": "TK-20260831-0001",
  "summary": "Laptop battery drains quickly",
  "description": "The laptop battery only lasts about 2 hours.",
  "currentStatus": "NEW",
  "requestedPriority": "MEDIUM",
  "ticketDate": "2026-08-31T10:30:00.000Z",
  "createdAt": "2026-08-31T10:30:00.000Z",
  "updatedAt": "2026-08-31T10:30:00.000Z",
  "requester": {
    "id": 1,
    "name": "John Smith",
    "email": "john.smith@example.com"
  },
  "category": {
    "id": 2,
    "name": "Hardware"
  },
  "relatedSystem": {
    "id": 7,
    "name": "Corporate Laptop"
  },
  "attachments": [
    {
      "id": 1,
      "filename": "screenshot.png",
      "mimeType": "image/png",
      "fileSize": 1258000,
      "isRemoved": false,
      "createdAt": "2026-08-31T10:31:00.000Z"
    },
    {
      "id": 2,
      "filename": "old-photo.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 850000,
      "isRemoved": true,
      "removalReason": "Wrong file uploaded",
      "removedAt": "2026-08-31T10:35:00.000Z",
      "createdAt": "2026-08-31T10:32:00.000Z"
    }
  ]
}
```

### Response 403 Forbidden

```json
{ "message": "Access denied" }
```

### Response 404 Not Found

```json
{ "message": "Ticket not found" }
```

### Response 500 Internal Server Error

```json
{ "message": "Failed to load ticket" }
```

---

## 7. POST /api/tickets/:id/attachments

Upload a file attachment to a ticket.

### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| requesterId | number | Yes | For ownership verification |

### Request

Content-Type: `multipart/form-data`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| file | File | Yes | The file to upload |

### Validation Rules

| Rule | Constraint |
| --- | --- |
| Allowed types | JPG, JPEG, PNG, WEBP, PDF |
| Max file size | 5 MB (5,242,880 bytes) |
| Max active attachments | 5 per ticket (isRemoved = false) |

### Response 201 Created

```json
{
  "id": 3,
  "filename": "screenshot.png",
  "mimeType": "image/png",
  "fileSize": 1258000,
  "isRemoved": false,
  "createdAt": "2026-08-31T11:00:00.000Z"
}
```

### Response 400 Bad Request (Invalid File Type)

```json
{ "message": "File type not allowed. Permitted: JPG, JPEG, PNG, WEBP, PDF" }
```

### Response 400 Bad Request (File Too Large)

```json
{ "message": "File size exceeds 5MB limit" }
```

### Response 400 Bad Request (Max Attachments)

```json
{ "message": "Maximum 5 active attachments per ticket" }
```

### Response 403 Forbidden

```json
{ "message": "Access denied" }
```

### Response 404 Not Found

```json
{ "message": "Ticket not found" }
```

### Response 500 Internal Server Error

```json
{ "message": "Failed to upload attachment" }
```

---

## 8. GET /api/attachments/:id/download

Download an active attachment file.

### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| requesterId | number | Yes | For ownership verification |

### Response 200 OK

- Content-Type: The file's MIME type (e.g., `image/png`)
- Content-Disposition: `attachment; filename="original-filename.ext"`
- Body: File binary stream

### Response 403 Forbidden

```json
{ "message": "Access denied" }
```

### Response 404 Not Found

```json
{ "message": "Attachment not found" }
```

### Response 410 Gone (Soft-Removed)

```json
{ "message": "Attachment has been removed" }
```

### Response 500 Internal Server Error

```json
{ "message": "Failed to download attachment" }
```

---

## 9. PATCH /api/attachments/:id/remove

Soft-remove an attachment. The file metadata is retained but the file becomes undownloadable.

### Query Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| requesterId | number | Yes | For ownership verification |

### Request Body

```json
{
  "reason": "No longer needed"
}
```

### Validation Rules

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| reason | string | Yes | Non-empty string after trimming |

### Response 200 OK

```json
{
  "id": 2,
  "filename": "old-photo.jpg",
  "isRemoved": true,
  "removalReason": "No longer needed",
  "removedAt": "2026-08-31T10:35:00.000Z"
}
```

### Response 400 Bad Request

```json
{ "message": "Reason is required" }
```

### Response 403 Forbidden

```json
{ "message": "Access denied" }
```

### Response 404 Not Found

```json
{ "message": "Attachment not found" }
```

### Response 500 Internal Server Error

```json
{ "message": "Failed to remove attachment" }
```

---

## Error Response Convention

All error responses follow a consistent shape:

```json
{
  "message": "Human-readable error description",
  "errors": [
    { "field": "fieldName", "message": "Field-specific error" }
  ]
}
```

The `errors` array is included for validation failures (400). Other error types include only `message`.

## Ownership Check Pattern

For all ticket and attachment operations:

- The `requesterId` is extracted from the query parameter (GET, PATCH) or request body (POST)
- The server verifies that the ticket or attachment belongs to the specified Requester
- If the Requester is inactive or the ticket/attachment belongs to a different Requester, a 403 or 404 is returned
- This is a testing mechanism, not secure authentication (Lab 3 will replace with sessions)

## Status Code Summary

| Code | Use |
| --- | --- |
| 200 | Successful retrieval or update |
| 201 | Resource created successfully |
| 400 | Invalid input, validation failure, or business rule violation |
| 403 | Ownership violation or access denied |
| 404 | Resource not found (includes inactive requesters) |
| 410 | Attachment has been soft-removed |
| 500 | Unexpected server error |
