# Story 2.4: Audit-first + retry/queue khi gửi

Status: done

## Story

As a hệ thống MeCare,
I want mọi tin được ghi `Messages` Baserow TRƯỚC khi gửi, có retry backoff và queue khi lỗi,
So that không tin nào mất âm thầm (NFR-4) và có audit đầy đủ (AR-7).

## Acceptance Criteria

1. **Given** tin chuẩn bị gửi **When** xử lý **Then** ghi bản ghi `Messages` (status=`pending`, trường `message_id` là UUID) TRƯỚC khi gọi openzca — audit-first, AR-7.

2. **Given** gửi Zalo lỗi **When** retry **Then** backoff có jitter, tối đa 3 lần; sau 3 lần: (a) gọi `recordSignal("send_error")`, (b) update `Messages` status=`queued`, (c) phát alert `{ event: "session.lost", pharmacy_id, message_id, service: "zalo-bridge" }` tới `ALERT_WEBHOOK_URL` (fire-and-forget), (d) respond 202 `{ queued: true, message_id }` — KHÔNG drop tin.

3. **Given** tin gửi thành công **When** hoàn tất **Then** update `Messages` status=`sent` (idempotent — PATCH cùng row ID); respond 202 `{ sent: true, message_id }`.

## Tasks / Subtasks

- [x] Task 1: Cập nhật `baserow/schema/05-messages.json` — thêm 2 fields và đổi kiểu `pharmacy_id` (AC: 1, 2, 3)
  - [x] 1.1 Đổi field `pharmacy_id` từ `"type": "link_row"` → `"type": "text"` và xóa `"link_table": "Pharmacies"` — zalo-bridge chỉ biết string ID, không biết Baserow row ID; nâng cấp lên link_row khi Pharmacies table seed đủ (Story 3+)
  - [x] 1.2 Thêm field sau `pharmacy_id`: `{ "name": "message_id", "type": "text", "note": "UUID idempotency key — sinh tại zalo-bridge trước khi ghi" }`
  - [x] 1.3 Thêm field sau `ts`: `{ "name": "status", "type": "single_select", "options": ["pending", "sent", "failed", "queued"] }`

- [x] Task 2: Tạo `zalo-bridge/src/messages-client.ts` (AC: 1, 2, 3)
  - [x] 2.1 Import duy nhất: `import { createHash } from "node:crypto"` — không dùng external dep; dùng `.ts` extension theo convention dự án
  - [x] 2.2 Export type: `export type MessageStatus = "pending" | "sent" | "failed" | "queued"`
  - [x] 2.3 Export pure function: `export function makeCustomerRef(pharmacyId: string, customerPhone: string): string` — body: `return createHash("sha256").update(\`${pharmacyId}:${customerPhone}\`).digest("hex").slice(0, 16)` — 16-char hex token, không chứa PII (thoả NFR-5: Messages.customer_ref là ẩn danh)
  - [x] 2.4 Internal helper (không export): `function baserowBase() { return { url: (process.env.BASEROW_URL ?? "http://baserow:80").replace(/\/$/, ""), token: process.env.BASEROW_TOKEN ?? "", tableId: process.env.MESSAGES_TABLE_ID ?? "" }; }` — đọc env trong function để test override hoạt động
  - [x] 2.5 Export async function:
    ```typescript
    export async function createMessageRecord(params: {
      message_id: string;
      pharmacy_id: string;
      customer_phone: string;
      content: string;
    }): Promise<number | null>
    ```
    - Gọi: `POST ${url}/api/database/rows/table/${tableId}/?user_field_names=true`
    - Headers: `{ "Content-Type": "application/json", Authorization: \`Token ${token}\` }`
    - Body (JSON): `{ pharmacy_id: params.pharmacy_id, customer_ref: makeCustomerRef(params.pharmacy_id, params.customer_phone), message_id: params.message_id, type: "proactive", content: params.content, status: "pending", ts: new Date().toISOString() }`
    - On non-2xx: log `console.error("[messages-client] CREATE_FAILED", params.message_id, resp.status)` → `return null`
    - On fetch throw: log `console.error("[messages-client] CREATE_ERROR", params.message_id, err)` → `return null` (KHÔNG throw — audit failure không được block send, NFR-4)
    - On success: `return (data as { id: number }).id`
  - [x] 2.6 Export async function:
    ```typescript
    export async function updateMessageStatus(
      rowId: number,
      status: MessageStatus,
      errorText?: string
    ): Promise<void>
    ```
    - Gọi: `PATCH ${url}/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`
    - Body: `{ status, ...(errorText !== undefined ? { error: errorText } : {}) }`
    - On error: `console.error("[messages-client] UPDATE_FAILED", rowId, status)` — không throw, non-blocking
  - [x] 2.7 Export async function:
    ```typescript
    export async function queueDeadLetter(
      rowId: number | null,
      params: { message_id: string; pharmacy_id: string; customer_phone: string; content: string; error_text: string }
    ): Promise<void>
    ```
    - If `rowId !== null`: gọi `updateMessageStatus(rowId, "queued", params.error_text)`
    - If `rowId === null` (initial createMessageRecord đã fail): gọi `createMessageRecord(params)` lại → nếu trả id mới thì gọi `updateMessageStatus(newId, "queued", params.error_text)`
    - Luôn log: `console.error("[messages-client] DEAD_LETTER", params.message_id, params.error_text)`

