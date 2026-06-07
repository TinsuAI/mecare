# Story 5.4: Lưu luồng hội thoại & ca leo thang vào CRM (audit-first)

Status: done

## Story

As a chủ nhà thuốc,
I want mọi tin và ca leo thang được lưu đầy đủ vào CRM,
so that tôi xem lại lịch sử hội thoại và kiểm soát chất lượng chăm sóc.

## Acceptance Criteria

1. **[Audit relay path — waiting message]** Trước khi gửi "Send Waiting Message to Customer" (node 37), ghi một row `Messages` với `type=escalation`, `status=pending`, `case_id`, `customer_ref`, `care_group`, `pharmacy_id`; `message_id` là UUID sinh tại chỗ (audit-first AR-7).

2. **[Audit relay path — relay to pharmacist]** Trước khi gửi "Relay to Pharmacist Zalo" (node 38), ghi một row `Messages` với `type=escalation`, `status=pending`, `case_id`, `customer_ref`, `pharmacy_id`, nội dung là bản relay summary gửi dược sĩ (audit-first AR-7).

3. **[Audit relay path — pharmacist answer to customer]** Trước khi gửi "Send Pharmacist Answer to Customer" (node 35), ghi một row `Messages` với `type=pharmacist_reply`, `status=pending`, `case_id`, `customer_ref`, `care_group`, content = `formatted_message`; `message_id` UUID mới (audit-first AR-7).

4. **[Status update — sent/failed]** Sau mỗi lần gửi Zalo thành công → cập nhật row `Messages` tương ứng sang `status=sent`. Nếu zalo-bridge trả lỗi → `status=failed`; tin không bị bỏ im lặng — lỗi tiếp tục flow (AR-7 no-drop).

5. **[AR-8 — SLA alert to Tinsu]** MC-Relay-Watchdog: khi tìm thấy ca overdue, ngoài việc nhắc dược sĩ (hiện có), còn POST alert lên `ALERT_WEBHOOK_URL` với payload `{ pharmacy_id, overdue_count, case_ids[] }` để chủ nhà thuốc / Tinsu ops biết (AR-8 dedicated alert channel).

6. **[Env var]** `ALERT_WEBHOOK_URL` được thêm vào `tenants/_template.env` (có comment giải thích, commented-out mặc định) và `.env.example` nếu chưa có.

7. **[Baserow view — Messages history]** File `baserow/views/05-messages-history.json`: grid view trên bảng `Messages`, sort `ts` DESC, các cột `customer_ref`, `type`, `status`, `case_id`, `content`, `ts` visible; `error` hidden (chỉ hiện khi cần debug).

8. **[Baserow view — EscalationCases list]** File `baserow/views/06-escalation-cases-list.json`: grid view trên bảng `EscalationCases`, sort `created_at` DESC, tất cả cột visible trừ các FK link row chỉ hiện `case_id`, `state`, `trigger`, `customer_content`, `pharmacist_reply`, `created_at`, `resolved_at`.

## Tasks / Subtasks

- [x] Task 1 — Audit-first nodes cho waiting message (AC1, AC4)
  - [x] 1.1 Thêm Code node "Generate Waiting Message ID" (UUID v4 inline) vào MC-Handle-InboundReply ngay trước node 37 "Send Waiting Message to Customer"
  - [x] 1.2 Thêm HTTP POST node "Audit: Write Waiting Message Pending" → `BASEROW_TABLE_MESSAGES`, body: `{pharmacy_id, customer_ref, message_id, case_id, care_group, type:"escalation", content:"[Tin chờ — đang xử lý ca]", status:"pending", ts:<ISO-UTC>}`
  - [x] 1.3 Sau node 37 gửi Zalo: thêm Code+HTTP node "Update Waiting Message Status" → PATCH Messages row `status=sent` hoặc `status=failed` tùy kết quả zalo-bridge (follow pattern node 19 "Update Messages Status")

- [x] Task 2 — Audit-first nodes cho relay to pharmacist (AC2, AC4)
  - [x] 2.1 Thêm Code node "Generate Relay Message ID" (UUID v4) ngay trước node 38 "Relay to Pharmacist Zalo"
  - [x] 2.2 Thêm HTTP POST node "Audit: Write Relay Message Pending" → `BASEROW_TABLE_MESSAGES`, body: `{pharmacy_id, customer_ref, message_id, case_id, type:"escalation", content:<relay summary body>, status:"pending", ts:<ISO-UTC>}`
  - [x] 2.3 Sau node 38: thêm "Update Relay Message Status" → PATCH Messages `status=sent/failed`

