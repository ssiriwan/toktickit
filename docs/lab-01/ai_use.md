# AI Use and Reflection

I used two AI coding agents for TokTickIT Lab 1:

- **Codex** for Issue 1 — setting up the project foundation (commit `54637b7 feat: setup project foundation`).
- **opencode** (model: big-pickle) for Issues 2–4 — health check, category seed, and category list (commits `384dd09`, `adb2f3f`, `0ec0c3d`).

I reviewed every generated file, command, dependency, migration, test, and commit before accepting it.

## Issue 1 — Project Foundation (Codex)

### 1. Plan Lab 1

**Prompt:** Read the complete TokTickIT Lab 1 requirements and summarize the four Issues, their dependencies, required outputs, and required automated tests. Propose an implementation order, but do not write code yet.

**Reflection:** This helped me understand the dependency order before implementation. It clarified that Issue 1 must be completed before the other Issues.

### 2. Set Up Project Foundation

**Prompt:** Set up the TokTickIT project structure according to Lab 1 with client, server, prisma, tests/lab-01, and docs/lab-01. Use React, TypeScript, Vite, Bootstrap, Node.js, Express, TypeScript, PostgreSQL, Prisma, Vitest, and Supertest. Do not implement features beyond Issue 1.

**Reflection:** This prompt was useful because it gave strict scope boundaries. It prevented adding health check or category features too early.

### 3. Configure Frontend

**Prompt:** Create a React + TypeScript + Vite frontend and install Bootstrap so Bootstrap styling is visible when the app runs.

**Reflection:** The first frontend result was simple and appropriate for the foundation stage. I checked that the page had the TokTickIT heading and a Bootstrap button.

### 4. Configure Backend

**Prompt:** Create a minimal Node.js + Express + TypeScript backend that can start successfully, without adding Lab 1 feature routes yet.

**Reflection:** This kept the backend ready for later Issues while avoiding extra feature work. The app currently returns a JSON 404 for unknown routes.

### 5. Configure Prisma

**Prompt:** Add Prisma setup for PostgreSQL using a schema file and environment-based database URL. Do not commit secrets.

**Reflection:** This made the database setup ready for later migration work. The Category model and seed are intentionally left for Issue 3.

### 6. Configure Tests

**Prompt:** Set up Vitest and Supertest so tests can be run from the README commands. Add only foundation tests for the current scope.

**Reflection:** The tests proved that the frontend and backend tooling works. More specific health and category tests will be added in Issues 2 and 4.

### 7. Create Environment File

**Prompt:** Copy `.env.example` to `.env` and use a local PostgreSQL `DATABASE_URL`. Make sure `.env` is ignored by Git.

**Reflection:** This helped me prepare the local environment without exposing secrets. I confirmed that `.env` is ignored by `.gitignore`.

### 8. Run Verification

**Prompt:** Run the test commands from the README and report which tests passed.

**Reflection:** This confirmed that the setup is runnable. Some commands needed to be rerun outside the sandbox because Vitest config loading was blocked by the environment.

## Issues 2–4 — Feature Implementation (opencode)

### Selected Key Prompts

#### 1. Verify Issue 1 against the PDF

**Prompt:** ดูตามไฟล์ [PDF 1] ว่าตอนนี้ในโปรเจคตรงตามสิ่งที่ต้องทำใน Issue 1 หรือยัง พร้อมเขียนอธิบายโปรเจคด้วย ("Check whether the project already matches what Issue 1 requires, and explain the project.")

**Reflection:** I moved from Codex to OpenCode for my AI agent because Codex consumed too many of my tokens. I was concerned that my tokens would run out before I finished the project. Then this told me to compare the real code from Codex against the PDF instead of trusting it was correct. It found the PostgreSQL connection was failing (Prisma error P1000).

#### 2. Use Docker with a new database

**Prompt:** use docker but new project with name toktickit ("Use Docker, but a new project named toktickit.")

**Reflection:** The first pass suggested using Postgres locally, but after seeing the issues, I reconsidered whether Docker would be easier. I then switched to Docker, where it suggested reusing an existing container from another project. However, I insisted on a dedicated toktickit-db container to keep credentials and data isolated.

#### 3. Re-check Issue 1 criteria

**Prompt:** then check the Issue 1 criteria and compare with my current project

**Reflection:** After fixing the database, this re-ran every acceptance criterion (7/7) and produced verifiable evidence before moving on.

#### 4. Review then implement Issue 2

**Prompt:** no need to commit. Now review issue 2 to me and implement the issue 2

**Reflection:** The word "review" made the agent summarize the acceptance criteria and tests first, then implement only that scope. This pattern worked well and I reused it for Issues 3 and 4.

#### 5. Review then implement Issue 3

**Prompt:** Review issue 3 to me and Implement the issue 3

**Reflection:** The agent produced the `Category` model, migration, and an idempotent seed (upsert) so running the seed twice did not create duplicates.

#### 6. Review then implement Issue 4

**Prompt:** review issue 4 and implement the issue 4

**Reflection:** The agent fetched categories from PostgreSQL through Prisma with a predictable order and added loading/error states in the UI.


## Reflection

Using AI was helpful for turning the Lab 1 requirements into a clean project foundation and then the full vertical slice. The most important part was giving clear constraints, especially "do not implement features beyond Issue 1" in Codex, and then "review issue N to me and implement the issue N" in opencode. These kept each issue self-contained on its own branch so it could be peer-reviewed separately.

I learned to control the workflow explicitly: review first, implement, then commit and push as separate steps so I could inspect each diff. I also learned to always verify the result — acceptance criteria tables and real test output — instead of trusting the agent's summary alone.
