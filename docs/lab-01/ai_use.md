# AI Use and Reflection

I used Codex as my AI coding assistant for TokTickIT Lab 1. The work in this phase focused only on Issue 1: setting up the project foundation. I reviewed the generated files, commands, dependencies, and test results before accepting them.

## Selected Key Prompts

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

## Reflection

Using AI was helpful for turning the Lab 1 requirements into a clean project foundation. The most important part was giving clear constraints, especially "do not implement features beyond Issue 1." Without that constraint, it would be easy to accidentally add `/api/health`, the Category model, or seeded data before their assigned Issues.

I learned that prompts should include the required folder structure, technology choices, and scope limits. I also had to verify the generated setup by running the actual test and build commands instead of trusting the file structure alone.
