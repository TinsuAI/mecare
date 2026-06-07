# Story 5.3: Relay ca sang Dược Sĩ thật & phản hồi khách

Status: done

## Story

As a khách hàng có ca cần dược sĩ,
I want ca của tôi được chuyển dược sĩ thật và nhận lại tư vấn chính xác,
So that tôi được hỗ trợ chuyên môn an toàn.

## Acceptance Criteria

1. **AC1 — Tin chờ cho khách:** Ngay sau khi EscalationCase được tạo (state="open"), MC-Handle-InboundReply gửi cho khách tin chờ qua MC-Zalo-Send: `"Dạ để em hỏi dược sĩ rồi báo lại anh/chị ngay ạ. Trong lúc chờ, anh/chị lưu ý: tạm chưa tự chỉnh liều, nếu có dấu hiệu nặng hơn vui lòng gọi 115 ngay."` Tin gửi qua `bypass_persona: false` (có giọng Dược Sĩ Hải).

2. **AC2 — Relay sang dược sĩ:** Sau tin chờ, hệ thống gửi tin relay sang `PHARMACIST_ZALO_ID` (env var per-tenant) qua MC-Zalo-Send. Tin relay bao gồm đầy đủ: `case_id` duy nhất, tên/định danh khách (`customer_ref` hoặc `customer_id`), nhóm chăm sóc, trigger excerpt nguyên văn từ tin khách, nội dung đầy đủ của tin khách. Ví dụ format: `[MÃ CA: ESC-tructam-20260607-001]\nKhách: Nguyễn Văn A (Nhóm 2)\nTrigger: sốt 39 độ ngày thứ 3\nNội dung: ...`. Relay dùng `bypass_persona: true`.

3. **AC3 — Cập nhật state:** Sau khi relay gửi thành công, EscalationCases.state cập nhật từ `"open"` → `"waiting_pharmacist"` qua Baserow PATCH API. `resolved_at` vẫn null.

4. **AC4 — Phát hiện tin dược sĩ:** MC-Handle-InboundReply phát hiện tin đến từ dược sĩ khi `sender_zalo_id == PHARMACIST_ZALO_ID`. Tin dược sĩ được tách riêng ra nhánh xử lý pharmacist reply — KHÔNG chạy qua luồng classify customer (Guard: Is Opt-Out, Guard: Is Free Form, v.v.).

5. **AC5 — Khớp mã ca (idempotency AR-4):** Hệ thống trích xuất `case_id` từ tin dược sĩ bằng regex pattern `ESC-[A-Z0-9a-z_-]+` (case_id phải xuất hiện trong nội dung tin). Lookup EscalationCase trên Baserow theo `case_id`. Nếu không tìm thấy hoặc state=`"resolved"`: ghi log lỗi, gửi lại dược sĩ thông báo `"Mã ca [X] không tìm thấy hoặc đã xử lý."`, dừng nhánh. Idempotent: cùng case_id nếu đã resolved → không cập nhật lại.

6. **AC6 — Relay phương án sang khách (giữ nguyên nội dung chuyên môn):** AI gửi phương án dược sĩ lại khách bằng giọng persona Dược Sĩ Hải, nhưng **không thay đổi bất kỳ nội dung chuyên môn nào**: liều thuốc, tên thuốc, hướng xử lý, tần suất dùng phải giữ nguyên 100%. Chỉ được thêm prefix persona (ví dụ: `"Dạ anh/chị, dược sĩ tư vấn như sau:\n"`). `bypass_persona: false`.

7. **AC7 — Cập nhật EscalationCase về resolved:** Sau khi gửi phương án dược sĩ cho khách thành công: PATCH Baserow EscalationCases — `pharmacist_reply` = nội dung tin dược sĩ (nguyên văn), `state` = `"resolved"`, `resolved_at` = UTC ISO-8601 timestamp.

