# Lab 2 UI Specification

## 1. Color Tokens

| Token | Hex | Usage |
| --- | --- | --- |
| Primary Green | #006B3C | App header background, primary buttons (Submit), strong emphasis, active nav indicator |
| Secondary Green | #0B7A46 | Active tabs, focus ring accents, link text, hover states on buttons |
| Pale Green | #EAF6EF | Selected list items, success backgrounds, subtle section emphasis |
| Page Background | #F5F7F6 | Body background, applied to html or body element |
| Surface / Card | #FFFFFF | Card backgrounds, form containers, table cells |
| Card Border | #E0E4E1 | Subtle border around cards, form sections, table |
| Card Shadow | 0 1px 3px rgba(0,0,0,0.08) | Subtle shadow on cards and elevated surfaces |
| Text Primary | #1A2E1A | Body text, headings, labels (dark charcoal-green, not pure black) |
| Text Secondary | #5A6B5A | Helper text, placeholders, secondary information |
| Editable Field BG | #FFFFFF | Background for editable input fields |
| Editable Field Border | #C0C8C2 | Default border for editable fields |
| Editable Field Focus Border | #0B7A46 | Border when field is focused |
| Read-Only Field BG | #F0F3F1 | Background for read-only fields (soft gray-green) |
| Read-Only Field Border | #D8DDD9 | Border for read-only fields |
| Error Text | #B91C1C | Error message text |
| Error Border | #DC2626 | Error field border |
| Error Background | #FEF2F2 | Error state background |
| Warning Background | #FEF3C7 | Warning callout background |
| Warning Text | #92400E | Warning callout text |
| Success Text | #166534 | Success confirmation text |
| Success Background | #DCFCE7 | Success state background |

## 2. Typography and Spacing

| Element | Font | Size | Weight | Line Height | Margin/Spacing |
| --- | --- | --- | --- | --- | --- |
| Page heading (h1) | System stack | 24px | 700 | 32px | mb-4 (16px bottom) |
| Section heading (h2) | System stack | 20px | 600 | 28px | mb-3 (12px bottom) |
| Card heading (h3) | System stack | 16px | 600 | 24px | mb-2 (8px bottom) |
| Body text | System stack | 14px | 400 | 20px | — |
| Label | System stack | 14px | 500 | 20px | mb-1 (4px bottom) |
| Helper / placeholder | System stack | 12px | 400 | 16px | mt-1 (4px top) |
| Error message | System stack | 12px | 500 | 16px | mt-1 (4px top) |
| Button text | System stack | 14px | 600 | 20px | — |
| Badge text | System stack | 12px | 600 | 16px | — |
| Form spacing (between fields) | — | — | — | — | mb-3 (12px) |
| Card padding | — | — | — | — | p-4 (16px) |
| Section gap | — | — | — | — | gap-3 (12px) or mb-4 (16px) |

## 3. Component States

### Editable Fields (Input, Select, Textarea)

| State | Background | Border | Text | Placeholder |
| --- | --- | --- | --- | --- |
| Default | #FFFFFF | #C0C8C2 | #1A2E1A | #9CA3AF |
| Focused | #FFFFFF | #0B7A46 (2px) | #1A2E1A | — |
| Filled | #FFFFFF | #C0C8C2 | #1A2E1A | — |
| Invalid | #FFFFFF | #DC2626 | #1A2E1A | — |
| Disabled | #F5F7F6 | #D8DDD9 | #9CA3AF | — |

### Read-Only Fields

| State | Background | Border | Text |
| --- | --- | --- | --- |
| Default | #F0F3F1 | #D8DDD9 | #1A2E1A |

### Buttons

| Variant | Background | Border | Text | Hover | Active |
| --- | --- | --- | --- | --- | --- |
| Primary | #006B3C | none | #FFFFFF | #005A32 | #004D2B |
| Secondary | #FFFFFF | #006B3C | #006B3C | #F0F7F3 | #E6F0EA |
| Tertiary (Link) | none | none | #0B7A46 | #004D2B underline | — |
| Destructive | #DC2626 | none | #FFFFFF | #B91C1C | #991B1B |
| Disabled | #E5E7EB | none | #9CA3AF | — | — |
| Busy (Primary) | #006B3C 70% | none | #FFFFFF + spinner | — | — |

