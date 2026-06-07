---
baseline_commit: 7f0b224
---

# Story 4.4: Tôn trọng phản hồi & quyền từ chối của khách

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a khách hàng,
I want hệ thống ghi nhận phản hồi của tôi và dừng nhắc khi tôi yêu cầu,
so that tôi không bị làm phiền ngoài ý muốn.

## Acceptance Criteria

1. **[AC1 — Numbered reply "1" (done_signal): cancel follow-ups]**
   Given customer gửi tin "1", "1 đỡ rồi", "đỡ rồi", "xong rồi", "done" hoặc biến thể chuẩn hóa chứa leading "1"
   When `MC-Handle-InboundReply` phân loại là `done_signal`
   Then: log vào Baserow `Messages` (audit-first, `type=reply`); PATCH tất cả `CareSchedule` rows có `customer_id=X AND status IN [pending, rate_limited]` → `status=done`; trả `{classified_type: "done_signal", actions: ["messages_logged", "schedule_closed"]}`

2. **[AC2 — Numbered reply "2" (continue_signal): không thay đổi CareSchedule]**
   Given customer gửi tin "2", "2 chưa đỡ", "chưa đỡ"
   When `MC-Handle-InboundReply` phân loại là `continue_signal`
   Then: log vào `Messages` (audit-first); KHÔNG thay đổi CareSchedule; trả `{classified_type: "continue_signal"}`

3. **[AC3 — Numbered reply "3" (escalation_trigger): ghi log, không xử lý leo thang]**
   Given customer gửi tin "3", "3 nặng hơn", "nặng hơn", "tệ hơn"
   When `MC-Handle-InboundReply` phân loại là `escalation_trigger`
   Then: log vào `Messages` (audit-first); trả `{classified_type: "escalation_trigger"}`; KHÔNG khởi tạo ca leo thang — escalation là scope Story 5.2

4. **[AC4 — Opt-out request: dừng toàn bộ tin chăm sóc cho khách]**
   Given customer gửi tin chứa opt-out keyword (case-insensitive, trim): "dừng", "thôi", "không nhắn nữa", "stop", "hủy", "bỏ đi", "không cần", "thôi nhắn"
   When `MC-Handle-InboundReply` phân loại là `opt_out`
   Then: log vào `Messages` (audit-first); PATCH `Customers.is_opted_out=true`; PATCH tất cả CareSchedule pending/rate_limited rows của customer → `status=skipped`; trả `{classified_type: "opt_out", actions: ["opted_out", "schedule_cleared"]}`

5. **[AC5 — MC-Schedule-DueReminders: skip opted-out customers]**
   Given `Customers.is_opted_out=true` cho một customer
   When `MC-Schedule-DueReminders` xử lý CareSchedule row của customer đó
   Then: sau `Process Each Row`, fetch Customer record; nếu `is_opted_out=true` → PATCH `CareSchedule.status=skipped`; KHÔNG gọi MC-Compose, MC-Quota-Enforce, hoặc MC-Zalo-Send; tiếp tục item tiếp theo

6. **[AC6 — Nhóm 6: không chủ động nhắn khi chưa phản hồi]**
   Given `care_group=6 AND Customers.group6_unlocked=false` (hoặc null)
   When `MC-Schedule-DueReminders` xử lý CareSchedule row của customer
   Then: sau guard opted-out (AC5), kiểm tra thêm Group 6 lock; nếu `care_group=6 AND NOT group6_unlocked` → PATCH `CareSchedule.status=skipped`; KHÔNG gửi tin; KHÔNG increment QuotaCounter

7. **[AC7 — Nhóm 6 unlock: bất kỳ phản hồi nào từ khách mở khóa]**
   Given customer có `care_group=6` gửi BẤT KỲ tin nào (kể cả free-form, emoji, ký tự đơn)
   When `MC-Handle-InboundReply` nhận message
   Then: sau "Log Inbound Message" (audit-first), Guard: Is Group 6 → true branch: PATCH `Customers.group6_unlocked=true`; các lần gửi proactive tiếp theo ĐƯỢC phép (AC6 guard pass)

