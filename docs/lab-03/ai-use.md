# AI Use and Reflection — Lab 3

I used **opencode** (model: Muse Spark) and **Antigravity** (Gemini) for TokTickIT Lab 3 — from requirements review and planning through Spec DD, Test DD, phased implementation, and E2E verification. I reviewed, tested, and verified every generated file, schema migration, and pull request before accepting it.

---

## Selected Key Prompts (10 Key Prompts)

### 1. Review Labsheet Requirements
**Prompt:**  
> *"Review `Lab_3_sheet.pdf` and summarize all the requirements, roles, and deliverables we need to complete for Lab 3."*

**Reflection:**  
The agent summarized the 18-page handout into clear product increments, roles, and the 9-part submission rubric. Setting this shared understanding early prevented scope creep and kept development aligned with grading criteria.

---

### 2. Full Sprint Implementation Plan
**Prompt:**  
> *"Draft an end-to-end Implementation Plan for Sprint 3 based on our codebase and the staging branch workflow."*

**Reflection:**  
The agent inspected our actual repository state (`schema.prisma`, `app.ts`, vitest configs) and broke the sprint down into 9 sequential phases mapped to feature branches (`feature/3x-*`), strictly following the course's staging workflow.

---

### 3. Evaluate Architectural Suggestions
**Prompt:**  
> *"Evaluate these architectural suggestions against the labsheet requirements and explain which ones we should adopt and why."*

**Reflection:**  
The agent evaluated all 9 suggestions and adopted them with sound technical rationales, such as seeding two active Admins for test isolation and enforcing strict `mustChangePassword` route allowlists.

---

### 4. Sprint 3 Specification Contract
**Prompt:**  
> *"Start Phase 1: create the specification contracts in `docs/lab-03/` and resolve any inconsistencies across roles and business rules."*

**Reflection:**  
The agent drafted `specification.md`, `api-spec.md`, and `ui-spec.md`. Reviewing the draft caught conflicting Admin permissions and removed `resolutionSummary` (scope creep deferred to Lab 4) before writing code.

---

### 5. Test Plan and Traceability Matrix
**Prompt:**  
> *"Proceed to Phase 2: write the test plan in `tests.md` with full AC traceability mapping before we start implementation."*

**Reflection:**  
The agent mapped AC-01..18 to over 50 planned test cases across unit, API, UI, and E2E layers. Version control proved its value when a disk incident truncated the file, and git allowed us to restore it cleanly.

---

### 6. Database Migration & Authentication Foundation
**Prompt:**  
> *"Implement Phase 3: set up the User model, safe database migration with `itPriority` backfill, and bcrypt/JWT authentication with TDD tests."*

**Reflection:**  
The agent safely migrated the database without losing Lab 2 tickets and implemented bcrypt/JWT authentication with TDD tests (94/94 green). We also noted that Lab 2 test teardowns cleared tickets, establishing the rule to re-seed after full test runs.

---

### 7. Security Audit & Production Hardening
**Prompt:**  
> *"Audit our recent code for security vulnerabilities, especially client-supplied IDs and JWT secrets, and harden them properly."*

**Reflection:**  
The review confirmed that APIs never trust client-supplied `requesterId`. The agent patched a potential development fallback secret to fail closed in production, backed by a dedicated unit test.

---

### 8. IT Staff Ticket Queue & Workflow Operations
**Prompt:**  
> *"The PR is merged, let's proceed to the next phase: implement the IT Staff ticket queue, detail operations, and the status transition matrix."*

**Reflection:**  
Built the queue and detail endpoints with strict status transitions and responsive UI. Public Comments and Internal Notes were given distinct visual styling to prevent accidental leaks of internal communications.

---

### 9. Administrator User Management & Safety Guards
**Prompt:**  
> *"Now implement Admin user management: build the drawer UI and enforce duplicate email, self-deactivation, and last-admin safety guards."*

**Reflection:**  
Implemented the admin module with robust server-side guards: duplicate emails return 409 with field details, self-deactivation is disabled with a tooltip, and database checks prevent removing the last active administrator.

---

### 10. E2E Test Suite & Responsive Screenshots
**Prompt:**  
> *"The PR is merged, let's start the final phase: implement the Playwright E2E tests and capture responsive screenshots matching all labsheet specs."*

**Reflection:**  
Configured single-worker execution with global setup/teardown account pinning, preventing database collisions and long timeouts. Fixed an async form race condition, achieving 11/11 green E2E tests and 14 clean responsive screenshots.

---

## My Reflection

### Using AI as a Specification Agent
Using the AI during planning, specification, and test design was the most effective part of the workflow. Defining rules, authorization matrices, and acceptance criteria up front eliminated ambiguity before writing code. When peer review identified gaps, resolving them in documentation first kept subsequent implementation clean and focused.

### Using AI as a Coding Agent
The AI was fast and reliable when guided by clear contracts and failing tests (TDD), especially for boilerplate routes, migrations, and assertions. However, human engineering oversight was critical:
1. **Test Concurrency:** Configuring sequential Playwright execution to prevent database deadlocks on shared seed accounts.
2. **Async UI Timing:** Explicitly awaiting network responses during form submissions to prevent race conditions.
3. **Peer Review:** Addressing feedback from Thanabun Tikaew to refine badge tokens, UI edge cases, and role restrictions.

Combining Spec DD, Test DD, AI assistance, and rigorous peer review resulted in a clean, resilient, and fully traceable product increment.