- [x] Task 3: Tạo `zalo-bridge/src/openzca-client.ts` (AC: 2, 3)
  - [x] 3.1 Export type: `export type OpenzcaResult = { ok: true } | { ok: false; error: string }`
  - [x] 3.2 Export async function:
    ```typescript
    export async function sendViaOpenzca(
      pharmacyId: string,
      customerPhone: string,
      content: string
    ): Promise<OpenzcaResult>
    ```
    - Đọc `const openzcaUrl = process.env.OPENZCA_URL ?? ""`
    - If `!openzcaUrl`: `console.warn("[openzca-client] OPENZCA_URL not set — stub mode, ok: true"); return { ok: true }` — dev/CI mode; không block
    - `POST ${openzcaUrl}/send` với body: `{ pharmacy_id: pharmacyId, recipient: customerPhone, content }`, `AbortSignal.timeout(10_000)`, header `"Content-Type": "application/json"`
    - Non-2xx: `return { ok: false, error: \`HTTP ${resp.status}\` }`
    - Fetch throw (timeout, network): `return { ok: false, error: err instanceof Error ? err.message : String(err) }`
    - 2xx: `return { ok: true }`

- [x] Task 4: Cập nhật `zalo-bridge/src/send.ts` — thay openzca stub bằng audit-first + retry (AC: 1, 2, 3)
  - [x] 4.1 Thêm imports ở đầu file (giữ imports hiện tại, bổ sung):
    ```typescript
    import { randomUUID } from "node:crypto";
    import { createMessageRecord, updateMessageStatus, queueDeadLetter } from "./messages-client.ts";
    import { sendViaOpenzca } from "./openzca-client.ts";
    import { recordSignal } from "./risk-monitor.ts";
    ```
    Xóa comment TODO: `// Story 2.4: import { recordSignal } from "./risk-monitor.ts"...`
  - [x] 4.2 Ngay sau `incrementDailyCount(pharmacy_id)` (trước applyVariant), thêm:
    ```typescript
    const message_id = randomUUID();
    ```
  - [x] 4.3 Sau `applyVariant` và trước bất kỳ await nào khác, thêm audit-first write:
    ```typescript
    const auditRowId = await createMessageRecord({
      message_id,
      pharmacy_id,
      customer_phone,
      content: variantContent,
    });
    ```
    Đây là AR-7 hard rule: ghi Messages TRƯỚC mọi side-effect (jitter và openzca đều là side-effect).
  - [x] 4.4 Xóa toàn bộ khối `console.log("[send] QUEUED ...")` + `res.writeHead(202, ...)` + `res.end(...)` cũ (stub). Thay bằng retry loop:
    ```typescript
    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastError = "";
    let sendOk = false;

    while (attempt < MAX_RETRIES && !sendOk) {
      const delay = jitterMs();
      await new Promise<void>((r) => setTimeout(r, delay));
      const result = await sendViaOpenzca(pharmacy_id, customer_phone, variantContent);
      if (result.ok) {
        sendOk = true;
      } else {
        lastError = result.error;
        recordSignal("send_error");
        attempt++;
        console.error(
          `[send] ATTEMPT_FAILED attempt=${attempt} pharmacy_id=${pharmacy_id} message_id=${message_id} error=${lastError}`
        );
      }
    }
    ```
  - [x] 4.5 Sau retry loop — happy path (`sendOk === true`):
    ```typescript
    if (auditRowId !== null) {
      await updateMessageStatus(auditRowId, "sent").catch(console.error);
    }
    console.log(`[send] SENT pharmacy_id=${pharmacy_id} message_id=${message_id}`);
    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ sent: true, message_id }));
    return;
    ```
  - [x] 4.6 Sau happy path return — failure path (`sendOk === false`, 3 attempts exhausted):
    ```typescript
    await queueDeadLetter(auditRowId, {
      message_id,
      pharmacy_id,
      customer_phone,
      content: variantContent,
      error_text: lastError,
    }).catch(console.error);

    const alertUrl = process.env.ALERT_WEBHOOK_URL ?? "";
    if (alertUrl) {
      fetch(alertUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: "session.lost",
          pharmacy_id,
          message_id,
          service: "zalo-bridge",
          timestamp_ms: Date.now(),
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(console.error);
    }

    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ queued: true, message_id }));
    ```
  - [x] 4.7 Kiểm tra lại import `jitterMs` — đã có từ Story 2.2; `applyVariant` vẫn dùng `seed = Date.now() % 1000` như cũ; không thay đổi phần đó.

