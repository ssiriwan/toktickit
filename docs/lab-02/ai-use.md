# AI Use and Reflection

I used **opencode** (model: big-pickle) for Lab 2 specification planning.

## Lab 2 — Specification Documents (opencode)

### Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| --- | --- | --- |
| Review PDF labsheet | review [PDF 1] ว่าต้องทำไรบ้าง | The model could not read PDF directly, but used PyPDF2 via Python to extract the full 22-page labsheet content. This showed me that I can work around tool limitations by using available libraries. |
| Start with spec doc | เริ่มทำส่วนแรกก่อน Spec doc | The agent asked clarifying questions about project structure first, then produced a complete specification.md with all 11 required sections. Starting with the spec before any code was the right call. |
| Write all 3 docs at once | ทำ 3 ไฟล์เลย์ | Writing tests.md, ui-spec.md, and api-spec.md in parallel saved time. The agent read the existing lab-01 docs to match the format, then generated comprehensive content for all three files simultaneously. |
| Save AI prompts | บันทึก AI prompt ให้ด้วย | The agent followed the existing lab-01 ai_use.md format and documented all key prompts from this session with reflections. |

### Complete Prompt Log (in step order)

| Step | Prompt Name | Actual Prompt Text (verbatim) |
| --- | --- | --- |
| 1 | Review PDF labsheet | review [PDF 1] ว่าต้องทำไรบ้าง |
| 2 | Start with spec doc | เริ่มทำส่วนแรกก่อน Spec doc |
| 3 | Check for edits | ไม่ต้องการแก้ไขอะไร เราต้องทำอะไรต่อ |
| 4 | Write 3 docs at once | ทำ 3 ไฟล์เลย์ |
| 5 | Save AI prompts and create Issues | บันทึก AI prompt ให้ด้วยสิ จากนั้นพาเราสร้าง Issue หน่อย ว่าทำยังไง |

## Lab 2 — Issue 2 Database Schema and Seed (opencode)

### Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| --- | --- | --- |
| Merge confirmed | Issue 1 ถูก merge แล้ว | The agent verified the merge via `gh pr view` and `git fetch`, confirmed staging was up to date, then asked before starting the next issue. Checking facts before moving on saved us from building on a stale branch. |
| Check branch health | ตรวจสอบสถานะ branch ก่อน ตอนนี้เป็นไงอ่ะ | The agent showed per-branch status (current branch, uncommitted reviewer.md, merged-but-unclosed feature branch) and verified the leftover reviewer.md content was written by another terminal before deciding how to handle it. |
| Align with reviewer | feature/1-spec-docs merge เข้าอะไร | The agent proved the merged content was still the placeholder reviewer.md, not the actual review, which correctly stopped us from assuming it was done. |
| Skip reviewer first | เรื่อง reviewer.md ค่อยทำตอน feature ที่ 2 ข้ามอันนี้ไปก่อน ขอดูก่อนว่า workflow มันถูกต้องมั้ย | I asked to validate the workflow before touching anything. The agent contrasted labsheet section 10.1 rules against what we actually did and confirmed every step was correct, which removed my worry. |
| Start Issue 2 | เริ่ม Issue 2 เลย | Clean issue pipeline: create Issue #12 → feature/2-db-schema from staging → schema + migration + idempotent seed → seed content tests → `npm test` 14 passed → PR #13. The agent also stashed the leftover reviewer.md first to keep the branch clean. |
| Preview website request | ต้องมี test หน้าเว็บไรมั้ย เราอยากดูว่าเว็บจะออกมาเป็นไงอ่ะ | Close-ended: I would only preview, not implement. The agent answered from tests.md (UI-SELECT-01..04 planned) and offered to run dev server — but I chose to wait for approval. |
| Persist session log | ถ้ามีการเก็บ log หรือ prompt หรือข้อมูลเอาไว้ให้ AI อ่านก็ดี... | The user asked for a handoff mechanism so a freshly opened AI session resumes without re-explaining. Solution: `AGENTS.md` at repo root (auto-loaded by opencode on startup) + pointer at workspace root, plus keeping `ai-use.md` as committed evidence. |

### Complete Prompt Log (in step order)