### Required Field Marker

- Red asterisk (*) after label text
- Color: #DC2626
- Font size: same as label (14px)
- Does NOT replace validation message

### Validation Messages

- Position: immediately below the associated field (mt-1)
- Color: #B91C1C text
- Background: #FEF2F2 (optional, for emphasis)
- Font size: 12px, weight 500
- One message per field; multiple errors shown as stacked messages

### Badges

| Badge | Background | Text |
| --- | --- | --- |
| Priority: LOW | #E5E7EB | #374151 |
| Priority: MEDIUM | #FEF3C7 | #92400E |
| Priority: HIGH | #FEE2E2 | #991B1B |
| Priority: URGENT | #DC2626 | #FFFFFF |
| Status: Open | #E0F2FE | #0284C7 |
| Status: Assigned | #E0E7FF | #4338CA |
| Status: In Progress | #F3E8FF | #7E22CE |
| Status: On hold | #FEF3C7 | #92400E |
| Status: Pending for Approval | #FFEDD5 | #C2410C |
| Status: Monitoring | #CCFBF1 | #0F766E |
| Status: Closed | #F1F5F9 | #475569 |

## 4. Application Shell

### Header

- Background: #006B3C
- Height: 56px
- Logo/brand: "TokTickIT" in white, bold, 18px
- Navigation links: "My Tickets" | "Create Ticket" in white, 14px
- Active nav: white text with bottom border indicator (2px #FFFFFF)
- Inactive nav: white text at 80% opacity, full opacity on hover
- Right side: Selected Requester name + "Change Requester" link
- Mobile: hamburger menu or stacked navigation

### Change Requester Behavior

- Clicking "Change Requester" returns to Requester Selection screen
- All ticket data reloads for the newly selected Requester
- Current context is cleared before reload

## 5. Screens

### 5.1 Requester Selection Screen

**Purpose**: Temporary login substitute for selecting the testing context.

**Layout**:
- Centered card (max-width 480px)
- TokTickIT title at top
- Explanation text: "Select a Development Requester to test requester-specific ticket behavior. This is not a login screen."
- Dropdown field: "Development Requester" (loads active requesters from API)
- Continue button (primary, disabled until selection made)

**States**:
- Loading: Spinner while requesters load from API
- Ready: Dropdown populated, Continue enabled after selection
- Empty: Message "No active requesters found" when list is empty
- Error: Error message with retry option when API fails

### 5.2 Create Ticket Screen

**Layout** (desktop):

```
┌─────────────────────────────────────────────────────┐
│ [Header: TokTickIT | My Tickets | Create Ticket]    │
├─────────────────────────────────────────────────────┤
│ Create Ticket                                       │
│                                                     │
│ ┌─ System Info ───────────────────────────────────┐ │
│ │ Ticket Number: TK-20260831-0001 (read-only)     │ │
│ │ Ticket Date:   31 Aug 2026 (read-only)          │ │
│ │ Requester:     John Smith (read-only)            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ Classification ───────────────────────────────┐  │
│ │ Category*        [dropdown]                     │  │
│ │ Related System*  [dropdown]                     │  │
│ │ Priority*        [dropdown]                     │  │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ Details ──────────────────────────────────────┐  │
│ │ Summary*           [text input, max 150]        │  │
│ │ Description*       [textarea, max 2000]         │  │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ Attachments ──────────────────────────────────┐  │
│ │ [Choose File] (JPG, PNG, WEBP, PDF - max 5MB)  │  │
│ │ Selected: filename.jpg (2.3 MB) [Remove]        │  │
│ │ Active: 2/5 attachments                         │  │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Cancel]  [Submit Ticket]                           │
│                                                     │
│ Success: Ticket TK-20260831-0001 created!            │
│ [View My Tickets]                                   │
└─────────────────────────────────────────────────────┘
```

**Fields**:

| Field | Type | Editable | Required | Validation |
| --- | --- | --- | --- | --- |
| Ticket Number | Text (read-only) | No | — | Auto-generated |
| Ticket Date | Date (read-only) | No | — | Auto-set |
| Requester | Text (read-only) | No | — | From selection |
| Category | Select dropdown | Yes | Yes (*) | Must select valid option |
| Related System | Select dropdown | Yes | Yes (*) | Must select valid option |
| Priority | Select dropdown | Yes | Yes (*) | Must select valid option |
| Summary | Text input | Yes | Yes (*) | 1-150 chars, trimmed |
| Description | Textarea | Yes | Yes (*) | 1-2000 chars, trimmed, resizable |
| Attachments | File upload | Yes | No | Max 5MB, JPG/PNG/WEBP/PDF, max 5 active |

### 5.3 My Tickets Screen

**Layout** (desktop):

```
┌─────────────────────────────────────────────────────┐
│ [Header: TokTickIT | My Tickets | Create Ticket]    │
├─────────────────────────────────────────────────────┤
│ My Tickets                                          │
│                                                     │
│ [Search tickets...          ] [Filters ▼] [Sort ▼]  │
│                                                     │
│ Category: [All ▼]  Status: [All ▼]  Priority: [All ▼]│
│                                                     │
│ ┌─ Ticket List ───────────────────────────────────┐ │
│ │ #  │ Ticket No.    │ Summary        │ Status │ ⋮ │ │
│ │ 1  │ TK-20260831-01│ Laptop issue   │ Open   │ → │ │
│ │ 2  │ TK-20260831-02│ VPN not working│ Open   │ → │ │
│ │ 3  │ TK-20260831-03│ Email problem  │ Open   │ → │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Showing 1-3 of 3 tickets          [< Prev] [Next >]│
│                                                     │
│ [+ Create Ticket]                                   │
└─────────────────────────────────────────────────────┘
```

**Mobile**: Cards replace table rows, each card shows ticket number, summary, status badge, priority badge.

**States**:
- Loading: Spinner overlay on ticket list area
- Empty: "No tickets yet. Create your first ticket." with Create Ticket button
- No Results: "No tickets match your search or filters." with Clear Filters action
- Error: "Unable to load tickets. Please try again." with Retry button

### 5.4 Ticket Detail Screen

**Layout** (desktop):

```
┌─────────────────────────────────────────────────────┐
│ [Header: TokTickIT | My Tickets | Create Ticket]    │
├─────────────────────────────────────────────────────┤
│ ← Back to My Tickets                                │
│                                                     │
│ Ticket TK-20260831-0001                              │
│                                                     │
│ ┌─ Ticket Information (read-only) ────────────────┐ │
│ │ Summary:     Laptop battery drains quickly       │ │
│ │ Category:    Hardware                            │ │
│ │ System:      Corporate Laptop                    │ │
│ │ Priority:    MEDIUM                              │ │
│ │ Status:      Open                                 │ │
│ │ Created:     31 Aug 2026 10:30                   │ │
│ │ Updated:     31 Aug 2026 10:30                   │ │
│ │                                                   │ │
│ │ Description:                                      │ │
│ │ The laptop battery only lasts about 2 hours      │ │
│ │ even with minimal usage. It used to last 6+...   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ Attachments ──────────────────────────────────┐  │
│ │ [Upload File] (2/5 active)                      │  │
│ │                                                   │  │
│ │ ✅ screenshot.png    1.2 MB  31 Aug  [DL] [RM]   │  │
│ │ ✅ error-log.pdf     0.5 MB  31 Aug  [DL] [RM]   │  │
│ │ ❌ old-photo.jpg     0.8 MB  31 Aug  [Removed]   │  │
│ │     Reason: "Wrong file uploaded"                 │  │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Attachment States**:
- Active: Green check icon, filename, size, date, Download and Remove buttons
- Uploading: Filename with spinner, no actions
- Invalid: Red warning icon, error message, no file saved
- Removed: Strikethrough filename, "Removed" badge, reason text, metadata retained, download blocked
- Unavailable: Gray icon, "File unavailable" text, no actions

## 6. Validation Placement

- Validation messages appear immediately below the associated field
- Messages use mt-1 (4px top margin) spacing
- Only one message per field at a time
- Required asterisk (*) appears after label, before any colon
- On submit: all invalid fields show messages simultaneously
- On field blur: show message for the individual field that lost focus
- Clear messages when the user corrects the input

## 7. Button Hierarchy

| Action | Variant | Position |
| --- | --- | --- |
| Submit Ticket (Create) | Primary | Bottom right of form |
| Cancel | Secondary | Bottom left of form |
| Change Requester | Tertiary (link) | Header, next to requester name |
| Back to My Tickets | Tertiary (link) | Top of Ticket Detail |
| Download Attachment | Secondary (small) | Attachment row |
| Remove Attachment | Destructive (small) | Attachment row |
| Upload File | Secondary | Attachments section |
| Retry (on error) | Secondary | Error state area |
| Clear Filters | Tertiary (link) | No-results state |
| Create Ticket (empty state) | Primary | Empty state area |

## 8. Responsive Behavior

### Desktop (>=992px)
- Create Ticket: Two-column layout for classification fields, full-width for Summary/Description
- My Tickets: Table layout with all columns visible
- Ticket Detail: Two-column for ticket info, full-width for attachments

### Tablet (768-991px)
- Create Ticket: Two-column where practical, Summary and Description get adequate width
- My Tickets: Table layout, some columns may compress
- Ticket Detail: Single column with sections

### Mobile (<768px)
- Create Ticket: All fields stack vertically, buttons full-width
- My Tickets: Card layout replaces table, each ticket is a card
- Ticket Detail: Single column, attachments stack vertically
- Navigation: Hamburger menu or bottom navigation

### Universal Rules
- No clipped labels at any viewport
- No overlapping messages
- No hidden buttons
- No horizontal page scrolling
- Touch-friendly button targets (minimum 44x44px) on mobile
- Readable attachment filenames at all sizes

## 9. Accessibility

- All form fields have associated `<label>` elements (htmlFor)
- Required fields use aria-required="true"
- Error messages use aria-describedby linked to the field
- Validation errors announced with role="alert"
- Loading states use role="status"
- Focus indicators visible on all interactive elements (2px #0B7A46 outline)
- Keyboard navigation: Tab order follows logical reading order
- Icon-only buttons have aria-label and title/tooltip
- Color is never the sole indicator of state (badges include text labels)
- Skip-to-content link for keyboard users

## 10. Visual Inspection Checklist

| Item | Status |
| --- | --- |
| Zen Green colors match tokens | |
| No pure black text (#000000) used | |
| Read-only fields have distinct background | |
| Required asterisks visible and red | |
| Validation messages below fields, not at top | |
| Primary button is green, secondary is outlined | |
| No clipping at any viewport | |
| No overlap of elements | |
| No horizontal scrollbar at any viewport | |
| Labels not truncated | |
| Attachment names fully readable | |
| Badges consistent for Priority and Status | |
| Loading spinners visible | |
| Empty states have clear messaging | |
| Error states have actionable recovery | |

## 11. Screenshot Paths

| Screen | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Requester Selection | `artifacts/lab-02/screenshots/requester-selection/desktop.png` | `artifacts/lab-02/screenshots/requester-selection/tablet.png` | `artifacts/lab-02/screenshots/requester-selection/mobile.png` |
| Create Ticket | `artifacts/lab-02/screenshots/create-ticket/desktop.png` | `artifacts/lab-02/screenshots/create-ticket/tablet.png` | `artifacts/lab-02/screenshots/create-ticket/mobile.png` |
| Create Ticket (Validation) | `artifacts/lab-02/screenshots/create-ticket/validation.png` | — | — |
| Create Ticket (Success) | `artifacts/lab-02/screenshots/create-ticket/success.png` | — | — |
| Create Ticket (Error) | `artifacts/lab-02/screenshots/create-ticket/error.png` | — | — |
| My Tickets | `artifacts/lab-02/screenshots/my-tickets/desktop.png` | `artifacts/lab-02/screenshots/my-tickets/tablet.png` | `artifacts/lab-02/screenshots/my-tickets/mobile.png` |
| My Tickets (Empty) | `artifacts/lab-02/screenshots/my-tickets/empty.png` | — | — |
| My Tickets (No Results) | `artifacts/lab-02/screenshots/my-tickets/no-results.png` | — | — |
| Ticket Detail | `artifacts/lab-02/screenshots/ticket-detail/desktop.png` | `artifacts/lab-02/screenshots/ticket-detail/tablet.png` | `artifacts/lab-02/screenshots/ticket-detail/mobile.png` |
| Ticket Detail (Attachments) | `artifacts/lab-02/screenshots/ticket-detail/attachments.png` | — | — |
