---
baseline_commit: 68830b459491fc9a57b72acbe2ef6289af9be77d
---

# Story 3.2: Phân khách vào đúng 1/6 Nhóm chăm sóc + log đổi nhóm

Status: done

## Story

As a nhân viên nhà thuốc,
I want phân mỗi khách vào đúng một Nhóm chăm sóc với gợi ý theo loại thuốc và ghi lại lịch sử mỗi lần đổi nhóm,
so that khách nhận đúng luồng chăm sóc, phân loại nhất quán, và mọi thay đổi phân nhóm đều có audit trail.

## Acceptance Criteria

1. **[AC1 — Gợi ý nhóm theo logic loại thuốc]**  
   Given khách có thông tin thuốc/sản phẩm  
   When nhân viên phân nhóm  
   Then nhân viên tham chiếu bảng quyết định trong SOP (xem `docs/baserow-counter-form-sop.md`) theo thứ tự ưu tiên:
   - Mãn tính (tiểu đường / cao huyết áp / tim mạch) → **N1** (override tất cả)
   - Thuốc kê đơn bác sĩ → **N3**
   - TPCN / dụng cụ y tế → **N4**
   - OTC không kê đơn → **N2**
   - Không đủ thông tin (5 tình huống: từ chối chia sẻ, mua hộ, đang vội, người già/khó giao tiếp, lần đầu/nhân viên quên nhập) → **N6**

2. **[AC2 — Một nhóm duy nhất; is_complaint_active không ghi đè care_group]**  
   Given một khách tại một thời điểm  
   When kiểm tra  
   Then field `care_group` của khách là đúng 1 số nguyên trong 1..6; cờ `is_complaint_active = true` (Nhóm 5 khiếu nại) được bật riêng khi có khiếu nại — KHÔNG ghi đè `care_group` hiện tại; view `02-customers-by-group` hiển thị cả `care_group` lẫn `is_complaint_active` để nhân viên thấy đồng thời

3. **[AC3 — Ghi log lịch sử đổi nhóm]**  
   Given nhân viên thay đổi `care_group` của một khách  
   When lưu thay đổi  
   Then nhân viên tạo thêm một hàng trong bảng `CustomerGroupChanges` (theo SOP 2 bước); hàng log chứa: `customer_id` link đúng khách, `pharmacy_id` đúng tenant, `from_group` (nhóm cũ), `to_group` (nhóm mới), `changed_at` (thời điểm thực tế), `changed_by` (tên nhân viên, optional); lịch sử log xem được trong view `group-changes-log` — sắp xếp `changed_at` giảm dần (mới nhất trên cùng)

## Tasks / Subtasks

- [x] Task 1: Tạo `baserow/schema/10-customer-group-changes.json` (AC: 3)
  - [x] 1.1 Table: `CustomerGroupChanges`; primary: `changed_at` (type `date`, include_time: true)
  - [x] 1.2 Fields: `changed_at` (date, include_time: true), `pharmacy_id` (link_row → Pharmacies), `customer_id` (link_row → Customers), `from_group` (number, decimals: 0), `to_group` (number, decimals: 0), `changed_by` (text)
  - [x] 1.3 Description: "Audit log đổi nhóm chăm sóc. Mỗi hàng = 1 lần đổi nhóm. Append-only. Không xóa hàng cũ."

- [x] Task 2: Tạo `baserow/views/02-customers-by-group.json` (AC: 1, 2)
  - [x] 2.1 View type: `grid`, table: `Customers`, name: `customers-by-group`
  - [x] 2.2 Sortings: `care_group` ASC (primary), `full_name` ASC (secondary)
  - [x] 2.3 Fields visible: `full_name`, `phone`, `care_group`, `is_complaint_active`, `friend_status`, `notes`, `pharmacy_id`; hidden: `created_at`, `updated_at`
  - [x] 2.4 Description: "Danh sách khách theo nhóm chăm sóc. Inline-edit care_group để đổi nhóm. Dùng kèm CustomerGroupChanges để log thay đổi."

