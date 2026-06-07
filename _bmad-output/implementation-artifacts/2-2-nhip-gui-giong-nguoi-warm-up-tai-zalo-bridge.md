# Story 2.2: Nhịp gửi giống người & warm-up tại zalo-bridge

Status: done

## Story

As a hệ thống MeCare,
I want zalo-bridge áp jitter thời gian, trần gửi/ngày, chỉ gửi trong giờ hành chính, hỗ trợ warm-up tải thấp, và áp biến thể nội dung khi gửi cho nhiều khách,
so that hành vi tự động giống người thật, giảm rủi ro Zalo phát hiện automation và khóa tài khoản (R1 — rủi ro cao nhất).

## Acceptance Criteria

1. **Given** hàng đợi tin cần gửi **When** `POST /send` được gọi ngoài giờ hành chính (mặc định 07:00–21:00 GMT+7, configurable) **Then** trả 503 `{ error: "outside_business_hours" }`, không gửi tin, ghi log lý do

2. **Given** nhà thuốc đã gửi đủ `DAILY_SEND_CAP` tin trong ngày dương lịch (tính giờ GMT+7) **When** `POST /send` được gọi thêm **Then** trả 429 `{ error: "daily_cap_exceeded", pharmacy_id }`, không gửi, ghi log

3. **Given** nhà thuốc đang trong giai đoạn warm-up (`WARMUP_DAILY_CAP` < `DAILY_SEND_CAP`) **When** `POST /send` được gọi **Then** áp trần warm-up thay trần bình thường; khi hết warm-up period chuyển tự động sang trần đầy đủ

4. **Given** một nội dung kịch bản được gửi cho nhiều khách khác nhau **When** `applyVariant(content, seed)` được gọi với seed khác nhau **Then** kết quả có micro-variation (thay đổi nhỏ về khoảng trắng hoặc dấu câu) — không gửi bản y hệt hàng loạt; nội dung vẫn mang nguyên nghĩa

5. **Given** throttle logic kiểm tra giờ và trần đều pass **When** `POST /send` được gọi với payload hợp lệ và khách đã kết bạn **Then** áp jitter delay (min `JITTER_MIN_MS`, max `JITTER_MAX_MS`), sau đó tiếp tục flow send (hiện vẫn stub openzca, trả 202 `{ queued: true }`)

6. **Given** tài khoản Zalo mới cần warm-up **When** `warmup.sh <pharmacy_slug>` được chạy thủ công **Then** script in ra kế hoạch warm-up (số tin/ngày từng giai đoạn) và set env vars gợi ý; KHÔNG tự gửi tin (shell helper documentation only — gửi thật vẫn qua `/send`)

## Tasks / Subtasks

- [x] Task 1: Tạo `zalo-bridge/src/throttle.ts` — module anti-ban (AC: 1, 2, 3, 4, 5)
  - [x] 1.1 Export `isBusinessHour(nowMs?: number): boolean` — đọc `BUSINESS_HOUR_START` (default `7`) và `BUSINESS_HOUR_END` (default `21`) từ env, tính giờ GMT+7 (offset +420 min), trả `false` ngoài khung
  - [x] 1.2 Export `checkDailyCap(pharmacyId: string, nowMs?: number): { allowed: boolean; count: number; cap: number }` — in-memory `Map<string, { date: string; count: number }>` (ephemeral, resets on restart); date key = `YYYY-MM-DD` theo GMT+7; trả `allowed: false` khi `count >= cap`; cap = `WARMUP_DAILY_CAP` (nếu còn trong warmup period) hoặc `DAILY_SEND_CAP` (default `50`)
  - [x] 1.3 Export `incrementDailyCount(pharmacyId: string, nowMs?: number): void` — tăng counter sau khi gửi thành công; gọi sau throttle pass, trước (hoặc sau) openzca stub
  - [x] 1.4 Export `isWarmupActive(nowMs?: number): boolean` — so sánh `nowMs` với `WARMUP_UNTIL_EPOCH_MS` env var (unix epoch ms); nếu env không set hoặc đã qua → `false`
  - [x] 1.5 Export `jitterMs(nowMs?: number): number` — trả random ms trong `[JITTER_MIN_MS, JITTER_MAX_MS]` (defaults 800ms–3000ms); dùng `Math.random()` — OK vì không cần crypto-grade, chỉ cần phân tán timing
  - [x] 1.6 Export `applyVariant(content: string, seed: number): string` — deterministic variant theo `seed % 3`: (0) giữ nguyên, (1) normalize double-space → single-space + trim, (2) thay dấu chấm cuối câu bằng không dấu (nếu có) hoặc ngược lại; đảm bảo output cùng nghĩa với input

