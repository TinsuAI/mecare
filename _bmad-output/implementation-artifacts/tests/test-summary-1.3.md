# Test Automation Summary — Story 1.3 (Sinh mã ca / idempotency key)

**Ngày:** 2026-06-06 · **Framework:** Node built-in runner (`node --test`), ESM zero-dep · **Lệnh:** `cd tests && node --test`

> Story 1.3 là **backend library** (sinh/parse/validate mã ca + allocator atomic). **KHÔNG có UI** → KHÔNG sinh Playwright E2E. Sinh **API tests** cho lớp REST `makeBaserowStore` + bổ sung gap test cho module thuần và allocator.

## Kết quả

| | Trước | Sau |
|---|---|---|
| tests | 95 | **121** (+26) |
| pass | 95 | **121** |
| fail | 0 | **0** |

## Tests sinh thêm (auto-applied gaps)

### API tests — `tests/integration/baserow-store.test.js` (MỚI, 15 test)
Gap lớn nhất: `makeBaserowStore` (lớp REST Baserow) trước đây **0 test**. Mock global `fetch` (không cần Baserow live):
- Env validation: thiếu `ESCALATION_TABLE_ID`, thiếu auth, JWT ưu tiên hơn Token, strip `/` đuôi URL.
- `listByPrefix`: query có filter tenant (`pharmacy_id` link_row) + prefix `case_id`; lọc client-side defensive; ném khi HTTP !ok.
- `getByCaseId`: khớp chính xác; trả null; ném khi !ok.
- `create`: wrap `pharmacy_id` → mảng link_row; unique-conflict (400 + code `UNIQUE`) → `CaseIdConflictError`; 400 non-unique → lỗi generic (không nhầm conflict, không nuốt); trả record khi OK.

### Integration — `tests/integration/case-allocator.test.js` (+8 test)
- `allocateNewCaseId` guards: store thiếu method, thiếu `pharmacyId` (NFR-6).
- Lỗi store non-conflict → ném ngay, KHÔNG retry, KHÔNG nuốt (đếm `createCalls===1`).
- Conflict 1 lần rồi thành công → re-read maxSeq → cấp seq mới (đua thực).
- `maxSeqOf` defensive: record `case_id` rác không chặn allocate.
- `getOrCreateByCaseId` guards + lỗi create non-conflict rethrow.

### Contract — `tests/contract/case-id.test.js` (+3 test)
- `buildCaseId` reject khi thiếu args (undefined slug/date/seq).
- `vnDateStamp` reject epoch `NaN`/`Infinity`.
- `parseCaseId` reject `seq=0` (phải ≥1) + `isValidCaseId` false.

## Coverage AC
- AC1 (format/seq/timezone) ✅ · AC2 (atomic concurrency) ✅ · AC3 (idempotent) ✅ · AC4 (pure module) ✅ · AC5 (test phủ + regression) ✅
- Lớp REST store (đường ra Baserow thật) — trước hở, **nay phủ qua mock fetch**.

## Next steps
- Chạy trong CI (`cd tests && node --test`).
- Khi Baserow live: chạy `scripts/demo-allocate-case.mjs` để e2e thật (Task 4).
