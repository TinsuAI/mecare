# Story 2.3: Auto-throttle theo tín hiệu rủi ro

Status: done

## Story

As a hệ thống MeCare,
I want theo dõi tín hiệu rủi ro (chặn/báo xấu/gửi lỗi) trong cửa sổ thời gian trượt và tự tạm dừng gửi khi vượt ngưỡng,
so that phản ứng sớm trước nguy cơ khóa tài khoản Zalo (R1), phát alert kênh vận hành Tinsu (AR-8).

## Acceptance Criteria

1. **Given** luồng gửi đang chạy bình thường **When** tổng tín hiệu `block`+`spam_report` trong `RISK_WINDOW_MINUTES` phút gần nhất đạt ≥ `RISK_BLOCK_COUNT_THRESHOLD` **Then** chuyển state sang `paused`; `POST /send` trả 503 `{ error: "risk_throttled", state: "paused" }`; phát alert HTTP POST đến `ALERT_WEBHOOK_URL` (payload: `{ event: "risk.paused", reason, timestamp_ms, service: "zalo-bridge" }`)

2. **Given** cửa sổ trượt **When** tổng tín hiệu `send_error` ≥ `RISK_ERROR_COUNT_THRESHOLD` **Then** chuyển/giữ state `paused`; phát alert

3. **Given** state `paused` và `RISK_AUTO_RESUME=true` **When** cửa sổ trượt hiện tại không còn tín hiệu nào (đã hết hạn tự nhiên) **Then** tự chuyển về `normal`; phát alert `{ event: "risk.resumed", reason: "auto" }`

4. **Given** state `paused` và `RISK_AUTO_RESUME=false` **When** ops gọi `POST /risk-resume` **Then** chuyển về `normal`; phát alert `{ event: "risk.resumed", reason: "manual" }`; `POST /send` hoạt động bình thường trở lại

5. **Given** bất kỳ state **When** `GET /risk-state` được gọi **Then** trả 200 `{ state, signal_counts: { block, spam_report, send_error }, window_minutes, since_epoch_ms }`

6. **Given** zalo-bridge nhận tín hiệu rủi ro **When** `POST /risk-report` được gọi với body `{ signal_type: "block"|"spam_report"|"send_error", pharmacy_id? }` **Then** ghi nhận vào window counter; kiểm tra ngưỡng; trả 200 `{ recorded: true, state }`; body thiếu/sai `signal_type` → 400 `{ error: "invalid_signal_type" }`

## Tasks / Subtasks

- [x] Task 1: Tạo `zalo-bridge/src/risk-monitor.ts` (AC: 1, 2, 3, 4, 5, 6)
  - [x] 1.1 Export types: `type RiskSignal = "block" | "spam_report" | "send_error"` và `type RiskState = "normal" | "paused"`
  - [x] 1.2 Module-level singleton: `let currentState: RiskState = "normal"` và `const signals: Array<{ timestamp_ms: number; signal: RiskSignal }> = []`
  - [x] 1.3 Export `_resetForTesting(): void` — set `currentState = "normal"`, `signals.length = 0`; underscore = internal, không expose qua HTTP
  - [x] 1.4 Internal `pruneWindow(nowMs: number): void` — filter signals giữ entries có `timestamp_ms >= nowMs - windowMs`; `windowMs = Number(process.env.RISK_WINDOW_MINUTES ?? 60) * 60_000`
  - [x] 1.5 Export `recordSignal(signal: RiskSignal, nowMs?: number): void` — append `{ timestamp_ms: nowMs ?? Date.now(), signal }` vào `signals`; gọi `pruneWindow`; gọi `evaluateAndAct(nowMs)`
  - [x] 1.6 Internal `evaluateAndAct(nowMs?: number): void` — đếm block+spam_report, đếm send_error trong window sau prune; nếu block+spam ≥ `RISK_BLOCK_COUNT_THRESHOLD` (default `3`) hoặc errors ≥ `RISK_ERROR_COUNT_THRESHOLD` (default `5`) → nếu state vừa đổi sang paused → gọi `sendAlert("risk.paused", reason).catch(console.error)`; check auto-resume chỉ khi `currentState === "paused"` và `RISK_AUTO_RESUME === "true"` và `signals.length === 0` (sau prune) → set `normal`, call `sendAlert("risk.resumed", "auto").catch(console.error)`
  - [x] 1.7 Export `getRiskState(nowMs?: number): { state: RiskState; signal_counts: { block: number; spam_report: number; send_error: number }; window_minutes: number; since_epoch_ms: number }` — prune, evaluate auto-resume, đếm per-type, trả object
  - [x] 1.8 Export `resetToNormal(reason = "manual"): void` — set `currentState = "normal"`; fire-and-forget `sendAlert("risk.resumed", reason).catch(console.error)` — KHÔNG clear signals (tín hiệu lịch sử vẫn còn trong window cho audit)
  - [x] 1.9 Internal `async function sendAlert(event: string, reason: string): Promise<void>` — always `console.error("[ALERT]", event, "reason="+reason)`; nếu `ALERT_WEBHOOK_URL` set: `fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event, reason, timestamp_ms: Date.now(), service: "zalo-bridge" }), signal: AbortSignal.timeout(5000) })` — dùng Node 18+ built-in `fetch`; không re-throw (fire-and-forget)
  - [x] 1.10 Env vars: `RISK_BLOCK_COUNT_THRESHOLD` (default `3`), `RISK_ERROR_COUNT_THRESHOLD` (default `5`), `RISK_WINDOW_MINUTES` (default `60`), `RISK_AUTO_RESUME` (default `"false"`), `ALERT_WEBHOOK_URL` (default `""`)

