# Test Automation Summary — Story 3.2

## Generated Tests (Gap-Fill)

### Contract Tests — `tests/contract/baserow-schema.test.js` (+3 tests)
- [x] `changed_by field tồn tại và là type text (AC3 — tên nhân viên, tùy chọn)`
- [x] `from_group và to_group có decimals: 0 (integer — không số thập phân)`
- [x] `schema description ghi rõ append-only contract (không xóa hàng cũ)`

### Contract Tests — `tests/contract/baserow-views.test.js` (+12 tests)
- [x] `group-changes-log: description tồn tại (audit trail label)`
- [x] `customers-by-group: description tồn tại và nhắc care_group + CustomerGroupChanges`
- [x] `AC1 SOP: section 'Bảng quyết định phân nhóm' tồn tại`
- [x] `AC1 SOP: N1 override listed (mãn tính → N1 ưu tiên cao nhất)`
- [x] `AC1 SOP: 5 tình huống N6 đầy đủ (từ chối, mua hộ, vội, người già, lần đầu)`
- [x] `AC2 SOP: section 'Xử lý khiếu nại' tồn tại`
- [x] `AC2 SOP: is_complaint_active KHÔNG thay thế/ghi đè care_group`
- [x] `AC2 SOP: hướng dẫn bật is_complaint_active = true, giữ nguyên care_group`
- [x] `AC3 SOP: section 'Đổi nhóm khách + ghi log' tồn tại`
- [x] `AC3 SOP: SOP mô tả 2 bước (Bước 1 + Bước 2)`
- [x] `AC3 SOP: Bước 1 dùng view customers-by-group`
- [x] `AC3 SOP: Bước 2 ghi vào CustomerGroupChanges với đủ fields`

## Coverage

| AC | Description | Schema | Views | Integration | SOP doc |
|----|-------------|--------|-------|-------------|---------|
| AC1 | Gợi ý nhóm theo logic loại thuốc (N1→N3→N4→N2→N6) | — | — | — | 3 tests ← gap filled |
| AC2 | is_complaint_active không ghi đè care_group; view hiển thị đồng thời | 2 tests | 3 tests | — | 3 tests ← gap filled |
| AC3 | Ghi log CustomerGroupChanges + view sorted DESC | 6 tests | 4 tests | 4 tests | 6 tests ← gap filled |
| Schema contract | Table fields, types, primary, FK ordering | 10 tests | — | — | — |
| View contract | Type, sortings, visibility | — | 8 tests | — | — |
| Integration | Applier dry-run 4 views | — | — | 4 tests | — |

## Gaps Found & Fixed

1. **`changed_by` field** — AC3 lists it explicitly; schema test only checked 5/6 fields
2. **`decimals: 0` constraint** — from_group/to_group integer contract not asserted
3. **Schema `description`** — "Append-only. Không xóa hàng cũ." invariant untested
4. **View descriptions** — customers-by-group and group-changes-log descriptions not tested
5. **SOP doc sections** — Task 4 added 3 sections (AC1 decision table, AC2 complaint SOP, AC3 log SOP); no tests existed
6. **N6 5 situations** — all 5 situations in SOP doc not verified by tests

## Result

**445 tests, 445 pass, 0 fail** (up from 430 pre-gap-fill, +15 new tests)