- [x] Task 2: Cập nhật `zalo-bridge/src/send.ts` — tích hợp throttle trước openzca stub (AC: 1, 2, 3, 5)
  - [x] 2.1 Import `isBusinessHour`, `checkDailyCap`, `incrementDailyCount`, `jitterMs`, `applyVariant` từ `./throttle.ts`
  - [x] 2.2 Sau opt-in gate pass: gọi `isBusinessHour()` → nếu `false`, trả 503 `{ error: "outside_business_hours" }`
  - [x] 2.3 Gọi `checkDailyCap(pharmacy_id)` → nếu `!allowed`, trả 429 `{ error: "daily_cap_exceeded", pharmacy_id }`
  - [x] 2.4 Áp `applyVariant(content, seed)` — seed = `Date.now() % 1000` (đủ để phân tán); lưu `variantContent` cho log
  - [x] 2.5 Gọi `await new Promise(r => setTimeout(r, jitterMs()))` — simulate human typing delay
  - [x] 2.6 Gọi `incrementDailyCount(pharmacy_id)` — tăng counter
  - [x] 2.7 Log `[send] QUEUED pharmacy_id=... customer_phone=... variant=N jitter=...ms` trước trả 202
  - [x] 2.8 Giữ nguyên 202 `{ queued: true }` stub response (openzca integration scope: Story 2.4+)

- [x] Task 3: Tạo `zalo-bridge/warmup.sh` — helper documentation (AC: 6)
  - [x] 3.1 Shebang `#!/usr/bin/env bash`, usage check `$1` = pharmacy_slug
  - [x] 3.2 In bảng kế hoạch warm-up gợi ý: Tuần 1: 5 tin/ngày, Tuần 2: 15/ngày, Tuần 3: 30/ngày, Tuần 4+: đầy đủ (50/ngày)
  - [x] 3.3 In env vars cần set: `WARMUP_DAILY_CAP=5`, `WARMUP_UNTIL_EPOCH_MS=<epoch của ngày hết warm-up>`, tính epoch cho từng giai đoạn
  - [x] 3.4 Làm script executable (`chmod +x`) — note trong README rằng gửi thật vẫn qua `/send`

- [x] Task 4: Viết tests cho throttle module (AC: 1, 2, 3, 4, 5)
  - [x] 4.1 Tạo `tests/contract/throttle.test.js` — import throttle functions từ `zalo-bridge/src/throttle.ts` (Node 24 native TS)
  - [x] 4.2 Test `isBusinessHour`: pass `nowMs` của 06:59 GMT+7 → `false`; 07:00 GMT+7 → `true`; 20:59 GMT+7 → `true`; 21:00 GMT+7 → `false`
  - [x] 4.3 Test `checkDailyCap`: fresh pharmacyId → `allowed: true, count: 0`; sau N `incrementDailyCount` = cap → `allowed: false`; ngày mới (nowMs khác date) → reset về `count: 0`
  - [x] 4.4 Test `isWarmupActive`: `WARMUP_UNTIL_EPOCH_MS` chưa set → `false`; set về tương lai → `true`; set về quá khứ → `false`
  - [x] 4.5 Test `applyVariant`: seed 0 → giữ nguyên content; seed 1 → normalize whitespace; seed 2 → dấu câu thay đổi; seed 3 → wraps lại seed 0 (mod 3)
  - [x] 4.6 Thêm vào `tests/api/zalo-bridge.test.js` (hoặc file riêng `tests/api/send-throttle.test.js`): test `/send` trả 503 khi mock `BUSINESS_HOUR_START=23, BUSINESS_HOUR_END=23` (always off); test trả 429 khi `DAILY_SEND_CAP=0`

- [x] Task 5: Cập nhật sprint-status.yaml (AC: bookkeeping)
  - [x] 5.1 Set `2-2-nhip-gui-giong-nguoi-warm-up-tai-zalo-bridge: in-progress` (story was already ready-for-dev; dev advances to in-progress)

## Dev Notes