| Step | Prompt Name | Actual Prompt Text (verbatim) |
| --- | --- | --- |
| 1 | Check PR status | ให้ตรวจสอบสถานะว่า PR ที่สร้างไป merge แล้วหรือยัง |
| 2 | Run all checks | เช็คสถานะ staging ว่ามี feature ใหม่หรือยัง แล้วดูว่า main ยังไม่ถูกแตะ |
| 3 | Review nonzero state | ดู reviewer.md ของ staging กับที่เราแก้มั้ยว่าอันไหนต่างกัน ให้ตรวจสอบ status ก่อน |
| 4 | Issue 2 | เริ่ม Issue 2 เลย |
| 5 | Preview intent | ต้องมี test หน้าเว็บไรมั้ย เราอยากดูว่าเว็บจะออกมาเป็นไงอ่ะ |
| 6 | Session log | ให้เก็บ log/prompt/ข้อมูลไว้ให้ AI อ่าน เพื่อเปิด session ใหม่ไม่ต้องเริ่มใหม่ |

## Lab 2 — Issue 3 Requester Context and Dev Selection (opencode)

### Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| --- | --- | --- |
| Ask Issue 3 scope | Issue 3 ทำไรอ่ะ ยังไม่ต้องทำนะ รอเพื่อน approve ก่อน อันนี้แค่สอบถามเฉย ๆ | I clarified Issue 3 is Requester Context (RequesterUserContext + Dev Selection UI + app shell) with tests UI-SELECT-01..04 and API-REQ-01..03 — user chose to wait for approval. |
| UI tests needed | ต้องมี test หน้าเว็บไรมั้ย เราอยากดูว่าเว็บจะออกมาเป็นไงอ่ะ | The agent listed planned UI tests from tests.md and explained the Requester Selection screen only appears after Issue 3. |
| Session log request | ถ้ามีการเก็บ log หรือ promt หรือข้อมูลเอาไว้ให้ AI อ่านก็ดี... | User requested persistent handoff log. I created `toktickit/AGENTS.md` (main) + pointer at workspace root, both auto-loaded by opencode on new session. |
| Start Issue 3 | เพื่อน approve และ merge แล้ว do Issue 3 | Verified PR #13 merged (`gh pr view` + `git fetch`), updated AGENTS.md, created Issue #14 and `feature/3-requester-context` from latest staging. |
| Duplicate PR check | ทำไมเรามี PR issue 3 สองอันอ่ะ | Checked `gh pr list` — only PR #15 exists for Issue 3; the other item (#14) is the GitHub Issue itself, not a duplicate PR. |
| Issue vs PR confusion | https://github.com/ssiriwan/toktickit/issues/14 มันมีอันนี้ด้วยอ่ะ คือไรอ่ะ แต่เพื่อนเรารีวิว 15 แล้วนะ แต่มันยังไม่ merge | Explained Issue = task, PR = delivery; Issue stays OPEN until PR merges, and `gh pr view 15` showed no approved review yet (reviewDecision empty). |
| Review localStorage | เพื่อนรีวิวมาแบบนี้ GET /api/requesters ... Please wire AppShell ... | Friend requested 5 fixes (context wiring, localStorage, relative /api, name asc, Lab 3 sentence) but cited their own spec line numbers; BR-06 in our spec is summary 150, not persistence. |
| Check localStorage | แล้วเรามี localStorage รึเปล่า | Grepped codebase — no localStorage usage; only mentions were in `reviewer.md` describing friend's repo, not ours. |
| Need localStorage? | จำเป็นต้องมี localStorage มั้ย | Per our BR-03 (testing context, not auth) localStorage/X-Requester-Id is not required; good to add persistence but not mandatory. Recommended minimalist fix. |
| Explain context wiring | Wire AppShell ผ่าน context คืออะไร | Explained dead code: AppShell used local useState while Context held unused state; wiring moves state into provider so `useRequester()` is single source. |
| Summarize and reply | ตอนนี้เราคือทำอะไรไปบ้างอ่ะ แล้วจากคอมเม้นเพื่อนมีอันไหนที่คิดว่าปรับแล้วดี ... | Triaged 5 points into fix (context, relative /api, name asc) vs explain (localStorage/header, Lab 3 sentence) and drafted English reply. |
| Request English | ขออังกฤษ | Provided English summary and draft reply. |
| Fix as promised | ให้แก้ตามที่เราบอกเขาเลยว่าจะแก้อะไรบ้าง | User confirmed to fix the 3 agreed points; implemented context wiring, relative /api + Vite proxy, name asc + test assert, handled Docker port 5434 conflict (stopped selab24-db, recreated toktickit-db), 22 tests passed, pushed `b61ae09` and commented on PR #15. |

