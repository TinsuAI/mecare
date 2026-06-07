# Story 2.5: Giám sát phiên & cảnh báo automation hỏng

Status: review

## Story

As a kỹ sư vận hành,
I want hệ thống phát hiện mất phiên / gửi lỗi liên tiếp / Zalo đổi UI và cảnh báo,
so that xử lý kịp trước khi luồng chăm sóc gãy âm thầm (FR-13, NFR-4).

## Acceptance Criteria

1. **[AC1 — mất phiên → block + alert]**  
   Given zalo-bridge nhận được kết quả health-check thất bại từ openzca (GET `/healthz` trả về non-2xx hoặc timeout)  
   When `session-monitor` xử lý sự kiện `health_fail`  
   Then state chuyển sang `lost`; `sendAlert('session.lost', reason)` được gọi một lần; mọi request `/send` tiếp theo bỏ qua retry loop, dead-letter luôn, trả 202 `{queued: true}` (dừng gửi an toàn — AR-8).

2. **[AC2 — ≥3 tin lỗi liên tiếp → block + alert với lý do rõ]**  
   Given ≥3 lần gọi `/send` liên tiếp đều kết thúc với tất cả retry thất bại (mỗi message exhausted 3 retries)  
   When `session-monitor` nhận đủ 3 sự kiện `send_failure` liên tiếp (không có `send_success` xen giữa)  
   Then state chuyển sang `lost`; alert payload chứa `reason` không rỗng mô tả nguyên nhân cuối cùng; tin bị dead-letter vào Baserow (không mất).

3. **[AC3 — reset khôi phục trạng thái]**  
   Given session-monitor đang ở state `lost`  
   When `POST /session-reset` được gọi  
   Then `consecutive_errors` về 0, `state` về `healthy`; `/send` tiếp theo thực sự gọi openzca (không bị short-circuit).

## Tasks / Subtasks

- [x] Task 1: Tạo `zalo-bridge/src/session-monitor.ts` (AC: 1, 2, 3)
  - [x] 1.1 Định nghĩa types: `SessionState = 'healthy' | 'degraded' | 'lost'`, `SessionEvent = 'send_success' | 'send_failure' | 'health_fail'`
  - [x] 1.2 Module-level state: `state: SessionState = 'healthy'`, `consecutiveErrors = 0`, `lostReason = ''`, `lostSince: number | null = null`
  - [x] 1.3 Export `recordSessionEvent(event: SessionEvent, detail?: string): void`
    - `send_success` → reset `consecutiveErrors = 0`, nếu state != healthy → state = healthy
    - `send_failure` → `consecutiveErrors++`; nếu `consecutiveErrors >= 3` và state != lost → chuyển state = lost, `lostReason = detail ?? 'consecutive_send_failures'`, `lostSince = Date.now()`, gọi `sendAlert('session.lost', lostReason)` từ risk-monitor.ts
    - `health_fail` → nếu state != lost → chuyển state = lost ngay lập tức, `lostReason = detail ?? 'health_check_failed'`, `lostSince = Date.now()`, gọi `sendAlert('session.lost', lostReason)`
  - [x] 1.4 Export `getSessionState(): { state: SessionState; consecutive_errors: number; reason: string; lost_since_ms: number | null }`
  - [x] 1.5 Export `resetSession(): void` — `consecutiveErrors = 0`, `state = 'healthy'`, `lostReason = ''`, `lostSince = null`
  - [x] 1.6 Export `startSessionMonitor(intervalMs?: number): void` — setInterval gọi `checkOpenzcaHealth()` từ openzca-client.ts; nếu `!ok` → `recordSessionEvent('health_fail', error)`; default `intervalMs = Number(process.env.SESSION_HEALTH_INTERVAL_MS ?? 60_000)`; guard: chỉ 1 timer chạy cùng lúc
  - [x] 1.7 Export `stopSessionMonitor(): void` — clearInterval
  - [x] 1.8 Export `_resetForTesting(): void` — reset toàn bộ state về initial, stop timer (pattern của codebase — xem risk-monitor.ts:9)
  - [x] 1.9 **Import `sendAlert` từ risk-monitor.ts** — `sendAlert` là private function (không export). Cần refactor risk-monitor.ts: export `sendAlert` hoặc tạo wrapper `export function emitAlert(event: string, reason: string): Promise<void>`. Dùng tên `emitAlert` để tránh xung đột.