8. **AC8 — MC-Relay-Watchdog.json:** File `n8n/workflows/MC-Relay-Watchdog.json` được tạo với:
   - Cron trigger định kỳ 30 phút trong giờ làm việc (`WORKING_HOURS_START`–`WORKING_HOURS_END`)
   - Query Baserow EscalationCases: `state=waiting_pharmacist` AND `created_at` cũ hơn `RELAY_SLA_MINUTES` (env var, default 60)
   - Mỗi case quá SLA: gửi reminder lại pharmacist Zalo với case_id và thông tin ca
   - Nếu ngoài giờ làm việc: không gửi reminder (tránh làm phiền); case được xử lý khi đầu giờ sáng hôm sau

9. **AC9 — Cấu hình tenant:** `tenants/_template.env` có 2 trường mới: `PHARMACIST_ZALO_ID=` (Zalo ID số điện thoại dược sĩ thật — bắt buộc để relay hoạt động) và `RELAY_SLA_MINUTES=60` (ngưỡng SLA watchdog).

10. **AC10 — Regression guard:** Khách hàng không phải pharmacist (sender_zalo_id != PHARMACIST_ZALO_ID) tiếp tục đi qua luồng customer classify đúng như trước. Tests 8.45–8.65 (Story 5.2) phải vẫn pass.

## Tasks / Subtasks

- [x] Task 1: MC-Handle-InboundReply — Thêm nhánh sau `Log Escalation Case Created` (AC1, AC2, AC3)
  - [x] 1.1 Thêm node `Send Waiting Message to Customer` (HTTP Request → MC-Zalo-Send): payload gồm `customer_zalo_id`, `message` = tin chờ + hướng dẫn an toàn, `bypass_persona: false`
  - [x] 1.2 Thêm node `Relay to Pharmacist Zalo` (HTTP Request → MC-Zalo-Send): payload gồm `to: {{ $env.PHARMACIST_ZALO_ID }}`, message format AC2, `bypass_persona: true`
  - [x] 1.3 Thêm node `Update Case: Waiting Pharmacist` (HTTP Request → Baserow PATCH `/database/rows/table/{{ $env.ESCALATION_CASES_TABLE_ID }}/{{ row_id }}/`): `state = "waiting_pharmacist"`. Thêm `Lookup Case Row ID` + `Extract Escalation Row` để lấy Baserow row_id (OpenClaw không trả về Baserow id).
  - [x] 1.4 Nối `Log Escalation Case Created` → `Send Waiting Message to Customer` → `Relay to Pharmacist Zalo` → `Lookup Case Row ID` → `Extract Escalation Row` → `Update Case: Waiting Pharmacist` → `Return Result`

- [x] Task 2: MC-Handle-InboundReply — Thêm nhánh pharmacist reply (AC4, AC5, AC6, AC7)
  - [x] 2.1 Thêm node `Guard: Is Pharmacist Sender` (If) sau `Log Inbound Message`: condition `{{ $json.sender_zalo_id == $env.PHARMACIST_ZALO_ID }}` → true = nhánh pharmacist
  - [x] 2.2 Thêm node `Parse Pharmacist Reply` (Code): extract `case_id` bằng regex `/ESC-[A-Za-z0-9_-]+/` từ webhook message; nếu không match → `case_id = null`
  - [x] 2.3 Thêm node `Guard: Case ID Present` (If): `{{ !!$json.case_id }}` → false → `Notify Pharmacist: No Case ID` → stop
  - [x] 2.4 Thêm node `Lookup Escalation Case` (HTTP GET Baserow): filter `filter__case_id__equal={{ case_id }}`
  - [x] 2.5 Thêm node `Guard: Case Active` (If): `case_found=true AND state != "resolved"` → false → `Notify Pharmacist: Already Resolved` → stop. Thêm `Extract Case Data` code node để expand Baserow results[0].
  - [x] 2.6 Thêm node `Format Relay to Customer` (Code): `message = "Dạ anh/chị, dược sĩ tư vấn như sau:\n" + pharmacist_message`; compute `resolved_at`
  - [x] 2.7 Thêm node `Send Pharmacist Answer to Customer` (HTTP → zalo-bridge /send): `bypass_persona: false`, `customer_id` từ case
  - [x] 2.8 Thêm node `Update Case: Resolved` (HTTP PATCH Baserow): `pharmacist_reply`, `state = "resolved"`, `resolved_at`
  - [x] 2.9 Nối: `Guard: Is Pharmacist Sender` (true) → `Parse Pharmacist Reply` → `Guard: Case ID Present` → `Lookup Escalation Case` → `Extract Case Data` → `Guard: Case Active` → `Format Relay to Customer` → `Send Pharmacist Answer to Customer` → `Update Case: Resolved`