### Complete Prompt Log (in step order)

| Step | Prompt Name | Actual Prompt Text (verbatim) |
| --- | --- | --- |
| 1 | Ask Issue 3 scope | Issue 3 ทำไรอ่ะ ยังไม่ต้องทำนะ รอเพื่อน approve ก่อน อันนี้แค่สอบถามเฉย ๆ |
| 2 | UI tests needed | ต้องมี test หน้าเว็บไรมั้ย เราอยากดูว่าเว็บจะออกมาเป็นไงอ่ะ |
| 3 | Session log request | ถ้ามีการเก็บ log หรือ promt หรือข้อมูลเอาไว้ให้ AI อ่านก็ดี แบบ ตอนที่เราเปิด AI ขึ้นมาใหม่จะได้ไม่ต้องเริ่มใหม่ แต่ว่าอ่านจากที่เคยคุยกันไว้ |
| 4 | Start Issue 3 | เพื่อน approve และ merge แล้ว do Issue 3 |
| 5 | Duplicate PR check | ทำไมเรามี PR issue 3 สองอันอ่ะ |
| 6 | Issue vs PR | https://github.com/ssiriwan/toktickit/issues/14 มันมีอันนี้ด้วยอ่ะ คือไรอ่ะ แต่เพื่อนเรารีวิว 15 แล้วนะ แต่มันยังไม่ merge |
| 7 | Wait for merge | โอเค ถ้างั้น รอก่อน ถ้าเพื่อน merge แล้วเราจะมาบอกนะ |
| 8 | Friend review | เพื่อนรีวิวมาแบบนี้ GET /api/requesters correctly filters ... Please wire AppShell ... |
| 9 | Check localStorage | แล้วเรามี localStorage รึเปล่า |
| 10 | Need localStorage | จำเป็นต้องมี localStorage มั้ย |
| 11 | Explain wiring | Wire AppShell ผ่าน context คืออะไร |
| 12 | Summarize and reply | ตอนนี้เราคือทำอะไรไปบ้างอ่ะ แล้วจากคอมเม้นเพื่อนมีอันไหนที่คิดว่าปรับแล้วดีบ้าง ... |
| 13 | Request English | ขออังกฤษ |
| 14 | Fix as promised | ให้แก้ตามที่เราบอกเขาเลยว่าจะแก้อะไรบ้าง |
| 15 | Issue 3 merged | เพื่อน merge issue 3 ให้แล้ว |

## Lab 2 — Issue 4 Ticket Creation (API + Form) (opencode)

### Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| --- | --- | --- |
| Start Issue 4 | เพื่อน merge issue 3 ให้แล้ว / เริ่มเลย เอาตาม workflow เป๊ะ ๆ เลยนะ | Created Issue #16 and `feature/4-ticket-creation` from latest staging, read api-spec §4 and ui-spec §5.2, wrote failing API-TICKET-01..10 and UI-CREATE tests first (TDD). |
| Special tests | แล้วมีอะไรที่ต้องเทสเป็นพิเศษมั้ย | Listed special cases: trim, unique TK-YYYYMMDD-XXXX, inactive requester 404, field-level validation, busy/preserve values. |
| PR description review | เอาที่จะให้เพื่อนดูให้อ่ะ คือตอนนี้แกเขียนไปแค่นี้ ... | Reviewed PR #17 description; noted it covers core but missing AC checklist and file mapping. |
| How to build/test | เพื่อนบอกให้เราลอง build test เองก่อนทำยังไงอ่ะ | Explained `docker ps` + `npm test` (37 passed) + `npm run build` (tsc clean). |
| Run tests now | ก็ยังไม่เข้าใจว่าคืออะไร งั้นลองเทสเลย | Ran full suite: 12 files 37 passed, build clean, explained warnings are not failures. |
| How to open web | แล้วถาเราจะเปิดเว็บ ทำไง้ | Explained `npm run dev:server` (3000) + `npm run dev:client` (5173, proxy /api) → http://localhost:5173. |
| Show UI spec | ขอดู spec ในเรื่อง UI หน่อยว่ามีอะไรบ้าง | Summarized `ui-spec.md` sections 1-11 (tokens, App Shell, 4 screens, responsive, a11y). |
| Submit fails + white page | เรา submit Ticket ไม่ได้อ่ะ แปลกมั้ย ... Zen Green Theme | Explained submit needs server running and required fields; white page is expected until Issue 7 (Zen Green Theme). |
| Slow down | เดี๋ยวค่อยไปเรื่อย ๆ ละกัน | Agreed to wait for review and proceed step by step. |
| Roadmap summary | ช่วยสรุปให้หน่อยว่าแผนที่จะพัฒนาต่อ ๆ ไปคืออะไรแล้วทำอะไรไปแล้วบ้าง | Summarized done (1-4) and remaining 5-8 (My Tickets, Detail+Attachments, Theme, E2E). |
| Friend review Issue 4 | https://github.com/ssiriwan/toktickit/pull/17 เพื่อนเรา review ว่า Needs fix: server/src/app.ts:71 ... | Friend requested 8 fixes (validation details, TK collision retry, fetch ok check, error placement, *, counters, success state, Cancel, router). |
| Are fixes good? | ที่แก้ไปคือมันทำให้ดีขึ้นใช่มั้ย ลืมถาม | Explained each fix improves robustness/spec compliance (full details, integer checks, retry up to 5, ok check, a11y, router). |
| Reply wording | โอเค ถ้าแก้แล้วขอคำที่จะเอาไปตอบเม้นหน่อย | Provided English reply for PR #17 covering all 8 points (`d70457a`). |
| Issue 4 merged | issue 4 has merged | Verified PR #17 merged (`2343675`), updated AGENTS.md. |
| Start Issue 5 | เริ่มเลยค่ะ | Created Issue #18 and `feature/5-my-tickets` from latest staging. |

### Complete Prompt Log (in step order)

| Step | Prompt Name | Actual Prompt Text (verbatim) |
| --- | --- | --- |
| 1 | Start Issue 4 | เริ่มเลย เอาตาม workflow เป๊ะ ๆ เลยนะ |
| 2 | Special tests | แล้วมีอะไรที่ต้องเทสเป็นพิเศษมั้ย |
| 3 | PR description | เอาที่จะให้เพื่อนดูให้อ่ะ คือตอนนี้แกเขียนไปแค่นี้ |
| 4 | How to build/test | เพื่อนบอกให้เราลอง build test เองก่อนทำยังไงอ่ะ |
| 5 | Run tests | ก็ยังไม่เข้าใจว่าคืออะไร งั้นลองเทสเลย |
| 6 | Open web | แล้วถาเราจะเปิดเว็บ ทำไง้ |
| 7 | Show UI spec | ขอดู spec ในเรื่อง UI หน่อยว่ามีอะไรบ้าง |
| 8 | Submit fails | เรา submit Ticket ไม่ได้อ่ะ แปลกมั้ย กับตอนนี้หน้าทุกอย่างมันขาวหมดเลย ไม่ใช่ Zen Green Theme หรือจะพัฒนาต่อตอนหลัง |
| 9 | Slow down | เดี๋ยวค่อยไปเรื่อย ๆ ละกัน |
| 10 | Roadmap | ช่วยสรุปให้หน่อยว่าแผนที่จะพัฒนาต่อ ๆ ไปคืออะไรแล้วทำอะไรไปแล้วบ้าง |
| 11 | Friend review | https://github.com/ssiriwan/toktickit/pull/17 เพื่อนเรา review ว่า Needs fix: ... |
| 12 | Are fixes good | ที่แก้ไปคือมันทำให้ดีขึ้นใช่มั้ย ลืมถาม |
| 13 | Reply wording | โอเค ถ้าแก้แล้วขอคำที่จะเอาไปตอบเม้นหน่อย |
| 14 | Issue 4 merged | issue 4 has merged |
| 15 | Start Issue 5 | เริ่มเลยค่ะ |

## Lab 2 — Issue 5 My Tickets (List, Search, Filter, Sort, Pagination) (opencode)

### Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| --- | --- | --- |
| Friend review Issue 5 | เพื่อน review ว่า Needs fix: server/src/app.ts:214 ... | Friend requested 6 fixes (header vs query, pageSize 50 vs 5/10/25, double filtering, missing Category/System/Status/Priority filters + Sort + Pagination, missing category/priority/date in list, pagination metadata). |
| Triage request | ดูทีว่าต้องแก้อะไรบ้าง อันไหนที่ทำแล้วดีให้ทำ | Triaged into fix (2-6) vs compromise (1): keep query + add header fallback, fix NaN/0 →400, remove client summary-only filter, add full UI controls, show extra fields, render pagination metadata. |
| Do good fixes | ถ้าดีก็ทำเลยเพื่อน | Implemented GET /api/tickets strict page/pageSize validation + X-Requester-Id support, rewrote MyTickets with full filters/sort/pagination and server-driven search, 52 tests passed, pushed `49d10d9` and commented on PR #19. |
| Update ai-use | คุณยัง update ai-use.md ให้เราอยู่รึเปล่า ถ้าไม่ อัพเดตที่เคยคุยไว้ด้วย ... | User requested continuous updates; updated this file with Issues 3-5 logs and committed to updating after every conversation going forward. |

### Complete Prompt Log (in step order)

| Step | Prompt Name | Actual Prompt Text (verbatim) |
| --- | --- | --- |
| 1 | Friend review | เพื่อน review ว่า Needs fix: server/src/app.ts:214 ... |
| 2 | Triage | ดูทีว่าต้องแก้อะไรบ้าง อันไหนที่ทำแล้วดีให้ทำ |
| 3 | Do fixes | ถ้าดีก็ทำเลยเพื่อน |
| 4 | Update ai-use | คุณยัง update ai-use.md ให้เราอยู่รึเปล่า ถ้าไม่ อัพเดตที่เคยคุยไว้ด้วย แล้วหลังจากนี้ก็อัพเดตที่เราคุยกันทุกครั้งเรื่อย ๆ นะ |

## Reflection

Using AI to generate the engineering specification documents was efficient. The agent read the labsheet PDF through a workaround (PyPDF2), explored the existing project structure, and then produced four detailed documents (specification.md, tests.md, ui-spec.md, api-spec.md) that follow the labsheet template.

The most important lesson was giving clear scope instructions: "เริ่มทำส่วนแรกก่อน" (start with the first part) kept the agent focused on specification.md before moving to other docs. When I said "ทำ 3 ไฟล์เลย" (do all 3 files), the agent understood to write the remaining docs in parallel.

I reviewed every generated document against the labsheet requirements and confirmed the content was complete before moving on. I learned that providing the project structure context (through the explore task) helped the agent make better design decisions that align with the existing codebase.

For Issue 2, the disciplined branch workflow paid off: the agent verified merges with actual git/gh state instead of assuming, ensured the DB container was running before migrating, confirmed the seed was idempotent by re-running it, and only opened PR #13 after all 14 tests passed. I also decided not to start Issue 3 until the friend approves PR #13, keeping to one issue at a time per the labsheet. Finally I asked the AI to persist a session handoff log (`AGENTS.md`) so a fresh session resumes with full context instead of starting over.

For Issue 3, the peer review taught me to distinguish repo-specific spec differences (our BR-06 is summary 150, not persistence; BR-03 says testing context, not auth) and to fix only what improves our design (context wiring, relative /api, name asc) while politely explaining the rest. Handling the Docker port 5434 conflict (selab24-db vs toktickit-db) and recreating the container with the same volume kept data intact.

For Issue 4, TDD with failing tests first caught validation gaps early (full details + integer checks, TK collision retry up to 5, fetch ok check, error placement, a11y). Wiring `AppShell` to `react-router-dom` per AD-04 and adding proper success (ticketNumber + View My Tickets / Create another) and Cancel reset made the flow complete. All 37 tests passed and build clean before pushing.

For Issue 5, the review highlighted spec gaps (header vs query, pageSize, double filtering, missing UI controls). Fixing server validation (NaN/0 →400, 1..50, X-Requester-Id fallback) and rebuilding `MyTickets` to be server-driven with full filters/sort/pagination and proper row fields brought us to 52 tests passed. I also fixed test isolation (fileParallelism false + removing per-file disconnects) that caused flaky failures when running via `npm test`.

Going forward, I will keep `ai-use.md` updated after every conversation and keep `AGENTS.md` as the handoff log so any new session resumes without re-explaining.