- [x] Task 5: Cập nhật `.env.example` — thêm env vars mới sau `CUSTOMERS_TABLE_ID=` (AC: 1, 3)
  - [x] 5.1 Thêm: `MESSAGES_TABLE_ID=` — Baserow Messages table ID cho audit trail
  - [x] 5.2 Thêm: `OPENZCA_URL=` — URL tới openzca process per-tenant (để trống = stub mode, ok cho dev/CI)

- [x] Task 6: Tests — contract + API (AC: 1, 2, 3)
  - [x] 6.1 Tạo `tests/contract/messages-client.test.js`:
    - Import: `import { createMessageRecord, updateMessageStatus, queueDeadLetter, makeCustomerRef } from "../../zalo-bridge/src/messages-client.ts"`
    - `beforeEach`: mock `globalThis.fetch` bằng reassignment; reset sau mỗi test
    - Test `makeCustomerRef`: (a) same inputs → same output (deterministic); (b) output không chứa customerPhone string (PII-min); (c) output.length === 16
    - Test `createMessageRecord` success: mock fetch trả `{ ok: true }` + body `{ id: 42 }` → returns `42`
    - Test `createMessageRecord` non-2xx: mock fetch trả `{ ok: false, status: 500, text: async() => "err" }` → returns `null` (KHÔNG throw)
    - Test `createMessageRecord` fetch throw: mock fetch throws `new Error("network")` → returns `null` (KHÔNG throw)
    - Test `updateMessageStatus`: mock fetch trả ok → resolves without throw
    - Test `updateMessageStatus` failure: mock fetch throws → does NOT throw (non-blocking)
    - Test `queueDeadLetter` với rowId non-null: verify gọi PATCH (update), không gọi POST (create)
    - Test `queueDeadLetter` với rowId null: verify gọi POST (create) rồi PATCH (update)
  - [x] 6.2 Tạo `tests/contract/openzca-client.test.js`:
    - Import: `import { sendViaOpenzca } from "../../zalo-bridge/src/openzca-client.ts"`
    - `beforeEach`: `delete process.env.OPENZCA_URL` để reset; mock `globalThis.fetch`
    - Test stub mode (`OPENZCA_URL` unset): `sendViaOpenzca(...)` → `{ ok: true }` (không gọi fetch)
    - Test 2xx response: mock fetch trả `{ ok: true, status: 200 }` → `{ ok: true }`
    - Test 5xx response: mock fetch trả `{ ok: false, status: 500, text: async() => "err" }` → `{ ok: false, error: "HTTP 500" }`
    - Test fetch throw: mock fetch throws `new Error("ETIMEDOUT")` → `{ ok: false, error: "ETIMEDOUT" }` (KHÔNG throw)
  - [x] 6.3 Tạo `tests/api/send-audit.test.js` — end-to-end HTTP với 3 mock servers:
    - Ports: bridge=**31332**, mock-Baserow=**31333**, mock-openzca=**31334** (tất cả chưa dùng trong test suite)
    - `before`: start 3 servers; set env: `BASEROW_URL=http://localhost:31333`, `MESSAGES_TABLE_ID=99`, `OPENZCA_URL=http://localhost:31334`, `BASEROW_TOKEN=test`, `CUSTOMERS_TABLE_ID=1`, `CUSTOMERS_TABLE_ID=1` (opt-in gate cần); `ALERT_WEBHOOK_URL=http://localhost:31334/alert` (reuse mock-openzca port để capture alert)
    - mock-Baserow server: track received requests; respond `{ id: 100 }` to POST (create); `{ id: 100 }` to PATCH (update); respond `{ results: [{ friend_status: "friended" }] }` to GET (opt-in lookup)
    - mock-openzca server: configurable response (default 200 OK); track `/send` call count; track `/alert` calls
    - `after`: stop all servers; reset env vars
    - **Test AC1 (audit-first)**: POST /send happy path → verify mock-Baserow received POST với `status: "pending"` TRƯỚC khi mock-openzca nhận `/send`; verify response 202 `{ sent: true, message_id: ... }`; verify mock-Baserow nhận PATCH với `status: "sent"` sau đó
    - **Test AC2 (retry + dead-letter)**: configure mock-openzca trả 500 cho `/send` → verify mock-openzca nhận đúng 3 calls; verify mock-Baserow nhận PATCH `status: "queued"`; verify response 202 `{ queued: true, message_id: ... }`; verify mock-openzca `/alert` nhận `{ event: "session.lost", ... }`
    - **Test AC3 (idempotent update)**: POST /send success → verify PATCH body có `status: "sent"` và KHÔNG có duplicate POSTs cho cùng `message_id`
  - [x] 6.4 Cập nhật `tests/api/zalo-bridge.test.js` — cập nhật assertions cho /send response:
    - Tìm tất cả `assert` checking `{ queued: true }` trong happy-path tests; thay bằng `assert.ok(body.sent === true || body.queued === true)` HOẶC set `OPENZCA_URL=""` trong test setup để dùng stub mode (trả `{ sent: true, message_id }`)
    - Nếu test dùng mock Baserow (chưa set `MESSAGES_TABLE_ID`), `createMessageRecord` sẽ trả null vì `MESSAGES_TABLE_ID=""` → PATCH sẽ skip → không crash; test vẫn pass nếu assert chỉ check status code 202