- [x] Task 3: Tạo `baserow/views/10-customer-group-changes-log.json` (AC: 3)
  - [x] 3.1 View type: `grid`, table: `CustomerGroupChanges`, name: `group-changes-log`
  - [x] 3.2 Sortings: `changed_at` DESC (mới nhất trên cùng)
  - [x] 3.3 Fields: tất cả visible — `changed_at`, `customer_id`, `pharmacy_id`, `from_group`, `to_group`, `changed_by`
  - [x] 3.4 Description: "Audit trail đổi nhóm — xem lịch sử phân nhóm theo thời gian."

- [x] Task 4: Cập nhật `docs/baserow-counter-form-sop.md` (AC: 1, 2, 3)
  - [x] 4.1 Thêm section "Bảng quyết định phân nhóm (chi tiết)" — bảng quyết định đầy đủ với priority rõ ràng và 5 tình huống N6
  - [x] 4.2 Thêm section "Xử lý khiếu nại (Nhóm 5)" — hướng dẫn bật `is_complaint_active = true` trực tiếp trong Baserow mà KHÔNG đổi `care_group`
  - [x] 4.3 Thêm section "Đổi nhóm khách + ghi log (2 bước)" — Bước 1: mở view `customers-by-group`, tìm khách, sửa inline `care_group`; Bước 2: mở bảng `CustomerGroupChanges`, add row mới điền đủ fields

- [x] Task 5: Cập nhật tests (AC: 1, 2, 3)
  - [x] 5.1 `tests/contract/baserow-schema.test.js`:
    - Sửa `schemas.length === 9` → `=== 10`
    - Thêm `"CustomerGroupChanges"` vào `REQUIRED_TABLES`
    - Thêm describe block: assert `CustomerGroupChanges` có đủ fields `changed_at`, `customer_id`, `pharmacy_id`, `from_group`, `to_group`; assert primary `changed_at` is type `date`
  - [x] 5.2 `tests/contract/baserow-views.test.js`:
    - Thêm `loadView("02-customers-by-group.json")` + assertions: type=`grid`, table=`Customers`, name=`customers-by-group`, `care_group` visible, `is_complaint_active` visible, sort on `care_group` ASC
    - Thêm `loadView("10-customer-group-changes-log.json")` + assertions: type=`grid`, table=`CustomerGroupChanges`, name=`group-changes-log`, sort on `changed_at` DESC
  - [x] 5.3 `tests/integration/apply-baserow-schema.test.js`:
    - Sửa `"2 file"` → `"4 file"` trong dry-run views test
    - Thêm assertions: stdout phải match `customers-by-group` và `group-changes-log`

## Dev Notes

### Architecture Constraints