- [x] Task 3 — Audit-first nodes cho pharmacist answer relay to customer (AC3, AC4)
  - [x] 3.1 Thêm Code node "Generate Pharmacist Reply Message ID" (UUID v4) ngay trước node 35 "Send Pharmacist Answer to Customer"
  - [x] 3.2 Thêm HTTP POST node "Audit: Write Pharmacist Reply Pending" → `BASEROW_TABLE_MESSAGES`, body: `{pharmacy_id, customer_ref, message_id, case_id, care_group, type:"pharmacist_reply", content:<formatted_message>, status:"pending", ts:<ISO-UTC>}`
  - [x] 3.3 Sau node 35: thêm "Update Pharmacist Reply Status" → PATCH Messages `status=sent/failed`

- [x] Task 4 — Extend MC-Relay-Watchdog với Tinsu alert (AC5, AC6)
  - [x] 4.1 Thêm HTTP POST node "Send SLA Alert to Tinsu" sau "Has Overdue Cases" true branch, song song với "Expand Overdue Cases" — hoặc trước "Expand Overdue Cases" nếu muốn một alert duy nhất cho cả batch
  - [x] 4.2 Payload: `{ event:"sla_overdue", pharmacy_id: $env.PHARMACY_SLUG, overdue_count: <count>, case_ids: [<list>] }` → POST `$env.ALERT_WEBHOOK_URL`; guard: nếu `ALERT_WEBHOOK_URL` rỗng → skip (node if trước POST)
  - [x] 4.3 Thêm `ALERT_WEBHOOK_URL=` vào `tenants/_template.env` dưới section `# ── Alert / Observability (AR-8) ──`, có comment; kiểm tra `.env.example` đã có chưa (đã có ở line 86)

- [x] Task 5 — Baserow views (AC7, AC8)
  - [x] 5.1 Tạo `baserow/views/05-messages-history.json`
  - [x] 5.2 Tạo `baserow/views/06-escalation-cases-list.json`

- [x] Task 6 — Tests (AC1–AC8)
  - [x] 6.1 Tạo `tests/contract/n8n-messages-audit-structure.test.js` với tests 13.1–13.16:
    - 13.1 MC-Handle-InboundReply có node "Audit: Write Waiting Message Pending" (httpRequest)
    - 13.2 MC-Handle-InboundReply có node "Audit: Write Relay Message Pending" (httpRequest)
    - 13.3 MC-Handle-InboundReply có node "Audit: Write Pharmacist Reply Pending" (httpRequest)
    - 13.4 "Audit: Write Waiting Message Pending" POST đến `BASEROW_TABLE_MESSAGES`
    - 13.5 "Audit: Write Relay Message Pending" POST đến `BASEROW_TABLE_MESSAGES`
    - 13.6 "Audit: Write Pharmacist Reply Pending" POST đến `BASEROW_TABLE_MESSAGES`
    - 13.7 "Audit: Write Waiting Message Pending" nằm TRƯỚC "Send Waiting Message to Customer" trong connection graph
    - 13.8 "Audit: Write Relay Message Pending" nằm TRƯỚC "Relay to Pharmacist Zalo" trong connection graph
    - 13.9 "Audit: Write Pharmacist Reply Pending" nằm TRƯỚC "Send Pharmacist Answer to Customer" trong connection graph
    - 13.10 Có node "Update Waiting Message Status" (code hoặc httpRequest)
    - 13.11 Có node "Update Pharmacist Reply Status" (code hoặc httpRequest)
    - 13.12 Tổng node count MC-Handle-InboundReply ≥ 51 (42 hiện tại + 9 nodes Task 1–3 tối thiểu)
    - 13.13 Có node "Update Relay Message Status" (QA gap-fill AC4)
    - 13.14 "Audit: Write Waiting Message Pending" body có type="escalation"
    - 13.15 "Audit: Write Relay Message Pending" body có type="escalation"
    - 13.16 "Audit: Write Pharmacist Reply Pending" body có type="pharmacist_reply"
  - [x] 6.2 Extend `tests/contract/n8n-relay-watchdog-structure.test.js` tests 12.14–12.20:
    - 12.14 MC-Relay-Watchdog có HTTP POST node tên chứa "Alert" hoặc "Tinsu" (AC5)
    - 12.15 Node "Send SLA Alert to Tinsu" có method POST (AC5)
    - 12.16 Node "Send SLA Alert" URL tham chiếu `ALERT_WEBHOOK_URL` env var (AC5)
    - 12.17 Có If node "Guard: Alert URL Set" (QA gap-fill AC5 guard)
    - 12.18 "Guard: Has Overdue Cases" → "Guard: Alert URL Set" connection
    - 12.19 "Guard: Alert URL Set" true→"Send SLA Alert to Tinsu", false→"Expand Overdue Cases"
    - 12.20 ALERT_WEBHOOK_URL có trong tenants/_template.env (AC6)
  - [x] 6.3 Extend `tests/contract/baserow-views.test.js` với AC7/AC8 view tests (QA gap-fill):
    - AC7: type=grid, table=Messages, sort ts DESC, visible fields, error hidden, description
    - AC8: type=grid, table=EscalationCases, sort created_at DESC, visible fields, FK hidden
  - [x] 6.4 Verify toàn bộ test suite vẫn pass (baseline hiện tại: 733/734)