- [x] Task 2: Cập nhật `zalo-bridge/src/send.ts` — risk gate (AC: 1)
  - [x] 2.1 Import `getRiskState` từ `./risk-monitor.ts`
  - [x] 2.2 Sau field validation (missing check), TRƯỚC `checkOptIn`: `const risk = getRiskState(); if (risk.state === "paused") { res.writeHead(503, ...); res.end(JSON.stringify({ error: "risk_throttled", state: "paused" })); return; }`
  - [x] 2.3 Thêm comment sau openzca stub: `// Story 2.4: import { recordSignal } from "./risk-monitor.ts"; call recordSignal("send_error") khi openzca trả lỗi thật`

- [x] Task 3: Cập nhật `zalo-bridge/src/index.ts` — 3 route mới (AC: 4, 5, 6)
  - [x] 3.1 Import `getRiskState`, `recordSignal`, `resetToNormal` từ `./risk-monitor.ts`
  - [x] 3.2 `GET /risk-state` → `res.writeHead(200, ...); res.end(JSON.stringify(getRiskState()))`
  - [x] 3.3 `POST /risk-resume` → `resetToNormal("manual"); res.writeHead(200, ...); res.end(JSON.stringify({ resumed: true, state: "normal" }))`
  - [x] 3.4 `POST /risk-report` → parse body (inline chunks pattern từ `/send`); validate `signal_type ∈ VALID_SIGNALS`; nếu invalid → 400 `{ error: "invalid_signal_type" }`; gọi `recordSignal(signal_type)`; trả 200 `{ recorded: true, state: getRiskState().state }`
  - [x] 3.5 `const VALID_SIGNALS = new Set(["block", "spam_report", "send_error"])` — dùng Set để O(1) lookup