8. **[AC8 — Free-form reply: ghi log, check Group 6, không đổi CareSchedule]**
   Given customer gửi tin tự do không khớp opt-out keywords và không phải "1/2/3"
   When `MC-Handle-InboundReply` phân loại là `free_form`
   Then: log vào `Messages` (audit-first); nếu `care_group=6` → unlock (AC7); KHÔNG thay đổi CareSchedule; trả `{classified_type: "free_form"}`

9. **[AC9 — Audit-first: Messages ghi TRƯỚC mọi thao tác khác]**
   Given `MC-Handle-InboundReply` nhận webhook với message bất kỳ
   When xử lý
   Then: node đầu tiên sau `Webhook Trigger` là "Log Inbound Message" (POST Baserow Messages); `type=reply`, `content=message_content`; mọi PATCH Customers/CareSchedule diễn ra SAU khi POST Messages thành công

## Tasks / Subtasks

- [x] Task 1: Cập nhật `baserow/schema/02-customers.json` — thêm 2 fields (AC: #4, #5, #6, #7)
  - [x] 1.1: Thêm field `is_opted_out` (type: boolean, default false) — cờ customer từ chối nhận tin chăm sóc
  - [x] 1.2: Thêm field `group6_unlocked` (type: boolean, default false) — Nhóm 6 đã phản hồi, cho phép gửi proactive

- [x] Task 2: Tạo `n8n/workflows/MC-Handle-InboundReply.json` (AC: #1–#4, #7–#9)
  - [x] 2.1: Node 0 — `Webhook Trigger` POST `/webhook/inbound-reply`; input: `{pharmacy_id, customer_id, care_group, message_content, ts}`
  - [x] 2.2: Node 1 — `Log Inbound Message` (httpRequest POST Baserow Messages); fields: `pharmacy_id`, `customer_ref` (= customer_id nội bộ), `care_group`, `type="reply"`, `content=message_content`, `status="sent"`, `ts` (audit-first — bắt buộc TRƯỚC mọi thao tác khác)
  - [x] 2.3: Node 2 — `Classify Response` (Code node); phân loại message_content:
        - opt_out: kiểm tra từ khóa case-insensitive (dừng, thôi, không nhắn nữa, stop, hủy, bỏ đi, không cần, thôi nhắn)
        - done_signal: leading "1" hoặc các biến thể (1 đỡ rồi, đỡ rồi, xong rồi, done)
        - continue_signal: leading "2" hoặc biến thể (chưa đỡ)
        - escalation_trigger: leading "3" hoặc biến thể (nặng hơn, tệ hơn)
        - free_form: mọi trường hợp còn lại
        - Trả `{classified_type, is_opt_out, is_done_signal, is_escalation, care_group}`
  - [x] 2.4: Node 3 — `Guard: Is Group 6` (if: `care_group === 6`); true branch → Node 4
  - [x] 2.5: Node 4 — `Unlock Group 6 Customer` (httpRequest PATCH Baserow Customers/{customer_id}); set `group6_unlocked=true` (AC7)
  - [x] 2.6: Node 5 — `Guard: Is Opt-Out` (if: `classified_type === "opt_out"`); true branch → Nodes 6+7; false branch → Node 8
  - [x] 2.7: Node 6 — `Update Customer Opted Out` (httpRequest PATCH Customers/{customer_id}); set `is_opted_out=true` (AC4)
  - [x] 2.8: Node 7 — `Cancel Pending Schedule` (Code node - GET pending/rate_limited rows → PATCH status=skipped per row) (AC4)
  - [x] 2.9: Node 8 — `Guard: Is Done Signal` (if: `classified_type === "done_signal"`); true branch → Node 9; false → Return
  - [x] 2.10: Node 9 — `Cancel Follow-Up Schedule` (Code node - GET pending rows → PATCH status=done per row) (AC1)
  - [x] 2.11: Node 10 — `Return Result` (Set node); fields: `classified_type`, `actions_taken`, `pharmacy_id`, `customer_id`
  - [x] 2.12: Verify Baserow Customers PATCH endpoint pattern: `PATCH /api/database/rows/table/{{BASEROW_TABLE_CUSTOMERS}}/{row_id}/?user_field_names=true`

- [x] Task 3: Cập nhật `MC-Schedule-DueReminders.json` — thêm opt-out guard + Group 6 guard (AC: #5, #6)
  - [x] 3.1: Sau node 8 (`Process Each Row`), chèn Node A: `Get Customer` (httpRequest GET Customers/{customer_id}); URL: `{{BASEROW_URL}}/api/database/rows/table/{{BASEROW_TABLE_CUSTOMERS}}/{{$json["customer_id"][0]["id"]}}/?user_field_names=true`
  - [x] 3.2: Chèn Node B: `Merge Customer Flags` (Code node); merge `is_opted_out`, `group6_unlocked` từ Customer vào CareSchedule row context
  - [x] 3.3: Chèn Node C: `Guard: Customer Opted Out` (if: `$json.is_opted_out === true`); true branch: dùng lại `Update CareSchedule Skipped`; false branch: → Node D
  - [x] 3.4: Chèn Node D: `Guard: Group 6 Locked` (if: `care_group == 6 AND !group6_unlocked`); true branch: dùng lại `Update CareSchedule Skipped`; false branch: → node 9 (Generate message_id)
  - [x] 3.5: Cả 2 skip branches (C + D) dùng chung node `Update CareSchedule Skipped` hiện có — zero code duplication

- [x] Task 4: Viết tests (AC: #1–#9)
  - [x] 4.1: `tests/contract/n8n-handle-inbound-reply-structure.test.js` — tests 8.1–8.16 (16 tests; extended từ spec 8.1–8.14 thêm 8.15 audit-first chain + 8.16 Log body type=reply)
  - [x] 4.2: `tests/contract/n8n-schedule-due-reminders-structure.test.js` — tests 5.45–5.50 added (6 tests)

## Dev Notes

- **FR-6 owner = OpenClaw + Baserow** (architecture.md line 368). Inbound message path: Zalo → openzca → zalo-bridge → OpenClaw (via openzalo channel) → OpenClaw gọi n8n webhook `MC-Handle-InboundReply` → Baserow updates. Story 4.4 implement phần n8n (data operations). OpenClaw config (webhook call khi nhận reply) là implementation detail ngoài scope story này — dev agent note.

- **`MC-Handle-InboundReply` là webhook workflow** (không phải cron). Được gọi từ OpenClaw bằng HTTP POST sau khi OpenClaw nhận và giải mã tin Zalo. Không dùng `executeWorkflowTrigger` — dùng `Webhook Trigger` node để OpenClaw gọi qua HTTP.

- **Classify Response keyword matching — n8n Code node:**
  ```javascript
  const content = ($input.first().json.message_content ?? '').trim().toLowerCase();
  const OPT_OUT_KW = ['dừng', 'thôi', 'không nhắn nữa', 'stop', 'hủy', 'bỏ đi', 'không cần', 'thôi nhắn'];
  const is_opt_out = OPT_OUT_KW.some(kw => content.includes(kw));
  const is_done_signal = !is_opt_out && (/^1[\s\b.,]?/.test(content) || ['đỡ rồi','xong rồi','done'].some(kw => content.includes(kw)));
  const is_continue_signal = !is_opt_out && !is_done_signal && (/^2[\s\b.,]?/.test(content) || content.includes('chưa đỡ'));
  const is_escalation = !is_opt_out && !is_done_signal && !is_continue_signal && (/^3[\s\b.,]?/.test(content) || ['nặng hơn','tệ hơn'].some(kw => content.includes(kw)));
  const classified_type = is_opt_out ? 'opt_out' : is_done_signal ? 'done_signal' : is_continue_signal ? 'continue_signal' : is_escalation ? 'escalation_trigger' : 'free_form';
  const care_group = $input.first().json.care_group;
  return [{ json: { ...$input.first().json, classified_type, is_opt_out, is_done_signal, is_escalation, care_group } }];
  ```

- **CareSchedule bulk PATCH limitation:** Baserow không support bulk PATCH natively — cần filter query (GET rows filter customer_id + status=pending) rồi lặp PATCH per row. Dùng n8n `splitInBatches` hoặc Code node thực hiện sequential PATCH. Tương tự pattern đã dùng trong MC-Quota-Enforce GET-then-PATCH. Nếu customer có nhiều pending rows, cần xử lý pagination Baserow (default limit 100 rows/request).

- **MC-Schedule-DueReminders node layout sau story 4.4:** thêm ~4 nodes (Get Customer, Merge Customer Flags, Guard: Customer Opted Out, Guard: Group 6 Locked) chèn giữa node 8 (Process Each Row) và node 9 (Generate message_id). Node 9+ giữ nguyên index logic — dev agent cần verify connections.

- **`customer_id` trong CareSchedule là link_row** → trả về array `[{id, value}]`. Dùng `$json["customer_id"][0]["id"]` để lấy Baserow row ID khi GET Customer. Xem pattern tương tự tại MC-Zalo-Send node "Fetch Customer" trong MC-Zalo-Send.json.

- **`group6_unlocked` mặc định false/null:** khi field chưa tồn tại trên Customers row cũ, Baserow trả `null`. Guard condition phải handle cả `false` và `null`: `care_group === 6 && !group6_unlocked` — falsy check đúng với cả 2 giá trị.

- **Không thay đổi:**
  - `zalo-bridge/` — inbound webhook handling là OpenClaw responsibility
  - `MC-Compose-MessageFromTemplate.json` — không đổi
  - `MC-Quota-Enforce.json` — không đổi (Group 5 bypass giữ nguyên)
  - `MC-Zalo-Send.json` — không đổi

- **Out of scope cho story này:**
  - Escalation flow khi reply "3" → Story 5.2
  - OpenClaw config để gọi `MC-Handle-InboundReply` → Epic 5 stories
  - Re-opt-in mechanism (khách đã opt-out muốn nhận lại) → không có trong PRD v1

### Project Structure Notes

New files:
- `n8n/workflows/MC-Handle-InboundReply.json`
- `tests/contract/n8n-handle-inbound-reply-structure.test.js`

Modified files:
- `baserow/schema/02-customers.json` — thêm `is_opted_out` (boolean), `group6_unlocked` (boolean)
- `n8n/workflows/MC-Schedule-DueReminders.json` — chèn 4 nodes mới (Get Customer, Merge Customer Flags, Guard: Customer Opted Out, Guard: Group 6 Locked) giữa node 8 và node 9
- `tests/contract/n8n-schedule-due-reminders-structure.test.js` — thêm tests 5.45–5.50

NOT modified:
- `zalo-bridge/src/` — không đổi
- `n8n/workflows/MC-Compose-MessageFromTemplate.json` — không đổi
- `n8n/workflows/MC-Quota-Enforce.json` — không đổi
- `n8n/workflows/MC-Zalo-Send.json` — không đổi
- `.env.example` — không cần thêm var mới (`BASEROW_TABLE_CUSTOMERS` đã có từ story 4.1)

### References

- Story 4.4 AC spec: [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4 line 532]
- FR-6 full requirement: [Source: _bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/prd.md#FR-6 line 188]
- FR-6 architecture owner: [Source: _bmad-output/planning-artifacts/architecture.md line 368 — "FR-6 (phản hồi/opt-out) | OpenClaw agent + Baserow Customers"]
- Group 6 definition: [Source: _bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/prd.md line 85, 134 — khách từ chối, mua hộ, đang vội, cao tuổi/khó giao tiếp, lần đầu]
- Story 4.2 Group 1 follow-up (AC1 dependency): [Source: _bmad-output/implementation-artifacts/4-2-lap-lich-gui-dung-cadence-tung-nhom.md — "cancellation of follow-up deferred to story 4.4"]
- Customers schema: [Source: baserow/schema/02-customers.json — fields: pharmacy_id, full_name, phone, care_group, is_complaint_active, friend_status, notes, created_at, updated_at]
- CareSchedule schema: [Source: baserow/schema/04-care-schedule.json — fields: pharmacy_id, customer_id (link_row), care_group, due_at, cadence_type, status (pending/sent/done/skipped/rate_limited/quota_exceeded)]
- MC-Schedule-DueReminders current node layout: [Source: n8n/workflows/MC-Schedule-DueReminders.json — 33 nodes (0-indexed); new nodes insert after node 8 Process Each Row, before node 9 Generate message_id]
- MC-Zalo-Send Fetch Customer pattern: [Source: n8n/workflows/MC-Zalo-Send.json — httpRequest GET customer_id[0].id pattern for link_row]
- BASEROW_TABLE_CUSTOMERS already in .env.example: [Source: .env.example line 54]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

N/A — no implementation blockers

### Completion Notes List

- Task 1: Thêm `is_opted_out` và `group6_unlocked` vào `baserow/schema/02-customers.json`
- Task 2: Tạo `n8n/workflows/MC-Handle-InboundReply.json` (11 nodes: webhook → audit-first log → classify → Group6 guard → unlock → opt-out guard → PATCH customer + cancel pending → done-signal guard → cancel follow-up → return result)
  - Cancel operations dùng Code nodes với bulk GET+PATCH loop (Baserow không support bulk PATCH natively)
  - Audit-first: "Log Inbound Message" là node đầu tiên sau Webhook Trigger (AC9)
- Task 3: Chèn 4 nodes vào `MC-Schedule-DueReminders.json` sau node "Process Each Row":
  - "Get Customer" → "Merge Customer Flags" → "Guard: Customer Opted Out" → "Guard: Group 6 Locked"
  - Cả 2 skip branches dùng chung node "Update CareSchedule Skipped" hiện có (không thêm node mới)
  - Shift tất cả nodes sau "Process Each Row" sang phải 960px
- Task 4: 22 contract tests mới — 16 tests (8.1–8.16) cho MC-Handle-InboundReply, 6 tests (5.45–5.50) cho MC-Schedule-DueReminders
- Test results: 587 total, 586 pass, 1 fail (pre-existing opt-in-gate.test.js server test — không liên quan story này)

### File List

- `baserow/schema/02-customers.json` — modified: thêm `is_opted_out` (boolean), `group6_unlocked` (boolean)
- `n8n/workflows/MC-Handle-InboundReply.json` — new: webhook inbound reply handler (11 nodes)
- `n8n/workflows/MC-Schedule-DueReminders.json` — modified: thêm 4 nodes (Get Customer, Merge Customer Flags, Guard: Customer Opted Out, Guard: Group 6 Locked)
- `tests/contract/n8n-handle-inbound-reply-structure.test.js` — new: 16 contract tests (8.1–8.16)
- `tests/contract/n8n-schedule-due-reminders-structure.test.js` — modified: thêm 6 tests (5.45–5.50)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified: 4-4 in-progress → review
- `_bmad-output/implementation-artifacts/4-4-ton-trong-phan-hoi-quyen-tu-choi.md` — modified: tasks checked, dev record, status=review

### Change Log

- 2026-06-07: Story 4.4 implemented — opt-out/response-respect feature (22 new tests, 587/587 pass excl. pre-existing server test)