- [x] Task 2: Export `emitAlert` từ `zalo-bridge/src/risk-monitor.ts` (AC: 1, 2)
  - [x] 2.1 Đổi `async function sendAlert` → `export async function emitAlert` (rename để avoid confusion với internal send)
  - [x] 2.2 Cập nhật tất cả internal call sites trong risk-monitor.ts: `sendAlert(...)` → `void emitAlert(...)`
  - [x] 2.3 Cập nhật `send.ts` inline alert (dòng ~120-135): import `emitAlert` từ risk-monitor, thay `fetch(alertUrl, ...)` block bằng `void emitAlert('session.lost', pharmacy_id + ':' + lastError)` — giữ fire-and-forget, nhưng dùng shared implementation (tránh code dupe)

- [x] Task 3: Thêm `checkOpenzcaHealth()` vào `zalo-bridge/src/openzca-client.ts` (AC: 1)
  - [x] 3.1 Export `checkOpenzcaHealth(): Promise<{ ok: boolean; error?: string }>`
    - Nếu `OPENZCA_URL` chưa set → stub mode: return `{ ok: true }` (nhất quán với `sendViaOpenzca`)
    - GET `${OPENZCA_URL}/healthz` với `AbortSignal.timeout(5_000)`
    - 2xx → `{ ok: true }`; non-2xx hoặc catch → `{ ok: false, error: 'HTTP ${status}' | message }`

- [x] Task 4: Cập nhật `zalo-bridge/src/send.ts` (AC: 1, 2, 3)
  - [x] 4.1 Import `getSessionState`, `recordSessionEvent` từ `./session-monitor.ts`
  - [x] 4.2 Sau bước `createMessageRecord` (trước retry loop): nếu `getSessionState().state === 'lost'` → gọi `queueDeadLetter(auditRowId, {...})` → trả 202 `{queued: true, message_id}` (bỏ qua retry hoàn toàn, không fire thêm alert — monitor đã fire)
  - [x] 4.3 Sau khi retry loop kết thúc thành công: gọi `recordSessionEvent('send_success')`
  - [x] 4.4 Sau khi retry loop exhausted (tất cả 3 lần fail): gọi `recordSessionEvent('send_failure', lastError)` — đặt TRƯỚC `queueDeadLetter` call
  - [x] 4.5 Thay inline `fetch(alertUrl, ...)` block bằng `void emitAlert(...)` (từ Task 2.3)

- [x] Task 5: Cập nhật `zalo-bridge/src/index.ts` (AC: 1, 2, 3)
  - [x] 5.1 Import `startSessionMonitor`, `stopSessionMonitor`, `getSessionState`, `resetSession` từ `./session-monitor.ts`
  - [x] 5.2 Thêm route `GET /session-state` → 200 `getSessionState()`
  - [x] 5.3 Thêm route `POST /session-reset` → gọi `resetSession()` → 200 `{ reset: true, state: 'healthy' }`
  - [x] 5.4 Gọi `startSessionMonitor()` trước `server.listen(...)` (sau tất cả route registration)
  - [x] 5.5 Xử lý graceful shutdown: `process.on('SIGTERM', () => { stopSessionMonitor(); server.close(); })`

- [x] Task 6: Cập nhật `.env.example` (AC: 1)
  - [x] 6.1 Thêm dòng `SESSION_HEALTH_INTERVAL_MS=60000` ngay sau `ALERT_WEBHOOK_URL=` (cùng nhóm observability)

