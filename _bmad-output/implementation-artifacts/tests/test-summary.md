# Tóm tắt kiểm thử tự động — Story 3.1

## Tests đã tạo

### Contract Tests
- [x] `tests/contract/baserow-views.test.js` — Kiểm tra cấu trúc view JSON (offline)

### Integration Tests
- [x] `tests/integration/apply-baserow-schema.test.js` — Bổ sung describe block `--views` (Story 3.1, Task 5)

## Coverage Story 3.1

| AC | Mô tả | Tests |
|----|-------|-------|
| AC1 | Counter form tạo hồ sơ ≤20s | counter-entry-form: type, fields, order, required |
| AC2 | Phone-lookup grid ≤3s | phone-lookup: sortings, visible fields, tenant isolation |
| AC3 | pharmacy_id pre-fill + friend_status=pending | default_value=pending, pharmacy_id hidden |
| Task 5 | `--views --dry-run` CI gate | exit 0, báo 2 file, tên cả 2 view, auth-guard |

## Chi tiết

### `tests/contract/baserow-views.test.js` (11 tests)

**AC1/AC3 — counter-entry-form:**
- [x] type=form, table=Customers, name=counter-entry-form
- [x] submit_button_label và title tồn tại
- [x] 5 field hiển thị đúng thứ tự: full_name, phone, care_group, friend_status, notes
- [x] full_name, phone, care_group, friend_status required=true
- [x] friend_status default_value=pending (AC3)
- [x] pharmacy_id, is_complaint_active, created_at, updated_at hidden=true

**AC2 — phone-lookup grid:**
- [x] type=grid, table=Customers, name=phone-lookup
- [x] sortings: phone ASC trước, full_name ASC sau
- [x] 6 field visible: full_name, phone, care_group, friend_status, notes, pharmacy_id
- [x] is_complaint_active, created_at, updated_at hidden
- [x] description đề cập tenant isolation qua pharmacy_id

### `tests/integration/apply-baserow-schema.test.js` — block mới (4 tests)

- [x] `--views --dry-run` exit 0 + báo 2 file
- [x] stdout liệt kê counter-entry-form và phone-lookup
- [x] dry-run không cần auth env
- [x] `--views` không auth → exit ≠0 + "Thiếu auth"

## Kết quả chạy

```
tests 419 | suites 119 | pass 419 | fail 0
```

Toàn bộ 419 tests pass — không có regression.