- [x] Task 3: Tạo `n8n/workflows/MC-Relay-Watchdog.json` (AC8)
  - [x] 3.1 Khởi tạo JSON workflow với node `Cron Trigger` mỗi 30 phút
  - [x] 3.2 Thêm node `Guard: Is Business Hours` (Code): inline copy `isBusinessHourGmt7` từ `schedule-utils.js` — nếu ngoài giờ → `Guard: Outside Hours` If node → stop
  - [x] 3.3 Thêm node `Query Overdue Cases` (HTTP GET Baserow): filter `state=waiting_pharmacist` + SLA cutoff timestamp
  - [x] 3.4 Thêm node `Expand Overdue Cases` (Code): iterate + map cases
  - [x] 3.5 Thêm node `Send Reminder to Pharmacist` (HTTP → zalo-bridge /send): `bypass_persona: true`, reminder message với case_id và SLA minutes
  - [x] 3.6 `isBusinessHourGmt7` copy/paste inline vào Code node (KHÔNG import local)

- [x] Task 4: Thêm env vars vào tenant config (AC9)
  - [x] 4.1 Thêm `PHARMACIST_ZALO_ID=` vào `tenants/_template.env`
  - [x] 4.2 Thêm `RELAY_SLA_MINUTES=60` vào `tenants/_template.env`
  - [x] 4.3 Thêm cả 2 vào `.env.example`

- [x] Task 5: Xoá TODO stub trong server.js (AC1 cleanup)
  - [x] 5.1 Xoá dòng `// TODO Story 5.3: ...` tại `openclaw/server.js:213`

- [x] Task 6: Tests (AC1–AC10)
  - [x] 6.1 Tạo `tests/contract/n8n-handle-inbound-reply-relay.test.js` (tests 8.66–8.82) — 17 tests, tất cả pass
  - [x] 6.2 Tạo `tests/contract/n8n-relay-watchdog-structure.test.js` (tests 12.1–12.5) — 5 tests, tất cả pass

## Dev Notes

### Ranh giới kiến trúc — Story 5.2 vs 5.3 vs 5.4

Story 5.2 dừng ở: trigger detected → EscalationCase tạo (state="open") + 115 gửi nếu emergency.
Story 5.3 xử lý: gửi tin chờ cho khách → relay sang dược sĩ thật → nhận phương án → relay lại khách → update state=resolved.
Story 5.4 xử lý: ghi Messages audit trail đầy đủ cho toàn bộ các tin trong Story 5.3 + SLA watchdog alert kênh riêng Tinsu.

**Lưu ý:** Story 5.3 cũng tạo MC-Relay-Watchdog, nhưng watchdog này chỉ gửi reminder cho dược sĩ — alert kênh Tinsu (MC-Alert-Ops) là scope của Story 5.4.

### Relay chain trong MC-Handle-InboundReply

Sau Story 5.3, MC-Handle-InboundReply có 2 nhánh mới:

