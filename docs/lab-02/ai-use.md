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

## Reflection

Using AI to generate the engineering specification documents was efficient. The agent read the labsheet PDF through a workaround (PyPDF2), explored the existing project structure, and then produced four detailed documents (specification.md, tests.md, ui-spec.md, api-spec.md) that follow the labsheet template.

The most important lesson was giving clear scope instructions: "เริ่มทำส่วนแรกก่อน" (start with the first part) kept the agent focused on specification.md before moving to other docs. When I said "ทำ 3 ไฟล์เลย" (do all 3 files), the agent understood to write the remaining docs in parallel.

I reviewed every generated document against the labsheet requirements and confirmed the content was complete before moving on. I learned that providing the project structure context (through the explore task) helped the agent make better design decisions that align with the existing codebase.