## Dev Notes

### Send pipeline sau Story 2.4

```
POST /send
  ↓ validate REQUIRED_FIELDS
  ↓ getRiskState() → 503 nếu paused
  ↓ checkOptIn() → 403 nếu blocked
  ↓ isBusinessHour() → 503 nếu ngoài giờ
  ↓ checkDailyCap() → 429 nếu vượt trần
  ↓ incrementDailyCount()       ← Story 2.2 race-condition fix
  ↓ message_id = randomUUID()   ← Story 2.4 NEW
  ↓ variantContent = applyVariant(content, seed)
  ↓ auditRowId = await createMessageRecord(pending)  ← AR-7 AUDIT-FIRST
  ↓ while attempt < 3 && !sendOk:
      jitter → sendViaOpenzca() → ok? exit : recordSignal("send_error") + attempt++
  ↓ success: updateMessageStatus(sent) → 202 { sent: true, message_id }
  ↓ failure: queueDeadLetter() + session.lost alert → 202 { queued: true, message_id }
```

### Baserow env vars pattern

Theo pattern trong `zalo-bridge/src/opt-in-gate.ts`:
- `BASEROW_URL` (default `http://baserow:80`) — dùng nội bộ Docker
- `BASEROW_TOKEN` — dùng token (không phải `BASEROW_API_TOKEN` của Story 1.2)
- `MESSAGES_TABLE_ID` — table-specific ID (theo pattern `CUSTOMERS_TABLE_ID`)
- Đọc env TRONG function body (không cache module-level) để test override hoạt động

### Idempotency của update

`updateMessageStatus` gọi PATCH tới cùng `rowId` — tự nhiên idempotent. Không cần lookup trước khi update.

### openzca stub mode

Khi `OPENZCA_URL=""` (không set): `sendViaOpenzca` trả `{ ok: true }` ngay — toàn bộ CI/test chạy không cần openzca process thật. Retry loop vẫn test được thông qua mock server (Task 6.3).

### PII handling

`customer_ref` trong Messages = `SHA-256(pharmacy_id + ":" + customer_phone).slice(0, 16)`. Đây là deterministic token — không chứa SĐT gốc, không dễ brute-force, đủ unique cho audit context. Satisfies NFR-5 (PII ẩn danh khi ghi ra).

### Baserow link_row → text downgrade

`pharmacy_id` trong `05-messages.json` được đổi từ `link_row` → `text` cho Story 2.4. Lý do: `zalo-bridge` nhận `pharmacy_id` string từ caller; Baserow `link_row` cần integer row ID (lookup Pharmacies). Nâng cấp lên `link_row` thật khi Pharmacies table đã seed (Story 3+) và lookup pattern đã được thiết lập.