## Dev Notes

### Env Var Names — Exact Spelling

- Messages table: `$env.BASEROW_TABLE_MESSAGES` (confirmed in .env.example line 53 and node 17)
- EscalationCases table: `$env.ESCALATION_CASES_TABLE_ID` (confirmed in MC-Handle-InboundReply nodes 31, 36, 39, 41 — NOT `BASEROW_TABLE_ESCALATION_CASES`)
- Pharmacy slug for alert payload: `$env.PHARMACY_SLUG`
- Alert webhook: `$env.ALERT_WEBHOOK_URL` (in .env.example line 86, empty)

### Critical Context from Story 5.3

- Story 5.3 explicitly deferred audit-first logging for relay messages: "All Zalo sends use zalo-bridge /send directly (not MC-Zalo-Send sub-workflow); audit-first logging for relay messages is deferred to Story 5.4." [Source: obs 5709]
- MC-Handle-InboundReply hiện có 42 nodes (sau Story 5.3). Story 5.4 thêm ~9–12 nodes → tổng ≥ 51.
- **Row ID gotcha (inherited from 5.3):** OpenClaw `/tools/create_escalation_case` không trả về Baserow integer `row_id`. Nếu task nào cần PATCH Messages row sau khi tạo (để update status), phải lưu row_id từ response của audit write POST (Baserow POST trả về `{ id: <int>, ... }`).

### customer_ref Availability by Branch

- **Waiting message (AC1) & Relay to pharmacist (AC2)** — triggered from customer inbound path. `customer_ref` available from node 2 "Classify Response" output. Use `$('Classify Response').first().json.customer_ref`.
- **Pharmacist answer to customer (AC3)** — triggered from pharmacist reply branch. `customer_ref` is NOT in EscalationCase (only `customer_id` FK is stored). Dev must add a Baserow GET Customer node using `customer_id` to fetch `customer_ref` before the audit write. Alternatively, use `customer_id` as a substitute identifier in the `customer_ref` field for this message type only — document the deviation in a code comment.

### Audit-First Pattern — Follow Nodes 17 & 19

Existing pattern trong FAQ path (reference implementation):
- Node 17 "Audit: Write Messages Pending" → HTTP POST → `$env.BASEROW_URL/api/database/rows/table/$env.BASEROW_TABLE_MESSAGES/?user_field_names=true`
- Node 18 "Execute MC-Zalo-Send" → gửi tin
- Node 19 "Update Messages Status" → Code node dùng `$helpers.httpRequest` inline để PATCH row (lấy row_id từ output node 17)

Relay path audit nodes phải follow **cùng pattern này**: POST trước send → lấy `row_id` từ response → PATCH sau send.

### Message Types

Bảng `Messages.type` (single_select) có sẵn options: `proactive`, `reply`, `escalation`, `pharmacist_reply`.
- Waiting message → `type: "escalation"`
- Relay to pharmacist → `type: "escalation"` (tin nội bộ hệ thống, không phải tin khách)
- Pharmacist answer relayed to customer → `type: "pharmacist_reply"`