### Anti-ban design constraints (from architecture.md line 178, 37)
- **Canonical placement:** tất cả anti-ban throttle đặt ở `zalo-bridge/` — KHÔNG đặt ở n8n hay OpenClaw. n8n chỉ enforce trần gói 1.000/tháng.
- **In-memory counter là đủ cho v1:** Counter ephemeral (reset khi restart) — chấp nhận được vì Zalo bộ đếm cũng reset theo ngày và restart ít xảy ra; nếu cần persist, scope đó thuộc Epic 4+.
- **G3 open question (architecture.md line 402):** Ngưỡng Zalo thực (tin/ngày, kết bạn/ngày) chưa xác nhận → throttle cấu hình tạm `DAILY_SEND_CAP=50` (conservative). Điều chỉnh khi vận hành.
- **Warm-up:** Thời lượng warm-up chốt khi vận hành (assumption trong PRD §4.6). Script `warmup.sh` chỉ là documentation/helper — không tự gửi.
- **Jitter:** `Math.random()` là đủ cho mục đích phân tán timing (không cần CSPRNG).

### Timezone
- Tất cả tính giờ GMT+7 (Asia/Ho_Chi_Minh). Node không cần thư viện ngoài — tính offset thủ công: `utcHour + 7 (mod 24)`. Không dùng `Intl.DateTimeFormat` vì overhead không cần thiết.

### Send flow sau Story 2.2 (full pipeline call order in send.ts)
```
POST /send → [1] validate fields → [2] checkOptIn → [3] isBusinessHour → [4] checkDailyCap → [5] incrementDailyCount → [6] applyVariant → [7] jitter → [8] openzca stub (202)
# Note: incrementDailyCount moved to [5] (before await jitter) to prevent race condition on concurrent requests.
```

### TypeScript module conventions (from existing codebase)
- File extension imports: `.ts` (Node 24 native TS strip, no transpile step)
- `export type` for types, `export` for functions — khớp `opt-in-gate.ts` pattern
- No framework, no external deps — chỉ Node built-ins
- snake_case JSON body fields (khớp Baserow convention — xem `send.ts`)

### Test patterns (from existing tests)
- `tests/contract/*.test.js` — import TS module trực tiếp, dùng `node:test` + `node:assert/strict`
- `tests/api/*.test.js` — spawn HTTP server via `startServer()` helper, probe via `get()` / `post()`
- `post()` helper cần kiểm tra `tests/helpers/server.js` xem đã có chưa — nếu chưa có thì thêm vào file helpers
- Test files dùng `describe` + `test` + `before`/`after` pattern

### Env vars introduced by this story
| Var | Default | Mô tả |
|-----|---------|--------|
| `DAILY_SEND_CAP` | `50` | Trần gửi tin/ngày/nhà thuốc |
| `WARMUP_DAILY_CAP` | `5` | Trần warm-up/ngày (thấp hơn DAILY_SEND_CAP) |
| `WARMUP_UNTIL_EPOCH_MS` | (not set = off) | Unix epoch ms — sau mốc này hết warm-up |
| `JITTER_MIN_MS` | `800` | Jitter tối thiểu giữa các tin (ms) |
| `JITTER_MAX_MS` | `3000` | Jitter tối đa giữa các tin (ms) |
| `BUSINESS_HOUR_START` | `7` | Giờ bắt đầu gửi (GMT+7, 0-23) |
| `BUSINESS_HOUR_END` | `21` | Giờ kết thúc gửi (GMT+7, exclusive, 0-23) |

Thêm các var này vào `.env.example` và cập nhật `.env` nếu cần.