- [x] Task 4: Tests — contract + API (AC: 1–6)
  - [x] 4.1 Tạo `tests/contract/risk-monitor.test.js` — import `{ recordSignal, getRiskState, resetToNormal, _resetForTesting }` từ `../../zalo-bridge/src/risk-monitor.ts`
  - [x] 4.2 `before`/`beforeEach` gọi `_resetForTesting()` để cô lập mỗi test
  - [x] 4.3 Test `recordSignal` + threshold: env `RISK_BLOCK_COUNT_THRESHOLD=2`; ghi 1 `block` → state `normal`; ghi thêm 1 `block` → state `paused`
  - [x] 4.4 Test error threshold: env `RISK_ERROR_COUNT_THRESHOLD=2`; ghi 2 `send_error` → state `paused`
  - [x] 4.5 Test `getRiskState` counts: ghi 1 block + 1 spam_report + 1 send_error → `signal_counts = { block: 1, spam_report: 1, send_error: 1 }`
  - [x] 4.6 Test window prune: ghi signal với `nowMs = Date.now() - windowMs - 1` (đã hết hạn) → `getRiskState()` counts = 0
  - [x] 4.7 Test auto-resume: set `RISK_AUTO_RESUME=true`, trigger pause, gọi `_resetForTesting()` (clear signals) → `getRiskState()` auto-resume về `normal`
  - [x] 4.8 Test `resetToNormal`: trigger pause, gọi `resetToNormal()` → state `normal`; signals vẫn còn (không bị clear)
  - [x] 4.9 Tạo `tests/api/risk-monitor.test.js` — spawn HTTP server, test via HTTP
  - [x] 4.10 Test `GET /risk-state`: trả 200 với đúng schema fields (`state`, `signal_counts`, `window_minutes`, `since_epoch_ms`)
  - [x] 4.11 Test `POST /risk-report`: body `{ signal_type: "block" }` → 200 `{ recorded: true }`; invalid signal_type `"unknown"` → 400; missing body → 400
  - [x] 4.12 Test `POST /risk-resume`: khi `paused` (inject via POST /risk-report N times với `RISK_BLOCK_COUNT_THRESHOLD=2`) → POST /risk-resume → 200; sau đó GET /risk-state → state `normal`
  - [x] 4.13 Test `POST /send` trả 503 khi `paused` (inject đủ signals qua /risk-report rồi call /send)

- [x] Task 5: Cập nhật `.env.example` + `sprint-status.yaml` (bookkeeping)
  - [x] 5.1 Thêm 5 env vars vào `.env.example` (section RISK MONITOR)
  - [x] 5.2 Set `2-3-auto-throttle-theo-tin-hieu-rui-ro: in-progress` trong `sprint-status.yaml`

## Dev Notes

### Thiết kế risk-monitor (sliding window ephemeral)
- Window storage: `Array<{ timestamp_ms: number; signal: RiskSignal }>` — đủ cho v1, O(n) prune chấp nhận được ở volume ≤1.000 tin/tháng
- State singleton: module-level `let currentState` — ephemeral per restart; restart hiếm, Zalo cũng reset counter per session → OK
- **Hai ngưỡng tách biệt:** block+spam (=3 → pause ngay, tín hiệu trực tiếp từ người dùng) vs send_error (=5 → conservative, lỗi mạng bình thường không nên pause)
- **Không rate-based:** v1 dùng absolute count trong window (không ratio), vì không có denominator sạch — throttle.ts track per-day/per-pharmacy, risk-monitor track per-window/global. Đủ để phát hiện spike. Khi volume lớn hơn (Epic 3+), chuyển sang rate sẽ cần denominator từ throttle.ts. [Source: PRD §4.4 FR-12 line 277 — "tỉ lệ" aspirational, count đủ cho v1]
- `sendAlert` là fire-and-forget: KHÔNG await trong hot path; lỗi alert không block send pipeline
- `resetToNormal` KHÔNG clear signals: ops resume thủ công nhưng tín hiệu lịch sử còn để audit; nếu RISK_AUTO_RESUME=true và window hết hạn tự nhiên → signals đã prune sạch rồi

### Send pipeline call order sau Story 2.3
```
POST /send → [1] validate fields → [2] getRiskState (pause check) → [3] checkOptIn → [4] isBusinessHour → [5] checkDailyCap → [6] incrementDailyCount → [7] applyVariant → [8] jitter → [9] openzca stub (202)
# Story 2.4: [9] openzca thật → nếu lỗi → recordSignal("send_error") hoặc POST /risk-report
```

### Alert mechanism (AR-8)
- Event naming: `domain.action` snake — khớp architecture.md line 247 (`session.lost`, `quota.reached`, `risk.paused`, `risk.resumed`)
- `ALERT_WEBHOOK_URL` = một URL duy nhất; có thể trỏ n8n webhook (`MC-Alert-Ops.json`) → forward Telegram/Zalo Tinsu
- Node 18+ built-in `fetch` với `AbortSignal.timeout(5000)` — không cần `node:https` manual request
- Nếu URL không set: `console.error("[ALERT] ...")` vẫn chạy — không silent failure

### Test isolation (quan trọng)
- `risk-monitor.ts` có module-level state → phải gọi `_resetForTesting()` trong `beforeEach`
- API tests: mỗi test cần state sạch → set env `RISK_BLOCK_COUNT_THRESHOLD=2, RISK_ERROR_COUNT_THRESHOLD=2` để trigger dễ; reset qua `POST /risk-resume` giữa các test
- Xem pattern isolation từ `tests/contract/throttle.test.js` — thao tác `nowMs` param để fake time

