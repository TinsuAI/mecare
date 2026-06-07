# Story 2.1: Cổng opt-in — chỉ nhắn khách đã kết bạn

Status: done

## Story

As a hệ thống MeCare,
I want chỉ gửi tin cho khách đã chủ động kết bạn tại quầy,
so that không add lạnh/scrape/nhắn người lạ — giảm rủi ro bị báo xấu/khóa.

## Acceptance Criteria

1. **Given** một khách có `friend_status` ≠ `"friended"` (bao gồm `"none"`, `"pending"`, `"declined"`), **When** zalo-bridge nhận request gửi tin cho khách đó, **Then** chặn gửi ngay, trả về `{ "blocked": true, "reason": "opt_in_required", "friend_status": "<status>" }`, ghi log `[opt-in-gate] BLOCKED pharmacy_id=<id> customer_phone=<phone> friend_status=<status>`, KHÔNG gọi openzca, KHÔNG add lạnh/scrape.

2. **Given** một khách có `friend_status` = `"friended"`, **When** zalo-bridge nhận request gửi tin, **Then** opt-in gate trả về `{ "blocked": false }`, cho phép luồng gửi tiếp tục.

3. **Given** `customer_ref` không tồn tại trong Baserow (lookup trả về 0 rows), **When** zalo-bridge nhận request gửi, **Then** chặn gửi, trả về `{ "blocked": true, "reason": "customer_not_found" }`, ghi log.

4. **Given** Baserow API lỗi khi lookup `friend_status`, **When** zalo-bridge nhận request gửi, **Then** chặn gửi (fail-closed), trả về `{ "blocked": true, "reason": "lookup_error", "error": "<message>" }`, ghi log lỗi — KHÔNG để tin đi qua khi không verify được.

5. **Given** khách vừa kết bạn tại quầy, **When** nhân viên cập nhật Baserow (Story 3.1 phụ trách UI), `friend_status` được set thành `"friended"`, **Then** các request gửi tiếp theo cho khách đó sẽ pass qua opt-in gate (Baserow là source of truth — gate query real-time).

6. **Given** zalo-bridge nhận POST `/send`, **When** payload thiếu `pharmacy_id` hoặc `customer_phone` hoặc `content`, **Then** trả về `400 { "error": "missing_fields", "required": ["pharmacy_id", "customer_phone", "content"] }`.

## Tasks / Subtasks