**Nhánh A — Pharmacist reply (chèn ngay sau Log Inbound Message, TRƯỚC Classify Response):**
```
Log Inbound Message
  ↓
Guard: Is Pharmacist Sender [If] ── true → Parse Pharmacist Reply
                                               ↓
                                      Guard: Case ID Present [If] ── false → Notify No Case ID → end
                                               ↓ true
                                      Lookup Escalation Case [HTTP GET Baserow]
                                               ↓
                                      Guard: Case Active [If] ── false → Notify Already Resolved → end
                                               ↓ true
                                      Format Relay to Customer [Set]
                                               ↓
                                      Send Pharmacist Answer to Customer [HTTP MC-Zalo-Send]
                                               ↓
                                      Update Case: Resolved [HTTP PATCH Baserow]
                                               ↓ end (nhánh riêng, không về Return Result chính)
  ↓ false → Classify Response (luồng customer cũ)
```

**Nhánh B — Sau Log Escalation Case Created (từ Story 5.2):**
```
Log Escalation Case Created
  ↓
Send Waiting Message to Customer [HTTP MC-Zalo-Send]
  ↓
Relay to Pharmacist Zalo [HTTP MC-Zalo-Send]
  ↓
Update Case: Waiting Pharmacist [HTTP PATCH Baserow]
  ↓
Return Result
```

### Format tin relay sang dược sĩ (AC2)

Tin relay phải bao gồm đủ để dược sĩ phản hồi ngay:

```
[MÃ CA: {{ case_id }}]
📋 Khách: {{ customer_ref }} (Nhóm {{ care_group }})
⚠️ Trigger: {{ trigger_excerpt }}
📝 Nội dung tin: {{ customer_content }}

Trả lời bằng cách bao gồm mã ca trong tin nhắn.
```

`customer_ref` = `customer_id` từ Baserow (hoặc `Khách #ID` nếu không có tên). `bypass_persona: true` để tin không qua OpenClaw persona.

### Format tin relay sang khách (AC6)

Chỉ được thêm prefix persona:
```
"Dạ anh/chị, dược sĩ tư vấn như sau:\n" + $json.pharmacist_message_verbatim
```

**CẤM thay đổi:** liều (mg, lần/ngày), tên thuốc, hướng xử lý, tần suất, thời gian dùng. Nếu dev muốn "viết lại cho rõ hơn" — không được, đây là yêu cầu y tế bắt buộc (R2, FR-9).

### Trích xuất case_id từ tin dược sĩ (AC5)

Dược sĩ phải bao gồm mã ca trong tin nhắn khi phản hồi (yêu cầu vận hành, hướng dẫn trong tin relay AC2). Code node Parse Pharmacist Reply:

```js
const msg = $json.message || "";
const match = msg.match(/ESC-[A-Za-z0-9_-]+/);
return [{ json: { ...$json, case_id: match ? match[0] : null } }];
```

### Lookup Baserow EscalationCase theo case_id

Dùng Baserow List Rows API với filter:
```
GET /database/rows/table/{{ ESCALATION_CASES_TABLE_ID }}/?user_field_names=true&filter__case_id__equal={{ case_id }}
```

Kết quả trả về `results` array. Nếu `results.length === 0` → case không tồn tại. Nếu `results[0].state === "resolved"` → đã xử lý.

**Lấy `row_id` Baserow từ kết quả:** `results[0].id` (field `id` tự động của Baserow, không phải `case_id`). Dùng `row_id` này cho PATCH.

**Expand Results pattern (bắt buộc):** Sau node HTTP GET Baserow, dùng `Split Out` node hoặc Code node để extract `$json.results[0]` — KHÔNG access trực tiếp `$json.results[0]` trong node tiếp theo nếu dùng Expression vì n8n context reset sau một số node types.

### Update Case: Waiting Pharmacist (AC3)

Baserow PATCH:
```
PATCH /database/rows/table/{{ ESCALATION_CASES_TABLE_ID }}/{{ row_id }}/?user_field_names=true
Body: { "state": "waiting_pharmacist" }
```

