---
baseline_commit: 5dde40a
---

# Story 4.3: Áp rate-limit nhóm + trần gói 1.000 tin/tháng

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a hệ thống MeCare,
I want chặn vượt rate-limit nhóm/khách và trần gói tháng,
so that vừa an toàn anti-ban vừa đúng cam kết gói dịch vụ.

## Acceptance Criteria

1. **[AC1 — 2-layer quota check trước mỗi lần gửi proactive]**
   Given một tin chủ động chuẩn bị gửi
   When `MC-Schedule-DueReminders` chuẩn bị gọi `MC-Zalo-Send`
   Then n8n gọi sub-workflow `MC-Quota-Enforce` trước — truyền vào `pharmacy_id`, `care_group`, `period_month` (YYYY-MM GMT+7); nếu allowed=false → KHÔNG gọi `MC-Zalo-Send`

2. **[AC2 — Layer 1: zalo-bridge 429 → defer + log]**
   Given `MC-Zalo-Send` gọi zalo-bridge nhưng pharmacy đã vượt daily cap (`DAILY_SEND_CAP`)
   When zalo-bridge trả HTTP 429 `{"error": "daily_cap_exceeded"}`
   Then `MC-Schedule-DueReminders` cập nhật `CareSchedule.status = "rate_limited"` (thay vì "send_failed"); tin KHÔNG bị drop vĩnh viễn — CareSchedule row giữ `due_at` cũ để cron lần sau retry

3. **[AC3 — Layer 2: n8n quota check monthly]**
   Given `MC-Quota-Enforce` đọc `QuotaCounter` Baserow filter `pharmacy_id=X AND period_month=YYYY-MM`
   When `sent_count >= cap` (row tồn tại) HOẶC row không tồn tại (tháng mới → allowed=true, sent_count=0)
   Then trả `{allowed: bool, sent_count: int, cap: int, bypassed: false}`; row không tồn tại → allowed=true (chưa gửi gì trong tháng)

4. **[AC4 — Nhóm 5 bypass quota hoàn toàn]**
   Given `care_group === 5` (khiếu nại / khẩn cấp)
   When `MC-Quota-Enforce` nhận `care_group=5`
   Then trả ngay `{allowed: true, bypassed: true}` — KHÔNG đọc Baserow, KHÔNG kiểm tra sent_count; tin luôn được gửi dù quota exhausted

5. **[AC5 — Quota exhausted: dừng gửi + cảnh báo]**
   Given `MC-Quota-Enforce` trả `allowed: false` (sent_count >= cap, care_group ≠ 5)
   When `MC-Schedule-DueReminders` nhận kết quả
   Then cập nhật `CareSchedule.status = "quota_exceeded"`; POST record vào Baserow `Error_Logs` với `{type: "quota_exhausted", pharmacy_id, period_month, sent_count, cap, triggered_at}`; KHÔNG gọi `MC-Zalo-Send`

6. **[AC6 — Increment QuotaCounter sau gửi thành công]**
   Given `MC-Zalo-Send` trả success
   When `MC-Schedule-DueReminders` cập nhật `CareSchedule.status = "sent"`
   Then PATCH `QuotaCounter` tăng `sent_count + 1` cho `pharmacy_id` + `period_month` hiện tại; nếu row chưa tồn tại (tháng mới) → POST row mới với `sent_count: 1, cap: 1000`

7. **[AC7 — QuotaCounter đếm theo chu kỳ tháng/nhà thuốc]**
   Given nhiều nhà thuốc và nhiều tháng
   When hệ thống đếm quota
   Then mỗi cặp `(pharmacy_id, period_month)` là một row độc lập; `period_month` format `YYYY-MM`, tính theo GMT+7; cap mặc định `1000` khi tạo row mới

## Tasks / Subtasks

