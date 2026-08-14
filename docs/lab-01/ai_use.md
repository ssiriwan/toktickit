# AI Use and Reflection

I used two AI coding agents for TokTickIT Lab 1:

- **Codex** for Issue 1 — setting up the project foundation (commit `54637b7 feat: setup project foundation`).
- **opencode** (model: big-pickle) for Issues 2–4 — health check, category seed, and category list (commits `384dd09`, `adb2f3f`, `0ec0c3d`).

I reviewed every generated file, command, dependency, migration, test, and commit before accepting it.

## Issue 1 — Project Foundation (Codex)

| Prompt Name | Actual Prompt Text | My Reflection |
| --- | --- | --- |
| Plan Lab 1 | Read the complete TokTickIT Lab 1 requirements and summarize the four Issues, their dependencies, required outputs, and required automated tests. Propose an implementation order, but do not write code yet. | This helped me understand the dependency order before implementation. It clarified that Issue 1 must be completed before the other Issues. |
| Set Up Project Foundation | Set up the TokTickIT project structure according to Lab 1 with client, server, prisma, tests/lab-01, and docs/lab-01. Use React, TypeScript, Vite, Bootstrap, Node.js, Express, TypeScript, PostgreSQL, Prisma, Vitest, and Supertest. Do not implement features beyond Issue 1. | This prompt was useful because it gave strict scope boundaries. It prevented adding health check or category features too early. |
| Configure Frontend | Create a React + TypeScript + Vite frontend and install Bootstrap so Bootstrap styling is visible when the app runs. | The first frontend result was simple and appropriate for the foundation stage. I checked that the page had the TokTickIT heading and a Bootstrap button. |
| Configure Backend | Create a minimal Node.js + Express + TypeScript backend that can start successfully, without adding Lab 1 feature routes yet. | This kept the backend ready for later Issues while avoiding extra feature work. The app currently returns a JSON 404 for unknown routes. |
| Configure Prisma | Add Prisma setup for PostgreSQL using a schema file and environment-based database URL. Do not commit secrets. | This made the database setup ready for later migration work. The Category model and seed are intentionally left for Issue 3. |
| Configure Tests | Set up Vitest and Supertest so tests can be run from the README commands. Add only foundation tests for the current scope. | The tests proved that the frontend and backend tooling works. More specific health and category tests will be added in Issues 2 and 4. |
| Create Environment File | Copy `.env.example` to `.env` and use a local PostgreSQL `DATABASE_URL`. Make sure `.env` is ignored by Git. | This helped me prepare the local environment without exposing secrets. I confirmed that `.env` is ignored by `.gitignore`. |
| Run Verification | Run the test commands from the README and report which tests passed. | This confirmed that the setup is runnable. Some commands needed to be rerun outside the sandbox because Vitest config loading was blocked by the environment. |

## Issues 2–4 — Feature Implementation (opencode)

### Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| --- | --- | --- |
| Verify Issue 1 against the PDF | ดูตามไฟล์ [PDF 1] ว่าตอนนี้ในโปรเจคตรงตามสิ่งที่ต้องทำใน Issue 1 หรือยัง พร้อมเขียนอธิบายโปรเจคด้วย ("Check whether the project already matches what Issue 1 requires, and explain the project.") | This told me to compare the real code against the PDF instead of trusting it was correct. It found the PostgreSQL connection was failing (Prisma error P1000) and that `reviewer.md` was still empty before I started Issue 2. |
| Use Docker with a new database | use docker but new project with name toktickit ("Use Docker, but a new project named toktickit.") | The first pass suggested reusing an existing container from another project. I insisted on a dedicated `toktickit-db` container, which kept credentials and data isolated. |
| Re-check Issue 1 criteria | then check the Issue 1 criteria and compare with my current project | After fixing the database, this re-ran every acceptance criterion (7/7) and produced verifiable evidence before moving on. |
| Review then implement Issue 2 | no need to commit. Now review issue 2 to me and implement the issue 2 | The word "review" made the agent summarize the acceptance criteria and tests first, then implement only that scope. This pattern worked well and I reused it for Issues 3 and 4. |
| Commit Issue 2 | commit code ได้เลย เดี๋ยวเราจะเอาไปให้เพื่อน PR ("Commit the code, we will give it to a friend for PR review.") | I kept commit and push as separate explicit steps so I could check the diff before each one, and so a peer could review the branch. |
| Review then implement Issue 3 | Review issue 3 to me and Implement the issue 3 | The agent produced the `Category` model, migration, and an idempotent seed (upsert) so running the seed twice did not create duplicates. |
| Review then implement Issue 4 | review issue 4 and implement the issue 4 | The agent fetched categories from PostgreSQL through Prisma with a predictable order and added loading/error states in the UI. |
| Commit and push Issue 4 | commit and push issue 4 ได้เลย ("Commit and push issue 4.") | Final release step after all 10 tests passed (3 server + 7 client), closing the four-issue sprint. |

### Complete Prompt Log (in step order)

| Step | Prompt Name | Actual Prompt Text (verbatim) |
| --- | --- | --- |
| 1 | Verify Issue 1 against the PDF | ดูตามไฟล์ [PDF 1] ว่าตอนนี้ในโปรเจคตรงตามสิ่งที่ต้องทำใน Issue 1 หรือยัง พร้ออมเขียนอธิบายโปรเจคด้วย |
| 2 | Ask about switching to Docker | If we chabge database to use docker. Should I change it and how to do it้ |
| 3 | Confirm Docker is ready | I want to use docker. Should I open Docker now? |
| 4 | Create a dedicated Docker database | use docker but new project with name toktickitี |
| 5 | Re-check Issue 1 acceptance criteria | then check the Issue 1 criteria and compare with my current project |
| 6 | Review and implement Issue 2 (health check) | no need to commit. Now review issue 2 to me and implement the issue 2 |
| 7 | Commit Issue 2 | commit code ได้เลย เดี๋ยวเราจะเอาไปให้เพื่อน PR |
| 8 | Push Issue 2 branch | push |
| 9 | Review and implement Issue 3 (category seed) | Review issue 3 to me and Implement the issue 3 |
| 10 | Push Issue 3 branch | push เลย จะได้ทำ PR ต่อ |
| 11 | Review and implement Issue 4 (category list) | review issue 4 and implement the issue 4 |
| 12 | Commit and push Issue 4 | commit and  push issue 4 ได้เลย |

## Reflection

Using AI was helpful for turning the Lab 1 requirements into a clean project foundation and then the full vertical slice. The most important part was giving clear constraints, especially "do not implement features beyond Issue 1" in Codex, and then "review issue N to me and implement the issue N" in opencode. These kept each issue self-contained on its own branch so it could be peer-reviewed separately.

I learned to control the workflow explicitly: review first, implement, then commit and push as separate steps so I could inspect each diff. I also learned to always verify the result — acceptance criteria tables and real test output — instead of trusting the agent's summary alone.