`row_id` lấy từ response của `Create Escalation Case` (Story 5.2 node). Dev cần truyền `row_id` qua workflow — Story 5.2's `Log Escalation Case Created` Set node nên set `escalation_row_id` từ `Create Escalation Case` HTTP response.

**Quan trọng:** Kiểm tra Story 5.2's `Create Escalation Case` HTTP response có trả về `id` (Baserow row ID) không. Nếu không có sẵn trong Log node, Story 5.3 dev cần thêm 1 Set node sau `Create Escalation Case` để capture `id` trước khi `Log Escalation Case Created`.

### MC-Relay-Watchdog.json cron và SLA logic (AC8)

SLA cutoff timestamp trong n8n Code node:
```js
const slaMinutes = parseInt(process.env.RELAY_SLA_MINUTES || "60");
const cutoff = new Date(Date.now() - slaMinutes * 60 * 1000).toISOString();
return [{ json: { sla_cutoff: cutoff } }];
```

Filter Baserow query: `filter__state__equal=waiting_pharmacist` AND `filter__created_at__date__before={{ sla_cutoff }}`.

Dùng inline copy của `isBusinessHourGmt7` từ `n8n/lib/schedule-utils.js` trong Code node — KHÔNG import local (n8n constraint bắt buộc).

### Node count tracking

- Sau Story 5.1: 20 nodes
- Sau Story 5.2: 26 nodes
- Sau Story 5.3: 26 + ~9 mới = **~35 nodes** trong MC-Handle-InboundReply

Test 8.80 (hoặc tương đương) phải enforce `>= 35`.

### Env vars mới

| Var | File | Note |
|-----|------|------|
| `PHARMACIST_ZALO_ID` | `tenants/_template.env` + `.env.example` | Bắt buộc; Zalo ID (số điện thoại) dược sĩ thật |
| `RELAY_SLA_MINUTES` | `tenants/_template.env` + `.env.example` | Default 60; SLA timeout trước khi watchdog reminder |

### Project Structure Notes

- `n8n/workflows/MC-Relay-Watchdog.json` — đã có trong architecture.md file tree (L339), chỉ cần tạo (không phải phát minh mới)
- `openclaw/server.js` chỉ xoá TODO comment — không thêm logic relay mới (relay nằm ở n8n layer)
- `tenants/_template.env` được commit — KHÔNG commit `tenants/tructam.env` thật
- Không cần tạo file OpenClaw plugin mới cho Story 5.3 (relay qua n8n → MC-Zalo-Send → zalo-bridge)
- Tests đặt trong `tests/contract/` (existing pattern), chạy từ `tests/` directory

### n8n Patterns Bắt Buộc (từ Epic 4 learnings)