### PII-minimization (NFR-5)

Content ghi vào `Messages.content` cho relay path:
- Waiting message content: dùng nội dung tin thật (không có PII — không ghi phone/full_name)
- Relay to pharmacist: ghi relay summary body (có `customer_ref` token, KHÔNG ghi tên/phone khách)
- Pharmacist reply: ghi `formatted_message` (nội dung chuyên môn verbatim — OK vì không có PII)

### AR-8 Alert Payload

MC-Relay-Watchdog "Send SLA Alert to Tinsu" node:
- URL: `={{ $env.ALERT_WEBHOOK_URL }}`
- Method: POST
- Body: `{ "event": "sla_overdue", "pharmacy_id": "{{ $env.PHARMACY_SLUG }}", "overdue_count": <N>, "case_ids": ["ESC-..."] }`
- Guard trước POST: nếu `ALERT_WEBHOOK_URL` không set → skip (If node check `$env.ALERT_WEBHOOK_URL != ""`)
- `ALERT_WEBHOOK_URL` đã có trong `.env.example` line 86 (trống). Chỉ cần thêm vào `tenants/_template.env`.

### PATCH URL Pattern for Status Update

After audit write POST, Baserow returns `{ id: <int>, ... }` as the row. The PATCH URL for status update is:
```
={{ $env.BASEROW_URL }}/api/database/rows/table/{{ $env.BASEROW_TABLE_MESSAGES }}/<row_id>/?user_field_names=true
```
Store `row_id` from audit write response: `$('Audit: Write Waiting Message Pending').first().json.id`

### n8n Code Node Import Restriction

n8n Code nodes KHÔNG dùng `require()` / `import`. Mọi logic phải inline. UUID v4 có thể tạo inline:
```javascript
// UUID v4 inline (không cần require)
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
const message_id = uuidv4();
return [{ json: { message_id } }];
```

### Project Structure Notes

- n8n workflows: `n8n/workflows/MC-Handle-InboundReply.json` và `n8n/workflows/MC-Relay-Watchdog.json`
- Baserow views: `baserow/views/` (follow naming: `<table-number>-<table-name>-<view-purpose>.json`)
- Tenant config: `tenants/_template.env` — thêm section `# ── Alert / Observability (AR-8) ──`
- Tests: `tests/contract/n8n-messages-audit-structure.test.js` (new), `tests/contract/n8n-relay-watchdog-structure.test.js` (extend)

### References