- [x] Task 1: Tạo `n8n/workflows/MC-Quota-Enforce.json` (AC: #1, #3, #4)
  - [x] 1.1: Node 1 — `executeWorkflowTrigger` nhận input `{pharmacy_id, care_group, period_month}`
  - [x] 1.2: Node 2 — if node "Group 5 Bypass": nếu `$json.care_group === 5` → Return: Bypassed `{allowed: true, bypassed: true}` (true branch exits); false branch → Get QuotaCounter
  - [x] 1.3: Node 3 — `httpRequest` GET QuotaCounter từ Baserow filter pharmacy_id + period_month
  - [x] 1.4: Node 4 — Code node "Eval Quota": count===0 → allowed=true; sent_count < cap → allowed=true; else → allowed=false
  - [x] 1.5: Node 5 — Set node "Return Result" output `{allowed, sent_count, cap, bypassed, quota_row_id}`

- [x] Task 2: Cập nhật `MC-Schedule-DueReminders.json` — chèn quota gate (AC: #1, #4, #5)
  - [x] 2.1: Sau "Guard: Compose Skip" false branch, chèn "Quota Check" (`executeWorkflow` → `MC-Quota-Enforce`) truyền `pharmacy_id`, `care_group`, `period_month`
  - [x] 2.2: Chèn "Guard: Quota Blocked" (`if` — allowed === false) — true: dừng; false: Send Message
  - [x] 2.3: True branch: "Update CareSchedule QuotaExceeded" (PATCH status=quota_exceeded) + "Log Quota Alert" (POST Messages table với content=quota_exhausted, fallback vì không có Error_Logs table)

- [x] Task 3: Cập nhật `MC-Schedule-DueReminders.json` — increment sau gửi thành công (AC: #6, #7)
  - [x] 3.1: Sau "Update CareSchedule Sent", chèn "Get QuotaCounter Row" (GET filter pharmacy_id + period_month)
  - [x] 3.2: Chèn "Guard: Quota Row Exists" (if: count > 0)
  - [x] 3.3: True branch: "Increment QuotaCounter" (PATCH sent_count+1)
  - [x] 3.4: False branch: "Create QuotaCounter Row" (POST với sent_count=1, cap=1000)

- [x] Task 4: Xử lý zalo-bridge 429 → "rate_limited" status (AC: #2)
  - [x] 4.1: Sau "Guard: Send Failed" true branch, chèn "Check Error Type" (if: reason === "daily_cap_exceeded")
  - [x] 4.2: 429 → "Update CareSchedule RateLimited" (status=rate_limited, giữ due_at); khác → "Update CareSchedule SkippedOnSendFail" (status=send_failed)
  - [x] 4.3: MC-Zalo-Send confirmed: "Return: Failed" expose `reason: $('Send via zalo-bridge').json.error` — đủ để phân loại 429. MC-Zalo-Send.json không đổi.

- [x] Task 5: Thêm `BASEROW_TABLE_QUOTA_COUNTER` vào `.env.example` (AC: #1, #3)
  - [x] 5.1: Thêm `BASEROW_TABLE_QUOTA_COUNTER=` sau `BASEROW_TABLE_CARE_SCHEDULE` trong `.env.example`

- [x] Task 6: Viết tests (AC: #1–#7)
  - [x] 6.1: `tests/contract/n8n-quota-enforce-structure.test.js` — 16 contract tests: structure, node names, URL patterns, code logic
  - [x] 6.2: Test 7.15 — Return: Bypassed node có allowed=true, bypassed=true (Group 5 bypass)
  - [x] 6.3: Test 7.13 — Eval Quota xử lý count===0 → allowed=true (tháng mới)
  - [x] 6.4: Test 7.14 — Eval Quota kiểm tra sent_count < cap
  - [x] 6.5: Test 7.14 — Eval Quota kiểm tra sent_count < cap (deny when =)
  - [x] 6.6: `tests/contract/n8n-schedule-due-reminders-structure.test.js` — tests 5.17–5.35 cho quota nodes mới

## Dev Notes

- **AR-6 2-layer architecture (binding constraint):**
  - Layer 1 — zalo-bridge (`throttle.ts`): đã implement `checkDailyCap(pharmacy_id)` + business hours + jitter. Returns HTTP 429 `{"error": "daily_cap_exceeded"}` khi vượt `DAILY_SEND_CAP`. **Không cần thay đổi zalo-bridge cho story này** — 429 xử lý ở n8n (Task 4).
  - Layer 2 — n8n: new `MC-Quota-Enforce` sub-workflow check `QuotaCounter` Baserow. Gọi trong `MC-Schedule-DueReminders` trước `MC-Zalo-Send`.

- **`MC-Quota-Enforce` là sub-workflow** — cùng pattern `executeWorkflowTrigger` như `MC-Compose-MessageFromTemplate` và `MC-Zalo-Send`. Gọi bằng `executeWorkflow` node trong MC-Schedule-DueReminders.

- **`period_month` computation trong n8n:** Dùng Code node: `new Date(Date.now() + 7*3600000).toISOString().slice(0,7)` → "YYYY-MM" GMT+7. Không import từ throttle.ts (khác runtime).

- **QuotaCounter upsert pattern:** Baserow không có native upsert. Pattern: GET filter → if count>0: PATCH; else: POST. Cùng pattern đã dùng cho CareSchedule trong MC-Schedule-DueReminders.

- **Group 5 bypass phải ở n8n layer** vì zalo-bridge không nhận `care_group` trong payload hiện tại (payload: `pharmacy_id`, `customer_phone`, `content`). Bypass logic trong `MC-Quota-Enforce` node 2.

- **Error_Logs Baserow table:** Nếu table chưa tồn tại trong schema, dùng `Messages` table với `content = "quota_exhausted"` và `status = "alert"` thay thế. Ưu tiên kiểm tra Baserow trước khi implement.

- **`rate_limited` CareSchedule status (AC2):** Khi zalo-bridge trả 429 → `CareSchedule.status = "rate_limited"`, KHÔNG xóa `due_at`. Cron lần sau (sau 15 phút) sẽ pick up lại row này nếu `status` = "rate_limited" hoặc "pending". **Verify query trong "Query CareSchedule" node (node 5) có lọc `status IN ["pending", "rate_limited"]` không.** Nếu chỉ lọc "pending" → thêm condition.

- **CareSchedule status vocabulary sau story 4.3:**
  - `pending` → chờ gửi
  - `sent` → gửi thành công
  - `skipped` → bỏ qua (compose failed, ngoài giờ HC, v.v.)
  - `send_failed` → gửi lỗi không phải 429
  - `rate_limited` → zalo-bridge 429, retry tự động lần sau (NEW)
  - `quota_exceeded` → trần gói tháng exhausted (NEW)

- **Không thay đổi MC-Zalo-Send.json** — story này chỉ modify MC-Schedule-DueReminders và tạo MC-Quota-Enforce.

### Project Structure Notes

New files:
- `n8n/workflows/MC-Quota-Enforce.json`
- `n8n/tests/MC-Quota-Enforce.test.js`

Modified files:
- `n8n/workflows/MC-Schedule-DueReminders.json` — thêm ~7 nodes mới (quota gate + increment)
- `.env.example` — thêm `BASEROW_TABLE_QUOTA_COUNTER`
- `n8n/tests/MC-Schedule-DueReminders.test.js` — thêm contract tests cho nodes mới

NOT modified:
- `zalo-bridge/src/throttle.ts` — đã đủ, 429 behavior không đổi
- `zalo-bridge/src/send.ts` — không đổi
- `n8n/workflows/MC-Zalo-Send.json` — không đổi

### References

- Story 4.3 AC spec: [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3 line 512]
- AR-6 2-layer quota architecture: [Source: _bmad-output/planning-artifacts/epics.md#line 66]
- FR-5 rate-limit requirement: [Source: _bmad-output/planning-artifacts/epics.md#line 26]
- QuotaCounter schema: [Source: baserow/schema/07-quota-counter.json — fields: pharmacy_id(link_row), period_month(text YYYY-MM), sent_count(number), cap(number)]
- throttle.ts existing: [Source: zalo-bridge/src/throttle.ts — `checkDailyCap`, `incrementDailyCount`; HTTP 429 in send.ts ~line 67]
- send.ts payload contract: [Source: zalo-bridge/src/send.ts — REQUIRED_FIELDS: pharmacy_id, customer_phone, content]
- MC-Schedule-DueReminders node list: 23 nodes (0-indexed); quota check inserts after node 11 "Guard: Compose Skip"; increment inserts after node 16 "Update CareSchedule Sent"
- Story 4.2 (dependency): [Source: _bmad-output/implementation-artifacts/4-2-lap-lich-gui-dung-cadence-tung-nhom.md]
- MC-Compose pattern (sub-workflow): [Source: n8n/workflows/MC-Compose-MessageFromTemplate.json]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Task 1: Group 5 Bypass implemented as if node (not code node per spec) — semantically equivalent, cleaner routing in n8n
- Task 3: Get QuotaCounter Row uses `results[0].id` and `results[0].sent_count` via n8n expression refs
- Task 4: MC-Zalo-Send "Return: Failed" exposes `reason` field = zalo-bridge error string — confirmed sufficient for 429 detection without modifying MC-Zalo-Send.json
- Task 4: "Update CareSchedule SkippedOnSendFail" status changed from "skipped" → "send_failed" per story status vocabulary
- Task 5: Error_Logs table absent from schema; Log Quota Alert posts to Messages table with type=escalation, content=quota_exhausted, status=failed per dev notes fallback
- Query CareSchedule updated to exclude sent/skipped/send_failed/quota_exceeded via not_equal filters — naturally includes pending + rate_limited
- period_month computed in "Generate message_id" node: `new Date(Date.now() + 7*3600000).toISOString().slice(0,7)` (GMT+7 aware)
- Tests: 552/552 pass (35 new tests added: 16 for MC-Quota-Enforce, 19 for MC-Schedule-DueReminders quota nodes)

### File List

- `n8n/workflows/MC-Quota-Enforce.json` (new)
- `n8n/workflows/MC-Schedule-DueReminders.json` (modified — 10 nodes added, Query URL updated, Generate message_id updated, SkippedOnSendFail status fixed)
- `.env.example` (modified — BASEROW_TABLE_QUOTA_COUNTER added)
- `tests/contract/n8n-quota-enforce-structure.test.js` (new — 16 tests)
- `tests/contract/n8n-schedule-due-reminders-structure.test.js` (modified — tests 5.17–5.35 added)