### TypeScript conventions (carry-forward từ Story 2.3)

- Import `.ts` extension: `import { foo } from "./bar.ts"` (không bỏ extension)
- Node 24 native TS strip — không transpile, không external deps
- Built-in `fetch` từ Node 18+ — không import
- Module-level state cần `_resetForTesting()` export cho test isolation

### Alert pattern (carry-forward từ risk-monitor.ts)

Session.lost alert trong send.ts dùng cùng pattern với `sendAlert` trong `risk-monitor.ts`: fire-and-forget với `AbortSignal.timeout(5000)`, `.catch(console.error)`.

### Project Structure Notes

- Alignment với unified project structure:
  - `zalo-bridge/src/messages-client.ts` — module mới, pattern giống `opt-in-gate.ts`
  - `zalo-bridge/src/openzca-client.ts` — module mới, wrapper HTTP client
  - `baserow/schema/05-messages.json` — schema extension (backward compatible với seed scripts)
  - `tests/contract/messages-client.test.js` — mới, pattern giống `risk-monitor.test.js`
  - `tests/contract/openzca-client.test.js` — mới
  - `tests/api/send-audit.test.js` — mới, pattern giống `risk-monitor.test.js` (API tests)
- Ports 31332–31334 là available range (31301–31331 đã dùng, 31401 và 31499 đã dùng)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#AR-7] — "Mọi tin gửi/nhận ghi Messages Baserow TRƯỚC khi xử tiếp (audit-first)"
- [Source: _bmad-output/planning-artifacts/architecture.md#AR-7] — "gửi Zalo lỗi → retry backoff jitter, tối đa 3 → phát session.lost alert, tin vào queue không drop"
- [Source: _bmad-output/planning-artifacts/architecture.md#NFR-4] — "không mất tin âm thầm"
- [Source: _bmad-output/planning-artifacts/architecture.md#NFR-5] — "PII ẩn danh: customer_ref dùng token, không phone"
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4] — ACs gốc
- [Source: zalo-bridge/src/opt-in-gate.ts] — Baserow REST pattern: BASEROW_URL, BASEROW_TOKEN, user_field_names=true
- [Source: zalo-bridge/src/risk-monitor.ts] — sendAlert fire-and-forget pattern, recordSignal interface
- [Source: zalo-bridge/src/send.ts] — pipeline hiện tại, TODO comment vị trí Story 2.4 inject
- [Source: zalo-bridge/src/lib/multi-tenant-spike.mjs] — StubAdapter.sendMessage(pharmacyId, msg) interface; LiveAdapter.sendMessage TODO (Epic 2+)
- [Source: baserow/schema/05-messages.json] — Messages table field definitions (pharmacy_id, customer_ref, case_id, type, content, error, ts)
- [Source: _bmad-output/implementation-artifacts/2-3-auto-throttle-theo-tin-hieu-rui-ro.md] — carry-forward patterns: .ts imports, no transpile, no external deps, _resetForTesting()
- [Source: tests/api/risk-monitor.test.js] — API test pattern (ports 31323 + 31324, paired mock servers)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

### Completion Notes

- 387/387 tests pass (370 prior + 17 new)
- messages-client.ts: createMessageRecord never throws (returns null on any failure — audit-first without blocking send)
- openzca-client.ts: stub mode when OPENZCA_URL unset — full CI/dev without real openzca process
- send.ts: jitter now inside retry loop (each attempt gets fresh jitter); audit write before first jitter (AR-7 compliant)
- baserow-schema.test.js: Messages.pharmacy_id allowed as text with TEMP_TEXT_TABLES exception
- opt-in-gate.test.js + send-throttle.test.js: { queued: true } assertions updated to accept sent or queued
- send-audit.test.js AC2: 100ms wait after 202 response to allow fire-and-forget alert delivery

### File List

- baserow/schema/05-messages.json
- zalo-bridge/src/messages-client.ts
- zalo-bridge/src/openzca-client.ts
- zalo-bridge/src/send.ts
- .env.example
- tests/contract/messages-client.test.js
- tests/contract/openzca-client.test.js
- tests/api/send-audit.test.js
- tests/api/send-throttle.test.js
- tests/contract/baserow-schema.test.js
- tests/contract/opt-in-gate.test.js
