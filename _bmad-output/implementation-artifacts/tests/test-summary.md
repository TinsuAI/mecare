# Tóm tắt kiểm thử tự động — Story 5.2: Phát hiện trigger leo thang & cấp cứu

## Các test đã tạo / bổ sung

### Contract Tests (n8n workflow)

**File:** `tests/contract/n8n-handle-inbound-reply-escalation.test.js` *(bổ sung 3 test)*

- [x] 8.63 — `Guard: Needs Escalation false → Return Result` (AC7 regression guard)
- [x] 8.64 — `Send Emergency 115 → Create Escalation Case` (AC3 parallel path)
- [x] 8.65 — `Log Escalation Case Created → Return Result` (AC2)

### API Tests (HTTP endpoint)

**File mới:** `tests/api/openclaw-escalation.test.js`

- [x] POST thiếu required fields → 400 `pharmacy_id, customer_id, trigger_type, trigger, customer_content required`
- [x] POST body JSON không hợp lệ → 400 `invalid_json`
- [x] POST đủ fields nhưng không có `BASEROW_URL` → 503 `escalation_store_unavailable`

## Phân tích gap trước khi bổ sung

| Gap | Loại | Lý do bị bỏ sót |
|-----|------|-----------------|
| `Guard: Needs Escalation false → Return Result` | Contract | Story spec liệt kê trong Task 4.4 nhưng không có test number tương ứng |
| `Send Emergency 115 → Create Escalation Case` | Contract | Parallel path (Task 4.3) không có trong danh sách test spec |
| `Log Escalation Case Created → Return Result` | Contract | Không có test number được gán trong story spec |
| POST missing fields → 400 | API | Không có HTTP test nào cho endpoint (10.17 chỉ kiểm tra string trong source) |
| POST invalid JSON → 400 | API | Như trên |
| POST no BASEROW_URL → 503 | API | Như trên |

## Độ phủ

- Contract tests (n8n nodes): 21/21 ✅ (8.45–8.65)
- Contract tests (plugin/guardrail): 10/10 ✅ (11.1–11.10)
- API tests (endpoint behavior): 3/3 ✅ (error paths không cần Baserow live)
- ACs có test coverage: AC1 ✅ AC2 ✅ AC3 ✅ AC4 ✅ AC5 ✅ AC6 ✅ AC7 ✅ AC8 ✅ AC9 ✅

## Kết quả chạy test

| Lần chạy | Tests | Pass | Fail |
|----------|-------|------|------|
| Trước QA workflow | 671 | 670 | 1 |
| Sau QA workflow | 677 | 676 | 1 |

Failure duy nhất: `opt-in-gate.test.js — friended customer → 202 queued` — lỗi có trước Story 5.2, cần live Baserow, không liên quan.

## Ghi chú

Happy path (201 new case, 200 idempotent) không thể test tự động không cần Baserow thật. Để test đầy đủ AC4 idempotency, cần Baserow test instance hoặc mock adapter — nằm ngoài phạm vi Story 5.2.