### File list (from existing source tree scan)
- **Tạo mới:** `zalo-bridge/src/throttle.ts`
- **Sửa:** `zalo-bridge/src/send.ts` (thêm throttle integration, bỏ comment "openzca stub (Story 2.2+)")
- **Tạo mới:** `zalo-bridge/warmup.sh`
- **Tạo mới:** `tests/contract/throttle.test.js`
- **Sửa:** `tests/api/zalo-bridge.test.js` (hoặc tạo `tests/api/send-throttle.test.js`)
- **Sửa:** `.env.example` (thêm 7 env vars mới)
- **Sửa:** `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Regression guard
- Không sửa `opt-in-gate.ts` — logic opt-in đã stable (Story 2.1 done)
- Không sửa `index.ts` — routing không thay đổi
- Chạy full test suite sau khi xong: `npm test` — đảm bảo 293+ tests vẫn pass

### Project Structure Notes
- `throttle.ts` đặt ở `zalo-bridge/src/` — cùng cấp với `send.ts`, `opt-in-gate.ts` (khớp architecture.md line 329)
- `warmup.sh` đặt ở `zalo-bridge/warmup.sh` (1 cấp trên `src/`) — khớp architecture.md line 340
- Test contract file pattern: `tests/contract/<module>.test.js` — khớp `opt-in-gate.test.js` đang ở `tests/contract/`

### References
- Anti-ban throttle design: `_bmad-output/planning-artifacts/architecture.md` lines 37, 178, 202, 253, 327-340
- FR-12 (nhịp gửi + throttle): `_bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/prd.md` lines 271, 186
- G3 open question (ngưỡng Zalo): `_bmad-output/planning-artifacts/architecture.md` line 402
- Story 2.1 send stub comment: `zalo-bridge/src/send.ts` — log message "openzca stub (Story 2.2+)"
- Env pattern: `zalo-bridge/src/opt-in-gate.ts` — `process.env.BASEROW_URL ?? "http://baserow:80"`
- Epic 2 story definitions: `_bmad-output/planning-artifacts/epics.md` — Story 2.2 ACs
- Test helper: `tests/helpers/server.js` — `startServer`, `get` pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- zalo-bridge/src/throttle.ts (created)
- zalo-bridge/src/send.ts (modified — throttle integration)
- zalo-bridge/warmup.sh (created, chmod +x)
- tests/contract/throttle.test.js (created)
- tests/api/send-throttle.test.js (created)
- .env.example (modified — 7 new throttle env vars)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified — in-progress)

### Completion Notes

344 tests pass (0 fail). Dev phase added 45 new tests; QA phase added 6 gap-filling tests (AC3 warmup cap HTTP, AC2 counter wiring, jitterMs integer contract, default DAILY_SEND_CAP contract). Existing 293 tests unchanged.

## Senior Developer Review (AI)

**Reviewer:** gabenidolcs on 2026-06-07
**Outcome:** APPROVED

### Issues Found & Auto-Fixed

| # | Severity | File | Issue | Fix Applied |
|---|----------|------|-------|-------------|
| 1 | HIGH | `zalo-bridge/src/send.ts` | **Race condition**: `incrementDailyCount` called after `await jitter`. Two concurrent requests for same `pharmacy_id` both pass `checkDailyCap` (count=0 for both) before either increments. Under `DAILY_SEND_CAP=1`, both get 202. Node.js single-thread doesn't protect across `await` boundaries. | Moved `incrementDailyCount` to before `await jitter` — synchronous slot reservation prevents race. |
| 2 | MEDIUM | story file | Completion notes stale: "338 tests / 45 new" — QA phase added 6 more → 344 total. | Updated completion notes to "344 tests pass, 51 new tests". |
| 3 | MEDIUM | `sprint-status.yaml` | `last_updated` comment said "backlog → ready-for-dev" — stale after dev+QA advancement. | Updated comment to reflect current state. |
| 4 | LOW | story file | Task 5.1 description said "Set ... ready-for-dev" but story was already ready-for-dev; dev correctly set it to in-progress. Misleading checkbox. | Corrected task description. |
| 5 | LOW | `zalo-bridge/src/send.ts` | `variantContent` footgun — original `content` still in scope for Story 2.4 openzca integration. | Added comment marking `variantContent` as the variable to use for openzca in Story 2.4. |

### Notes

- All 6 ACs implemented and tested. Contract tests cover all 6 exported throttle functions. API tests cover all 5 testable ACs.
- Race condition (Issue 1) was the only substantive code bug. Fix preserves all 344 tests.
- `applyVariant` dead-code `default` case is TypeScript necessity for exhaustive switch — acceptable.
- `jitterMs(_nowMs?)` unused parameter is intentional uniform API design — acceptable.
- `warmup.sh` is documentation-only per spec; executable bit confirmed (`-rwxrwxr-x`).
- In-memory counter (ephemeral, resets on restart) is correct v1 design per architecture.md decision.

### Change Log

- 2026-06-07: Story 2.2 review — APPROVED. Race condition fix applied to send.ts. Status: review → done.