- AR-7 (Audit-first + retry): [Source: _bmad-output/planning-artifacts/epics.md#AR-7]
- AR-8 (Observability solo — alert channel): [Source: _bmad-output/planning-artifacts/epics.md#AR-8]
- FR-10 (Lưu luồng hội thoại & ca): [Source: _bmad-output/planning-artifacts/epics.md#FR-10]
- NFR-5 (PII-minimization): [Source: _bmad-output/planning-artifacts/epics.md#NFR-5]
- Messages schema: [Source: baserow/schema/05-messages.json]
- EscalationCases schema: [Source: baserow/schema/06-escalation-cases.json]
- Audit pattern reference nodes 17–19: [Source: n8n/workflows/MC-Handle-InboundReply.json]
- Story 5.3 deferral note: [Source: obs 5709 — Dev Agent Record completion notes]
- ALERT_WEBHOOK_URL existing entry: [Source: .env.example line 86]
- Baserow view format: [Source: baserow/views/02-customers-by-group.json]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Tasks 1–3: Added 9 audit-first nodes to MC-Handle-InboundReply (UUID gen + HTTP POST audit write + Code PATCH status update for each of 3 send paths). Total nodes: 42 → 51.
- Task 4: Added Guard: Alert URL Set (If) + Send SLA Alert to Tinsu (HTTP POST) to MC-Relay-Watchdog. Guard checks ALERT_WEBHOOK_URL; true→alert→Expand, false→Expand directly.
- Task 4.3: Added ALERT_WEBHOOK_URL section to tenants/_template.env (commented-out, AR-8 header).
- Task 5: Created baserow/views/05-messages-history.json and baserow/views/06-escalation-cases-list.json.
- Task 6: Created n8n-messages-audit-structure.test.js (tests 13.0–13.16). Extended watchdog test with 12.14–12.20. Extended baserow-views.test.js with AC7/AC8 view tests. Updated 5 existing tests broken by new connection graph (8.65, 8.80, 8.103, 8.104, 8.105). Final: 768 tests, 767 pass, 1 pre-existing runtime fail (opt-in-gate requires docker).
- AC3 customer_ref: used customer_id from Format Relay to Customer output (Dev Notes AC3 alternative).

### File List

- n8n/workflows/MC-Handle-InboundReply.json (modified — 9 audit-first nodes, rewired connections)
- n8n/workflows/MC-Relay-Watchdog.json (modified — Guard: Alert URL Set + Send SLA Alert to Tinsu)
- tenants/_template.env (modified — ALERT_WEBHOOK_URL section)
- baserow/views/05-messages-history.json (new)
- baserow/views/06-escalation-cases-list.json (new)
- tests/contract/n8n-messages-audit-structure.test.js (new — 13 tests)
- tests/contract/n8n-relay-watchdog-structure.test.js (modified — 3 tests added)
- tests/contract/n8n-handle-inbound-reply-escalation.test.js (modified — test 8.65 updated)
- tests/contract/n8n-handle-inbound-reply-relay.test.js (modified — tests 8.80, 8.103, 8.104, 8.105 updated)
- tests/contract/baserow-views.test.js (modified — AC7/AC8 view tests added)

## Senior Developer Review (AI)

_Reviewer: Tinsu on 2026-06-07_

### Outcome: APPROVED ✅

### Checklist

- [x] Story file loaded
- [x] Story Status verified as reviewable (was: review)
- [x] Epic 5, Story 4 IDs confirmed
- [x] Architecture/standards docs loaded (AC3 Dev Notes, AR-7/AR-8 reqs, n8n patterns)
- [x] Tech stack: n8n HTTP Request + Code nodes, Baserow REST API, Zalo bridge
- [x] Acceptance Criteria cross-checked against implementation — all 8 ACs implemented
- [x] File List reviewed — 10 files (added missing baserow-views.test.js)
- [x] Tests: 768 tests, 767/768 passing (1 pre-existing opt-in-gate Docker failure — baseline)
- [x] Code quality: audit-first pattern consistent with reference nodes 17/19; continueOnFail=true on all 3 send nodes (AR-7 no-drop)
- [x] Security: no PII in Messages.content (NFR-5 — customer_ref token only, no phone/name)
- [x] Status updated to done

### Findings Fixed (auto-fix)

**[MEDIUM] File List missing `baserow-views.test.js`** — QA phase added AC7/AC8 Baserow view tests to this file; was not listed in story File List. Added.

**[MEDIUM] Completion notes test count stale** — said "750 tests, 749/750 passing"; actual post-QA count is 768 tests, 767/768 passing. Updated.

**[LOW] Task 6 entries incomplete** — Task 6.1 listed tests 13.1–13.12 but QA added 13.13–13.16; Task 6.2 listed 12.14–12.16 but QA added 12.17–12.20; no entry for baserow-views.test.js additions. Updated task list and added Task 6.3 for baserow view tests, renamed old 6.3→6.4.

### Implementation Verification

- All 9 audit-first nodes present in MC-Handle-InboundReply (3× UUID gen + 3× HTTP POST audit write + 3× Code PATCH status)
- Connection graph correct: audit BEFORE send, status update AFTER send — all 6 edges verified
- Audit body types correct: waiting/relay=escalation, pharmacist_reply=pharmacist_reply
- `continueOnFail: true` on all 3 send nodes — AR-7 no-drop upheld
- MC-Relay-Watchdog: Guard: Alert URL Set → true→alert, false→Expand; ALERT_WEBHOOK_URL ref correct
- tenants/_template.env: ALERT_WEBHOOK_URL commented-out with AR-8 section header + description
- Baserow views: 05-messages-history.json and 06-escalation-cases-list.json both match AC spec

### Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-06-07 | claude-sonnet-4-6 (dev) | Initial implementation — 9 audit nodes, SLA alert, Baserow views, tests |
| 2026-06-07 | claude-sonnet-4-6 (QA) | Gap-fill tests 13.13–13.16, 12.17–12.20, baserow-views AC7/AC8 |
| 2026-06-07 | claude-sonnet-4-6 (review) | APPROVED — fixed 3 story artifact documentation gaps; status → done |
