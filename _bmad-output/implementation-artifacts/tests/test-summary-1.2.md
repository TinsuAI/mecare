# Test Automation Summary — Story 1.2 (Khởi tạo Baserow schema nguồn sự thật)

**Workflow:** bmad-qa-generate-e2e-tests · **Date:** 2026-06-06 · **Engineer:** QA automation (Tinsu)
**Framework:** Node built-in runner (`node --test`), zero-dep ESM — kế thừa pattern Story 1.1.
**UI:** không có (story dữ liệu/hạ tầng) → không E2E trình duyệt. "E2E" = integration script + contract sâu, chạy offline.

> Lưu ý: `test-summary.md` (cùng thư mục) là summary Story 1.1 — giữ nguyên. File này riêng cho Story 1.2.

## Generated Tests

### Integration (script áp schema — Task 2)
- [x] `tests/integration/apply-baserow-schema.test.js` — exercise REAL `scripts/apply-baserow-schema.mjs`
  - Happy: `--dry-run` → exit 0, "Dry-run OK", "9 bảng"
  - Happy: dry-run không cần auth env (không gọi API)
  - Error: không auth + không `--dry-run` → exit ≠0 + "Thiếu auth" (die trong `authenticate()` trước network)

### Contract (mở rộng — gap auto-apply)
- [x] `tests/contract/baserow-schema.test.js` (+11 test mới)
  - **Applier-compat:** mọi field dùng kiểu `toBaserowField()` hỗ trợ; `single_select` options không rỗng; FK `link_row` trỏ bảng file số nhỏ hơn (1-pass ordering)
  - **Enum/key contract:** `Messages.type`, `EscalationCases.state` đúng tập giá trị; `case_id` unique; `version` là number
  - **Task 4:** `.env.example` có `BASEROW_API_URL`+`BASEROW_API_TOKEN`; `tenants/_template.env` có `BASEROW_API_TOKEN`; `docs/data-governance.md` document at-rest (LUKS/dm-crypt) + PII-min `customer_ref`
  - **Seed:** `FaqEntries` draft khung tructam, `question`/`answer`/`mandatory_suffix` trống (Story 1.4 điền)

## Coverage

| AC | Trước | Sau |
|---|---|---|
| AC1 — 9 bảng + naming | ✅ | ✅ + FK ordering + applier type-compat |
| AC2 — bảng kịch bản field duyệt | ✅ | ✅ + enum contract + version number |
| AC3 — Customers 3 field | ✅ | ✅ |
| AC4 — pharmacy_id tenant | ✅ | ✅ + env var Task 4 |
| AC5 — PII-min / no export | ✅ | ✅ + governance doc + customer_ref |
| Task 2 — applier idempotent | ❌ (0 test) | ✅ dry-run + auth-guard |

- Gap chính đã đóng: **applier script (Task 2) trước đây 0 test** — giờ có integration happy + error.
- Test count: **54 → 68** (+14). Suites 13 → 18.

## Validation (checklist.md)
- [x] API/integration tests generated · E2E n/a (no UI)
- [x] Standard framework APIs (`node:test`, `node:assert/strict`, `node:child_process`)
- [x] Happy path + error case (auth-guard)
- [x] Tất cả chạy xanh: **68 pass / 0 fail** (`cd tests && node --test`)
- [x] No hardcoded waits/sleeps · tests độc lập, không phụ thuộc thứ tự
- [x] Clear descriptions (tiếng Việt)

## Lệnh + kết quả
```
cd tests && node --test
# ℹ tests 68 · pass 68 · fail 0 · duration_ms ~521
```

## Next Steps
- Live e2e (Baserow up) đã verify trong dev-story (9 bảng + idempotent, alt port 8085) — integration offline bổ sung guard cho CI không cần Baserow.
- Story 1.3 (sinh mã ca) / 1.4 (nội dung persona) sẽ thêm test riêng khi implement.