- **Expand Results:** Sau HTTP GET Baserow trả về `results[]`, luôn Split Out hoặc Code extract trước khi access fields
- **$json context reset:** Sau Merge hoặc Split node, `$json` reset về item mới — không assume fields từ node trước đó vẫn available; dùng `$('Node Name').item.json.field`
- **continueOnFail: true:** Trên tất cả HTTP nodes để tránh workflow crash khi Baserow trả 404/500
- **No local imports:** Code nodes KHÔNG `require('./lib/...')` hay `import` — copy/paste inline
- **link_row fields:** Access bằng `.id` (link_row field trả về array `[{id, value}]`); dùng `field[0].id` không phải `field.id`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.3 — AC spec relay, idempotency, waiting message, timeout]
- [Source: _bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/prd.md#FR-9 — relay flow full spec + verbatim content rule]
- [Source: _bmad-output/planning-artifacts/architecture.md#Integration/Data-Flow — Relay: trigger → EscalationCase → bridge → pharmacist → agent reply → Baserow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-Structure-Mapping — FR-9,FR-10 → MC-Relay-Watchdog + EscalationCases/Messages]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete-Project-Directory — MC-Relay-Watchdog.json line 339]
- [Source: baserow/schema/06-escalation-cases.json — pharmacist_reply, state options, resolved_at fields]
- [Source: tenants/_template.env — PHARMACIST_ZALO_ID pattern + RELAY_SLA_MINUTES]
- [Source: _bmad-output/implementation-artifacts/5-2-phat-hien-trigger-leo-thang-cap-cuu.md — Story 5.2 boundary + node count 26; TODO stub server.js:213]
- [Source: n8n/lib/schedule-utils.js — isBusinessHourGmt7 function để copy inline vào MC-Relay-Watchdog]
- [Source: n8n/workflows/MC-Handle-InboundReply.json — current 26 nodes; thêm vào đây cho Task 1 và Task 2]
- [Source: n8n/workflows/MC-Zalo-Send.json — sub-workflow để gọi gửi tin; payload format]

## Out of Scope

- Ghi Messages audit trail đầy đủ (audit-first) cho tất cả tin trong Story 5.3 — Story 5.4
- SLA watchdog alert sang kênh Tinsu (MC-Alert-Ops) — Story 5.4
- Chủ nhà thuốc xem danh sách ca leo thang + lịch sử — Story 5.4 / Epic 6
- Per-group safety instructions khác nhau trong tin chờ — refinement sau go-live
- Timeout/fallback cho trường hợp NGOÀI giờ làm việc ngoài việc không gửi reminder — Story 5.4 (ghi nhận + báo khách đầu giờ sáng)
- Xử lý đồng thời nhiều ca mở cùng một dược sĩ (multi-case queue) — out of scope v1
- Integration test end-to-end Zalo relay (requires live Zalo session) — vận hành / Story 7.2

## Dependencies

- Story 5.2 (done): `MC-Handle-InboundReply.json` với 26 nodes, node `Log Escalation Case Created` là điểm móc tiếp theo; `openclaw/server.js` có stub `TODO Story 5.3` tại dòng 213; EscalationCases created với `state="open"`, `pharmacist_reply=null`, `resolved_at=null`
- Story 1.3 (done): `case-allocator.mjs` generates `case_id` format `ESC-<slug>-<YYYYMMDD>-<seq>` — regex AC5 match với pattern này
- Story 1.2 (done): Baserow `EscalationCases` table với `pharmacist_reply`, `state`, `resolved_at` fields
- Story 5.1 (done): `MC-Zalo-Send.json` sub-workflow — được gọi bởi cả 4 tin gửi trong Story 5.3 (waiting message, relay to pharmacist, answer to customer, reminder watchdog)
- `n8n/lib/schedule-utils.js` (done): `isBusinessHourGmt7` dùng cho watchdog

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- 42 nodes sau Story 5.3 (was 26 after 5.2; >= 35 target ✓)
- OpenClaw `/tools/create_escalation_case` không trả về Baserow row_id → thêm `Lookup Case Row ID` + `Extract Escalation Row` nodes giữa relay chain để lấy id cho PATCH (story notes cảnh báo khả năng này)
- Zalo-bridge gọi trực tiếp qua `/send` (pattern giống `Send Emergency 115`); audit-first cho relay messages là scope Story 5.4
- Test 8.65 (Story 5.2) cập nhật: "Log Escalation Case Created → Return Result" thành "→ Send Waiting Message to Customer" do Story 5.3 rewire
- 1 pre-existing failure (opt-in-gate.test.js) không liên quan; 698/699 pass

### File List

- n8n/workflows/MC-Handle-InboundReply.json — thêm 16 nodes (Task 1: 5 nodes relay chain; Task 2: 11 nodes pharmacist branch)
- n8n/workflows/MC-Relay-Watchdog.json — tạo mới (AC8 watchdog cron)
- tenants/_template.env — thêm PHARMACIST_ZALO_ID + RELAY_SLA_MINUTES (AC9)
- .env.example — thêm PHARMACIST_ZALO_ID + RELAY_SLA_MINUTES (AC9)
- openclaw/server.js — xoá TODO Story 5.3 stub (Task 5)
- tests/contract/n8n-handle-inbound-reply-relay.test.js — tạo mới, 17 tests 8.66–8.82 (Task 6.1)
- tests/contract/n8n-relay-watchdog-structure.test.js — tạo mới, 5 tests 12.1–12.5 (Task 6.2)
- tests/contract/n8n-handle-inbound-reply-escalation.test.js — cập nhật test 8.65 (Story 5.3 rewire)

## Senior Developer Review (AI)

**Reviewer:** gabenidolcs · **Date:** 2026-06-07 · **Outcome:** APPROVED (with auto-fixes applied)

### Review Summary

All 10 acceptance criteria (AC1–AC10) are fully implemented and covered by 57 contract tests (44 relay + 13 watchdog), all passing. Three issues were found and auto-fixed during review; no CRITICAL issues block approval.

### Issues Found and Fixed

#### [HIGH] MC-Relay-Watchdog: Broken SLA date filter — same-day cases never caught
**File:** `n8n/workflows/MC-Relay-Watchdog.json` · Node: `Query Overdue Cases`

`filter__created_at__date__before={{ $json.sla_cutoff }}` uses Baserow's DATE-only filter, which compares the date portion of `created_at` (e.g., `2026-06-07`) against the date portion of the ISO cutoff. For any case created TODAY, `created_at date < today` is always false — the watchdog never sends same-day SLA reminders, which is the primary use case.

**Fix:** Removed the broken Baserow date filter from the `Query Overdue Cases` URL; moved SLA cutoff filtering to `Expand Overdue Cases` Code node using full ISO timestamp comparison:
```js
const overdue = cases.filter(c => new Date(c.created_at).getTime() < new Date(slaCutoff).getTime());
```

#### [MEDIUM] MC-Relay-Watchdog: `Guard: Outside Hours` name inverted vs condition
**File:** `n8n/workflows/MC-Relay-Watchdog.json` · Node renamed

IF node named `Guard: Outside Hours` had condition `in_business_hours == true` (true branch proceeds during business hours). A future developer reading the name would expect the condition to be the inverse — and might "fix" it, causing reminders to fire at 3 AM.

**Fix:** Renamed to `Guard: In Business Hours` to match the condition. Updated `connections` map and test 12.7 accordingly.

#### [LOW] MC-Relay-Watchdog: Orphan `Split Overdue Cases` node
**File:** `n8n/workflows/MC-Relay-Watchdog.json`

`Split Overdue Cases` (type: `splitInBatches`) was left in the workflow JSON unconnected after the implementation switched to `Expand Overdue Cases` (Code node). Dead node with no inputs or outputs.

**Fix:** Removed node from workflow JSON. No connection changes required (it was isolated).

### Checklist

- [x] Story Status: review
- [x] AC1–AC10 cross-checked vs implementation — all implemented
- [x] File List validated — 8 files all present and committed
- [x] Tests: 57 story-specific tests, 733/734 suite pass (1 pre-existing unrelated failure)
- [x] Code quality review performed on changed files
- [x] Security: env vars via `$env.*` n8n pattern, no secrets in code
- [x] Medical safety AC6: verbatim relay confirmed (`pharmacistMsg` unchanged, prefix only)
- [x] Regression AC10: Guard: Is Pharmacist Sender false branch → Classify Response confirmed
- [x] Issues found: 3 (HIGH×1, MEDIUM×1, LOW×1) — all auto-fixed
- [x] No CRITICAL issues (ACs not implemented or tasks marked done but missing)
- [x] Status promoted: review → done

### Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-06-07 | Dev Agent (claude-sonnet-4-6) | Implementation complete — 42 nodes, 57 tests |
| 2026-06-07 | QA Agent (claude-sonnet-4-6) | QA gap-fill — 35 tests added, 733/734 suite |
| 2026-06-07 | Review Agent (claude-sonnet-4-6) | APPROVED — 3 issues found and auto-fixed in MC-Relay-Watchdog.json |