- [x] Task 1: Tạo `zalo-bridge/src/opt-in-gate.ts` — module check friend_status (AC: #1, #2, #3, #4)
  - [x] 1.1: Export async function `checkOptIn(pharmacyId: string, customerRef: string): Promise<OptInResult>` với type `OptInResult = { blocked: boolean; reason?: string; friend_status?: string; error?: string }`
  - [x] 1.2: Query Baserow `Customers` table: filter by `phone` field (customer_phone — per dev notes), dùng `BASEROW_TOKEN`, `BASEROW_URL`, `CUSTOMERS_TABLE_ID` env vars
  - [x] 1.3: Parse response: 0 rows → `{ blocked: true, reason: "customer_not_found" }`; rows[0].friend_status ≠ "friended" → `{ blocked: true, reason: "opt_in_required", friend_status }` ; rows[0].friend_status === "friended" → `{ blocked: false }`
  - [x] 1.4: Catch fetch error → `{ blocked: true, reason: "lookup_error", error: err.message }` (fail-closed)
  - [x] 1.5: Ghi log với prefix `[opt-in-gate]` cho mỗi kết quả (BLOCKED/ALLOWED/ERROR) bao gồm pharmacy_id, customer_phone, friend_status

- [x] Task 2: Tạo `zalo-bridge/src/send.ts` — /send handler với opt-in gate (AC: #1, #2, #5, #6)
  - [x] 2.1: Export async function `handleSend(req, res, body)` — body pre-parsed từ index.ts
  - [x] 2.2: Validate required fields `{ pharmacy_id, customer_phone, content }` — thiếu → 400 `{ error: "missing_fields", required: [...] }`
  - [x] 2.3: Gọi `checkOptIn(pharmacy_id, customer_phone)` — nếu `blocked` → 403 `{ blocked: true, reason, friend_status?, error? }` — STOP, không xử lý tiếp
  - [x] 2.4: Nếu gate pass → log `[send] ALLOWED pharmacy_id=<id> customer_phone=<phone>`, trả về `202 { "queued": true }` (openzca call là TODO, thực thi ở Story 2.2+)
  - [x] 2.5: Bọc toàn bộ handler trong try/catch → 500 `{ error: "internal_error" }` nếu unexpected throw

- [x] Task 3: Thêm route `/send` vào `zalo-bridge/src/index.ts` (AC: #1, #2, #6)
  - [x] 3.1: Import `handleSend` từ `./send.ts`
  - [x] 3.2: Trong `http.createServer` handler: nếu `req.url === "/send" && req.method === "POST"` → đọc body rồi gọi `handleSend(req, res, body)`
  - [x] 3.3: Parse JSON body: dùng `data` event accumulate chunks, `end` event parse — nếu invalid JSON → 400 `{ error: "invalid_json" }`
  - [x] 3.4: Giữ nguyên `/healthz` handler và 404 fallback — không phá regression

- [x] Task 4: Tạo contract tests `tests/contract/opt-in-gate.test.js` (AC: #1, #2, #3, #4, #6)
  - [x] 4.1: Import `checkOptIn` trực tiếp (unit test kiểu contract — mock `fetch` global)
  - [x] 4.2: Test case `friend_status="none"` → `{ blocked: true, reason: "opt_in_required", friend_status: "none" }`
  - [x] 4.3: Test case `friend_status="pending"` → `{ blocked: true, reason: "opt_in_required", friend_status: "pending" }`
  - [x] 4.4: Test case `friend_status="declined"` → `{ blocked: true, reason: "opt_in_required", friend_status: "declined" }`
  - [x] 4.5: Test case `friend_status="friended"` → `{ blocked: false }`
  - [x] 4.6: Test case Baserow 0 rows → `{ blocked: true, reason: "customer_not_found" }`
  - [x] 4.7: Test case fetch throws → `{ blocked: true, reason: "lookup_error" }` (fail-closed)
  - [x] 4.8: Test `/send` endpoint via HTTP (startServer helper): missing fields → 400; blocked customer → 403; invalid JSON → 400

- [x] Task 5: Thêm env vars vào `.env.example` và `docker-compose.yml` (AC: #1)
  - [x] 5.1: Thêm `BASEROW_TOKEN=`, `BASEROW_URL=http://baserow:80`, `CUSTOMERS_TABLE_ID=` vào `.env.example` (section zalo-bridge)
  - [x] 5.2: `docker-compose.yml` service `zalo-bridge` pass `BASEROW_TOKEN`, `BASEROW_URL`, `CUSTOMERS_TABLE_ID` qua `environment:` block

- [x] Task 6: Chạy full test suite — xác nhận không regression (AC: tất cả)
  - [x] 6.1: 309 tests pass (baseline 293 Story 1.9 + 16 mới)
  - [x] 6.2: 16 contract tests mới pass (Task 4+QA: 7 unit + 3 integration + 3 plain-string + 3 mock-Baserow)
  - [x] 6.3: `tests/api/zalo-bridge.test.js` healthcheck vẫn pass (không phá endpoint cũ)

## Dev Notes

### Opt-in Gate Logic — fail-closed là bắt buộc

Gate phải fail-closed (AC4): nếu Baserow unreachable hoặc lỗi, CHẶN gửi — không để tin đi ra Zalo khi không verify được opt-in. Đây là yêu cầu anti-ban (R1) và pháp lý (không nhắn người lạ).

Chỉ `friend_status === "friended"` mới pass. Ba trạng thái còn lại (`"none"`, `"pending"`, `"declined"`) đều block — bao gồm cả `"pending"` (đã gửi lời mời nhưng khách chưa accept).

### Baserow Query Pattern

```
GET {BASEROW_URL}/api/database/rows/table/{CUSTOMERS_TABLE_ID}/
  ?filter__field_{phone_field_id}__equal={customerRef}
  &user_field_names=true
Authorization: Token {BASEROW_TOKEN}
```

Lưu ý: `customer_ref` trong payload gửi từ n8n/OpenClaw là token ẩn danh (không phải SĐT thật). `deanonymize.ts` (Epic 2 scope) sẽ resolve token → SĐT trước bước openzca. Với Story 2.1, opt-in-gate dùng `customer_ref` để lookup Baserow `Customers` — cần xác nhận field nào trong Customers dùng làm `customer_ref` index (architecture §Data-Layer nói "customer_ref = token ẩn danh" nhưng schema hiện tại không có field này — xem Project Structure Notes).

### customer_ref Gap — cần quyết định trước implement

Schema `Customers` (Story 1.2) không có field `customer_ref` (token ẩn danh). Hiện có: `full_name`, `phone`, `care_group`, `friend_status`. Architecture chỉ nói "customer_ref trong payload tới cloud" — zalo-bridge de-anon.

**Tạm thời cho Story 2.1:** dùng `phone` làm định danh trong `/send` payload (vì zalo-bridge là điểm duy nhất biết PII, và n8n gọi zalo-bridge nội bộ — không ra cloud). Gọi trường này `customer_phone` trong payload để tránh nhầm lẫn. Khi Story epic 4/5 implement PII-min với cloud egress, sẽ thêm `customer_ref` token field vào Customers.

**Điều chỉnh AC/Tasks:** thay `customer_ref` bằng `customer_phone` trong payload `/send`, opt-in-gate query Baserow filter `phone = customer_phone`.

### Baserow API — table ID runtime

`CUSTOMERS_TABLE_ID` lấy từ env var (tương tự pattern Story 1.8 script). Không hardcode ID — mỗi lần apply-baserow-schema tạo table có ID mới. Giá trị thật cho Trúc Tâm instance lưu trong `.env` (không commit).

### /send không block — stub openzca call

Story 2.1 chỉ implement gate. Nếu gate pass → trả `202 { "queued": true }`. Openzca call thật triển khai Story 2.2 (nhịp gửi + jitter + throttle). Ghi log rõ để dev biết đây là stub.

### Không implement add bạn / scrape

Story 2.1 KHÔNG implement bất kỳ "add bạn" flow nào. `friend_status` được set bởi nhân viên quầy thủ công trong Baserow (qua Story 3.1 sau). Story 2.1 chỉ READ `friend_status`, không WRITE.

### Testing với mock fetch

Node 18+ có `fetch` global. Test dùng `--experimental-global-fetch` hoặc Node 22+ (project dùng Node 24 per Story 1.1). Mock `globalThis.fetch` trong test file trước mỗi test case.

Pattern từ Story 1.6 tests (`tests/contract/multi-tenant-spike.test.js`) dùng Node test runner (`node:test`). Áp dụng tương tự.

### Project Structure Notes

```
zalo-bridge/
  src/
    index.ts          (MODIFY: thêm /send route)
    opt-in-gate.ts    (CREATE: gate module)
    send.ts           (CREATE: /send handler)
    lib/
      multi-tenant-spike.mjs  (không đụng — spike-only)
tests/
  contract/
    opt-in-gate.test.js  (CREATE: unit contract tests)
  api/
    zalo-bridge.test.js  (MODIFY: thêm /send integration tests)
.env.example             (MODIFY: thêm BASEROW_TOKEN, BASEROW_URL, CUSTOMERS_TABLE_ID)
docker-compose.yml       (MODIFY: thêm env vars cho zalo-bridge service)
```

**Alignment với architecture:** `zalo-bridge/src/send.ts` có trong architecture planned tree. `opt-in-gate.ts` không listed riêng (grouped trong send.ts scope) — tách riêng để testability.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.1] — User story + AC gốc
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-2] — FR-11, AR-6, AR-7, NFR-1, NFR-4
- [Source: _bmad-output/planning-artifacts/architecture.md#L178] — Anti-ban throttle tại zalo-bridge; FR-11,12,13 → `zalo-bridge/` toàn bộ
- [Source: _bmad-output/planning-artifacts/architecture.md#L241] — customer_ref = token ẩn danh; de-anon chỉ ở zalo-bridge
- [Source: _bmad-output/planning-artifacts/architecture.md#L324-338] — zalo-bridge source tree (send.ts, throttle.ts, deanonymize.ts)
- [Source: _bmad-output/planning-artifacts/architecture.md#L405] — G6 ĐÓNG: multi-tenant yêu cầu supervisor model, per-process isolation thật ở Epic 2
- [Source: baserow/schema/02-customers.json] — friend_status single_select ["none", "pending", "friended", "declined"]
- [Source: zalo-bridge/src/index.ts] — stub hiện tại, healthcheck pattern, TypeScript Node HTTP server

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Used `customer_phone` (not `customer_ref`) per dev notes — phone is current identifier until Epic 4/5 adds token anonymization
- Imports use `.ts` extension (not `.js`) — Node 24 native strip-types requires explicit `.ts` in same-source imports
- `friend_status` Baserow single_select handled via `resolveFriendStatus()` — supports both `{ value: "..." }` object and raw string
- 309 tests pass (16 new: 7 unit + 3 integration + 3 plain-string branch + 3 mock-Baserow; QA gap-fill added post-dev)

### File List

- `zalo-bridge/src/opt-in-gate.ts` — CREATED
- `zalo-bridge/src/send.ts` — CREATED
- `zalo-bridge/src/index.ts` — MODIFIED (added /send route)
- `tests/contract/opt-in-gate.test.js` — CREATED + MODIFIED (QA gap-fill: +6 tests for plain-string branch + mock-Baserow server)
- `.env.example` — MODIFIED (added BASEROW_TOKEN, BASEROW_URL, CUSTOMERS_TABLE_ID)
- `docker-compose.yml` — MODIFIED (added env vars for zalo-bridge)

## Senior Developer Review (AI)

**Reviewer:** gabenidolcs (AI) | **Date:** 2026-06-07 | **Outcome:** APPROVED

### Issues Found & Auto-Fixed

| # | Sev | Issue | Fix Applied |
|---|-----|-------|-------------|
| 1 | MEDIUM | AC#1 log format used `customer_ref=<ref>` — mismatches impl which logs `customer_phone=` | Updated AC#1 text to `customer_phone=<phone>` |
| 2 | MEDIUM | AC#6 `required` array listed `customer_ref` — impl returns `customer_phone` per dev notes decision | Updated AC#6 to `customer_phone` |
| 3 | MEDIUM | Task 6.1/6.2 + completion notes said 303 tests / 10 new — actual 309 / 16 new after QA gap-fill | Updated counts throughout |
| 4 | MEDIUM | `tests/contract/opt-in-gate.test.js` had 6 uncommitted QA gap tests (plain-string branch + mock Baserow) | File List updated; changes committed |
| 5 | LOW | `{ blocked: true, ...gate }` spreads `blocked` twice (harmless — gate.blocked always true at that point) | No fix — acceptable, behavior correct |

### AC Coverage Verified

- AC#1 ✓ — non-friended blocked, 403, `opt_in_required`, log `customer_phone=`
- AC#2 ✓ — friended passes, 202, mock-Baserow integration test
- AC#3 ✓ — 0 rows → `customer_not_found`, 403, integration test
- AC#4 ✓ — fetch throws → fail-closed, `lookup_error`, Baserow HTTP 500 covered
- AC#5 ✓ — real-time Baserow query; `friend_status` update immediately effective
- AC#6 ✓ — missing fields → 400, `required: [pharmacy_id, customer_phone, content]`

### Code Quality

- `resolveFriendStatus()` correctly handles null/string/`{value}` shapes ✓
- Fail-closed on all error paths ✓
- TypeScript types discriminated union `OptInResult` — exhaustive ✓
- No hardcoded table IDs ✓
- `.ts` import extension correct for Node 24 strip-types ✓