- [x] Task 7: Tạo `tests/api/session-monitor.test.js` (AC: 1, 2, 3)
  - Ports: bridge=31335, mock-Baserow=31336, mock-openzca=31337 (31301–31334 đã dùng — xem send-audit.test.js)
  - [x] 7.1 **AC1-a (health-check fail → block):** mock openzca `/healthz` trả 503; bridge gọi `GET /session-health-check` (hoặc nhỏ interval để health-check tự chạy); `GET /session-state` → `{state:'lost'}`; POST `/send` → 202 `{queued:true}`, 0 call tới mock-openzca `/send`
  - [x] 7.2 **AC1-b (alert fired once on transition):** mock alert webhook ghi nhận events; sau `health_fail` → alert webhook nhận đúng 1 event `session.lost`; gọi health-fail lần 2 → alert webhook KHÔNG nhận thêm (idempotent transition)
  - [x] 7.3 **AC2-a (≥3 consecutive send failures → lost):** mock openzca `/send` luôn trả 500; gửi 3 requests qua `/send`; `GET /session-state` → `{state:'lost', consecutive_errors:3}`; gửi request thứ 4 → trả 202 `{queued:true}`, không call openzca
  - [x] 7.4 **AC2-b (reason field không rỗng):** sau transition to lost via send_failure, alert payload có `reason` chứa error text từ openzca (e.g. `'HTTP 500'`)
  - [x] 7.5 **AC2-c (dead-letter preserved, không mất):** mock-Baserow ghi nhận PATCH calls; khi session `lost` và send attempt đến, mock-Baserow nhận createMessageRecord + updateMessageStatus/queueDeadLetter call
  - [x] 7.6 **AC3 (reset):** POST `/session-reset` sau khi `lost` → `GET /session-state` trả `{state:'healthy', consecutive_errors:0}`; POST `/send` tiếp theo gọi mock-openzca (không short-circuit)
  - [x] 7.7 **Regression (healthy path unaffected):** gửi 2 fail + 1 success → `consecutive_errors` reset; state vẫn `healthy`

## Dev Notes

### Kiến trúc module

`session-monitor.ts` là module thứ 5 trong `zalo-bridge/src/` (sau opt-in-gate, risk-monitor, throttle, messages-client, openzca-client). Nó phụ thuộc vào:
- `openzca-client.ts` (import `checkOpenzcaHealth`) — phòng tránh circular dep: openzca-client KHÔNG import session-monitor
- `risk-monitor.ts` (import `emitAlert`) — risk-monitor KHÔNG import session-monitor; chiều một chiều

Session-monitor **không** thay thế logic 2.4 trong send.ts — nó thêm tầng cross-message tracking trên đỉnh. Behavior hiện tại (3 retry per message → dead-letter → per-message `session.lost` alert) vẫn nguyên; Story 2.5 thêm:
1. Chặn sớm khi biết session đã `lost` (bỏ retry vô nghĩa)
2. Cảnh báo proactive qua health-check (không chờ send fail)
3. Endpoint `/session-state` + `/session-reset` cho vận hành

### TypeScript conventions (từ Stories 2.3, 2.4 — KHÔNG được sai)
- Import với `.ts` extension: `import { ... } from './risk-monitor.ts'`
- Node 24 native TS strip — không transpile, không build step
- Không external deps — chỉ `node:*` built-ins + `node:crypto` nếu cần
- Module-level mutable state cần `_resetForTesting()` export (xem risk-monitor.ts:9, throttle.ts pattern)
- `fetch` là global (Node 18+) — không import
- Fire-and-forget async: `void emitAlert(...)` — không await ở hot path

### `sendAlert` refactoring note (Task 2)
`sendAlert` ở risk-monitor.ts (dòng 25) hiện là `async function sendAlert` (private). Cần export để session-monitor dùng. Rename thành `emitAlert` để:
1. Tránh confusion với `send` trong send.ts
2. Tên rõ hơn (emit = fire-and-forget event, không phải HTTP send)
Internal call sites trong risk-monitor.ts (dòng 56, 82, 106) đều dùng `void sendAlert(...)` pattern — cập nhật sang `void emitAlert(...)`.