- **Không build frontend riêng v1** — giao diện phân nhóm = Baserow grid view `02-customers-by-group`. Mọi thay đổi `care_group` thực hiện inline trong Baserow UI. [Source: architecture.md#Frontend Architecture]
- **care_group 1..6 không enforce ở DB layer** — Baserow không có range constraint trên number field; validate ở lớp app/form. Counter form (Story 3.1) có description hint. [Source: baserow/schema/02-customers.json line 9]
- **is_complaint_active = cờ cắt ngang, KHÔNG ghi đè care_group** — Nhóm 5 khiếu nại là trạng thái overlay, không thay thế nhóm gốc. PRD FR-2 Notes chốt: "v1 xử lý Nhóm 5 như trạng thái/luồng ưu tiên, không xóa nhóm gốc." [Source: prd.md#FR-2 Notes + architecture.md#Naming Patterns]
- **Multi-tenant isolation** — mọi hàng `CustomerGroupChanges` phải có `pharmacy_id` link đúng tenant. Nhân viên chọn đúng `pharmacy_id` khi tạo log row. [Source: architecture.md#Multi-tenancy]
- **Automation deferred (log tạo thủ công)** — v1 dùng manual SOP: nhân viên tự tạo hàng log. n8n automation via Baserow `row.updated` webhook sẽ cân nhắc trong Epic 4. Rationale: (a) n8n workflows chưa có trong codebase, (b) Baserow v1.30.x webhook payload cần verify xem có trả về old_value cho `care_group` không — tránh block story vì chưa rõ API contract.

### Schema Design Notes

- `CustomerGroupChanges` follow pattern `EscalationCases` — append-only event log, không có status/edit workflow.
- Primary: `changed_at` (date+time) — collision lý thuyết nếu đổi nhóm 2 khách trong cùng giây, chấp nhận được cho MVP. Không thể dùng `customer_id` làm primary (phải là link_row, bị cấm bởi schema contract).
- **Test breaking change**: `baserow-schema.test.js` line ~30 hardcode `schemas.length === 9`. Phải cập nhật → 10 trong Task 5.1 trước khi test pass.
- `changed_by` field type `text` (không phải link_row vào Users) — nhân viên tự nhập tên; tránh dependency vào user management chưa có.

### N6 Decision Tree — 5 Tình Huống

Per PRD §4.1 FR-2 + reconcile-brief-addendum.md#GAP-2 (5 ca đầy đủ được khôi phục):
1. **Từ chối chia sẻ** — khách không muốn cho thông tin sức khỏe
2. **Mua hộ người khác** — không biết bệnh trạng người thực sự dùng
3. **Đang vội** — không có thời gian khai báo
4. **Người già / khó giao tiếp** — không thu thập được thông tin đầy đủ
5. **Lần đầu / nhân viên quên nhập** — không đủ dữ liệu phân nhóm

→ Tất cả 5 tình huống → N6. Hành vi N6: gửi 1–2 tin hướng dẫn tối giản sau mua; không chủ động nhắn thêm trừ khi khách phản hồi (FR-6). [Source: prd.md#134 + architecture.md#148]

### Project Structure Notes

- `baserow/schema/10-customer-group-changes.json` — file schema thứ 10, numbering tiếp sau `09-faq-entries.json`
- `baserow/views/02-customers-by-group.json` — view thứ 3 (prefix `02` = bảng Customers, tương tự 2 view Story 3.1)
- `baserow/views/10-customer-group-changes-log.json` — view thứ 4 (prefix `10` = bảng CustomerGroupChanges)
- `docs/baserow-counter-form-sop.md` — update (không tạo file mới); Story 3.1 đã tạo file này; Story 3.2 thêm 3 sections
- `tests/contract/baserow-schema.test.js` — update count + REQUIRED_TABLES (không tạo file mới)
- `tests/contract/baserow-views.test.js` — thêm assertions cho 2 view mới (không tạo file mới)
- `tests/integration/apply-baserow-schema.test.js` — sửa "2 file" → "4 file" + thêm view name assertions

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2] — AC gốc + user story (lines ~449–480)
- [Source: _bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/prd.md#FR-2] — logic gợi ý nhóm + N5 Notes + N6 5 tình huống (lines ~128–136)
- [Source: _bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/reconcile-brief-addendum.md#GAP-2] — 5 tình huống N6 đầy đủ (từ chối, mua hộ, vội, người già, lần đầu)
- [Source: baserow/schema/02-customers.json] — care_group (number 1..6), is_complaint_active (boolean) field definitions
- [Source: baserow/schema/06-escalation-cases.json] — pattern audit/event log table (append-only, không có status/edit)
- [Source: baserow/views/02-customers-phone-lookup.json] — JSON structure pattern cho grid view
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — multi-tenant pattern, is_complaint_active design decision
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — table PascalCase plural, field snake_case
- [Source: tests/contract/baserow-schema.test.js] — `schemas.length === 9` assertion cần update → 10
- [Source: tests/integration/apply-baserow-schema.test.js] — `"2 file"` assertion cần update → `"4 file"`
- [Source: docs/baserow-counter-form-sop.md] — file đã tạo ở Story 3.1; Story 3.2 append 3 sections

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Integration test also hardcoded `/9 bảng/` assertion (test title + stdout match) — updated to `/10 bảng/` alongside the "2 file"→"4 file" fix.

### Completion Notes List

- Task 1: Created `baserow/schema/10-customer-group-changes.json` — append-only event log table following EscalationCases pattern. Primary: `changed_at` (date+time). FKs to Pharmacies (01) and Customers (02) satisfy applier ordering constraint. All 6 fields use supported types.
- Task 2: Created `baserow/views/02-customers-by-group.json` — grid view for inline `care_group` editing. Both `care_group` and `is_complaint_active` visible simultaneously per AC2. Sorted care_group ASC → full_name ASC.
- Task 3: Created `baserow/views/10-customer-group-changes-log.json` — audit trail grid view for CustomerGroupChanges table. Sorted `changed_at` DESC (newest first). All 6 fields visible.
- Task 4: Appended 3 sections to `docs/baserow-counter-form-sop.md`: decision table with all 5 N6 situations, complaint handling SOP (is_complaint_active as orthogonal flag), and 2-step group-change log SOP.
- Task 5: Updated 3 test files. Schema contract: 9→10 count, added CustomerGroupChanges to REQUIRED_TABLES, added 3-test describe block validating fields and primary type. Views contract: new file (Story 3.1+3.2 view tests + QA gap-fill SOP doc tests). Integration: "2 file"→"4 file", "9 bảng"→"10 bảng", added customers-by-group and group-changes-log stdout assertions, fixed describe/test labels.
- Full suite: 445/445 pass, 0 fail (was 419/419 before Story 3.2; +26 net new tests: 11 dev + 15 QA gap-fill).

### File List

- `baserow/schema/10-customer-group-changes.json` (new)
- `baserow/views/02-customers-by-group.json` (new)
- `baserow/views/10-customer-group-changes-log.json` (new)
- `docs/baserow-counter-form-sop.md` (modified — +72 lines, 3 new sections)
- `tests/contract/baserow-schema.test.js` (modified — count 9→10, REQUIRED_TABLES +1, +describe block)
- `tests/contract/baserow-views.test.js` (new — Story 3.1+3.2 view tests + QA gap-fill SOP doc tests; 8 describe blocks)
- `tests/integration/apply-baserow-schema.test.js` (modified — "2 file"→"4 file", "9 bảng"→"10 bảng", +2 view name assertions, describe/test label updated to Story 3.1/3.2)
- `scripts/apply-baserow-schema.mjs` (modified — +1 line: default_value warning log in applyView())

## Senior Developer Review (AI)

**Reviewer:** gabenidolcs (AI) on 2026-06-07
**Outcome:** ✅ APPROVED

### Git vs Story Discrepancies
- `scripts/apply-baserow-schema.mjs` — modified (undocumented +1 warning line) → **Fixed**: added to File List
- `tests/contract/baserow-views.test.js` — annotated "(modified)" but is a new file → **Fixed**: annotation corrected
- `docs/spike-multi-tenant-g6.md` — modified in working tree, unrelated to Story 3.2 (Story 1.6 spike doc)

### Issues Found & Fixed

**MEDIUM — Fixed:**
1. `scripts/apply-baserow-schema.mjs` modified but absent from Dev Agent Record File List. Added.
2. `tests/integration/apply-baserow-schema.test.js` describe label `"Story 3.1, Task 5"` + test name `"báo 2 view file"` stale after Story 3.2 additions. Updated to `"Story 3.1/3.2, Task 5"` / `"báo 4 view file"`.
3. `tests/contract/baserow-views.test.js` incorrectly annotated `(modified)` — git shows `??` (new). Fixed annotation.

**LOW — Fixed:**
4. Completion notes said `430/430, +11 tests` — QA gap-fill brought final count to `445/445, +26 tests`. Updated.

### Validation Checklist Summary
- [x] All 3 ACs implemented: decision table SOP ✓, orthogonal is_complaint_active flag ✓, CustomerGroupChanges append-only log ✓
- [x] All Tasks [x] verified against actual files
- [x] 445/445 tests pass — schema contract, views contract, integration
- [x] FK ordering constraint satisfied (CustomerGroupChanges file 10 → Pharmacies file 01, Customers file 02)
- [x] Multi-tenant: pharmacy_id link_row present on CustomerGroupChanges ✓
- [x] No security vulnerabilities
- [x] No CRITICAL issues remain