### TypeScript module conventions (carry-forward từ Story 2.2)
- File extension imports: `.ts` (Node 24 native TS strip, không transpile)
- `export type` cho types, `export` cho functions
- No external deps — chỉ Node built-ins + `fetch` (global, Node 18+)
- snake_case JSON fields (khớp Baserow convention — xem send.ts, opt-in-gate.ts)

### Regression guard
- KHÔNG sửa `throttle.ts` — giữ nguyên 344 tests Story 2.2
- KHÔNG sửa `opt-in-gate.ts` — giữ nguyên Story 2.1
- `send.ts` chỉ thêm risk check ở đầu pipeline — không xáo trộn logic throttle đã có
- Chạy full test suite từ `tests/`: `node --test **/*.test.js` — 344 tests cũ + mới phải pass

### Project Structure Notes
- `risk-monitor.ts` đặt ở `zalo-bridge/src/` — cùng cấp `throttle.ts`, `send.ts` (architecture.md line 327–330)
- `session-monitor.ts` (architecture.md line 330) là scope Story 2.5 — mất phiên + DOM đổi; Story 2.3 không tạo file này
- 3 route mới thêm vào `index.ts` inline — không tách file router (volume thấp, không cần abstraction)

### Env vars introduced by this story
| Var | Default | Mô tả |
|-----|---------|--------|
| `RISK_BLOCK_COUNT_THRESHOLD` | `3` | Số tín hiệu block+spam_report trong window → pause |
| `RISK_ERROR_COUNT_THRESHOLD` | `5` | Số tín hiệu send_error trong window → pause |
| `RISK_WINDOW_MINUTES` | `60` | Kích thước cửa sổ trượt (phút) |
| `RISK_AUTO_RESUME` | `false` | Tự resume khi window sạch (true/false) |
| `ALERT_WEBHOOK_URL` | `""` | HTTP endpoint nhận alert; nếu trống → log only |

### References
- Epic 2 Story 2.3 ACs: `_bmad-output/planning-artifacts/epics.md` lines 370–385
- FR-12 (risk signals → auto-throttle): `_bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/prd.md` line 277
- AR-8 alert kênh Tinsu: `_bmad-output/planning-artifacts/architecture.md` line 180
- Alert event naming (`domain.action`): `_bmad-output/planning-artifacts/architecture.md` line 247
- Anti-ban canonical placement ở zalo-bridge: `_bmad-output/planning-artifacts/architecture.md` line 178
- Story 2.2 send pipeline + race fix pattern: `_bmad-output/implementation-artifacts/2-2-nhip-gui-giong-nguoi-warm-up-tai-zalo-bridge.md` Dev Notes
- throttle.ts (module-level singleton pattern): `zalo-bridge/src/throttle.ts`
- index.ts routing pattern (chunks + JSON.parse): `zalo-bridge/src/index.ts`
- Test contract pattern: `tests/contract/throttle.test.js`
- Test API pattern (startServer, post helper): `tests/api/send-throttle.test.js`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- All 6 ACs implemented. 362/362 tests pass (344 regression + 18 new).
- Design decision: `getRiskState` does NOT re-run threshold evaluation (only auto-resume check). Threshold pause only triggers on `recordSignal`. This prevents immediate re-pause after `resetToNormal` when signals are still within window.
- `evaluateAndAct` fires only from `recordSignal` hot path; `getRiskState` has inline auto-resume check only.
- `ALERT_WEBHOOK_URL` uses Node 18+ built-in `fetch` with `AbortSignal.timeout(5000)`. Fire-and-forget.
- 5 new env vars in `.env.example` under `# Risk monitor` section.

### File List

- zalo-bridge/src/risk-monitor.ts (created)
- zalo-bridge/src/send.ts (modified — risk gate + Story 2.4 comment)
- zalo-bridge/src/index.ts (modified — /risk-state, /risk-resume, /risk-report routes)
- tests/contract/risk-monitor.test.js (created)
- tests/api/risk-monitor.test.js (created)
- .env.example (5 risk monitor env vars appended)
- _bmad-output/implementation-artifacts/sprint-status.yaml (2-3 → in-progress)