### "DOM/UI Zalo đổi" detection
openzca trả về lỗi khi Zalo web UI thay selector → biểu hiện là `sendViaOpenzca` trả `{ok: false, error: '...'}` với error text chứa auth/selector failure, HOẶC `checkOpenzcaHealth()` trả non-2xx vì openzca process restart/crashed. Story 2.5 xử lý cả hai path qua `send_failure` (≥3 consecutive) và `health_fail` (immediate). Không cần parse error text cụ thể — mọi health-check fail = immediate `lost`.

### Session state machine
```
healthy  --[send_failure x3]--> lost
healthy  --[health_fail]------> lost  
degraded --[send_failure]------> lost   (nếu thêm degraded state sau, Story 2.5 skip)
lost     --[resetSession()]----> healthy
* bất kỳ state --[send_success]--> healthy (reset consecutive_errors)
```
Story 2.5 chỉ dùng 2 state thực: `healthy` và `lost`. `degraded` là optional/future — type định nghĩa sẵn nhưng không dùng.

### Test pattern
Dùng Node built-in test runner (`node:test`, `node:assert`) — nhất quán với toàn bộ test suite (xem send-audit.test.js, risk-monitor.test.js). Không jest, không vitest. Mock servers dùng `http.createServer`. Fetch/restore pattern: `const origFetch = globalThis.fetch; after(() => { globalThis.fetch = origFetch; })` — xem send-audit.test.js:_ (pattern đã thiết lập ở 2.4).

### Project Structure Notes

- `zalo-bridge/src/session-monitor.ts` — new file (listed trong architecture.md dòng 330: `session-monitor.ts # giám sát phiên (FR-13)`)
- `tests/api/session-monitor.test.js` — new test file (cùng thư mục với send-audit.test.js, risk-monitor.test.js)
- Không tạo file mới trong `baserow/schema/` — Story 2.5 chỉ thêm runtime monitoring, không đổi DB schema
- Không tạo `n8n/workflows/MC-Alert-Ops.json` — n8n alert orchestration là Epic 4+ scope; Story 2.5 chỉ cần zalo-bridge tự cảnh báo qua `ALERT_WEBHOOK_URL`

### References

- Story spec: [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5 L406-422]
- FR-13, AR-8: [Source: _bmad-output/planning-artifacts/epics.md#Additional Requirements L57-75]
- Architecture session monitor: [Source: _bmad-output/planning-artifacts/architecture.md#L179, L330]
- `sendAlert` private function: [Source: zalo-bridge/src/risk-monitor.ts#L25]
- Existing `session.lost` alert path: [Source: zalo-bridge/src/send.ts#L120-135]
- `checkOpenzcaHealth` anchor: [Source: zalo-bridge/src/openzca-client.ts] — function không tồn tại yet, tạo mới
- Test port registry: 31335–31337 free [Source: tests/api/send-audit.test.js port range analysis]
- TypeScript conventions: [Source: zalo-bridge/src/messages-client.ts, zalo-bridge/src/openzca-client.ts]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `sendAlert` → `emitAlert` rename in risk-monitor.ts; existing send-audit.test.js AC2 assertions updated to check `reason` field instead of removed `pharmacy_id`/`message_id` fields in alert payload.
- SESSION_HEALTH_INTERVAL_MS=3600000 added to send-audit bridge env to prevent health polling flakiness in existing tests.
- 401/401 tests pass (394 pre-existing + 7 new session-monitor tests).

### File List

- `zalo-bridge/src/session-monitor.ts` (new)
- `zalo-bridge/src/risk-monitor.ts` (modified — sendAlert→emitAlert exported)
- `zalo-bridge/src/openzca-client.ts` (modified — added checkOpenzcaHealth)
- `zalo-bridge/src/send.ts` (modified — session state integration, emitAlert refactor)
- `zalo-bridge/src/index.ts` (modified — session routes, monitor lifecycle, SIGTERM)
- `.env.example` (modified — SESSION_HEALTH_INTERVAL_MS added)
- `tests/api/session-monitor.test.js` (new)
- `tests/api/send-audit.test.js` (modified — alert payload assertion updated)
