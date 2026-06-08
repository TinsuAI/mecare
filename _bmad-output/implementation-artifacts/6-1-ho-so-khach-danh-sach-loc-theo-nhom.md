# Story 6.1: Hồ sơ khách & danh sách lọc theo nhóm

Status: done

## Story

As a chủ nhà thuốc,
I want xem hồ sơ từng khách và lọc khách theo Nhóm chăm sóc,
so that tôi nắm tình hình chăm sóc và tra cứu nhanh (FR-14).

## Acceptance Criteria

1. **[AC1 — Danh sách khách lọc theo nhóm]**
   Given view `02-customers-by-group.json` (bảng `Customers`)
   When chủ nhà thuốc mở Baserow
   Then thấy danh sách khách sort `care_group` ASC → `full_name` ASC; lọc được theo giá trị `care_group` 1..6 qua Baserow filter UI (không cần filter lưu sẵn trong view — Baserow runtime filter đủ); các cột visible: `full_name`, `phone`, `care_group`, `is_complaint_active`, `is_opted_out`, `group6_unlocked`, `friend_status`, `notes`, `pharmacy_id`.

2. **[AC2 — Per-tenant isolation]**
   Given view `02-customers-by-group.json`
   When chủ nhà thuốc xem danh sách
   Then chỉ thấy khách trong `pharmacy_id` của mình; field `pharmacy_id` visible để xác nhận tenant; filter `pharmacy_id` được set thủ công (hoặc qua onboarding runbook Story 7.1) — view không hardcode filter value vì Baserow link_row filter đòi row_id cụ thể per tenant.

3. **[AC3 — Hồ sơ khách — thuốc & đơn mua (Purchases)]**
   Given mở record một khách trong Baserow
   When xem panel liên kết
   Then thấy `Purchases` rows liên quan (product_name, qty, purchased_at, note) vì `Purchases.customer_id` là `link_row → Customers`; không cần tạo file mới — đây là tính năng tự động của Baserow link_row back-reference.

4. **[AC4 — Hồ sơ khách — lịch nhắc sắp tới (CareSchedule)]**
   Given mở record một khách trong Baserow
   When xem panel liên kết
   Then thấy `CareSchedule` rows liên quan (due_at, cadence_type, status, care_group) vì `CareSchedule.customer_id` là `link_row → Customers`; chỉ xem, không edit từ đây — đây là tính năng tự động của Baserow link_row back-reference.

5. **[AC5 — Lịch sử hội thoại (Messages lookup view)]**
   Given file `baserow/views/05-customer-messages-lookup.json`
   When chủ nhà thuốc cần xem lịch sử hội thoại một khách
   Then mở view này, filter theo `pharmacy_id` để thu hẹp về tenant; sort `ts` DESC (mới nhất lên đầu); columns visible: `customer_ref`, `type`, `status`, `case_id`, `content`, `ts`, `pharmacy_id`; `message_id`, `error` hidden. Ghi chú thiết kế: `Messages` dùng `customer_ref` (token ẩn danh per NFR-5) — không có back-reference tự động từ Customer record → Messages; đây là giới hạn v1 (intentional per NFR-5, không phải bug).

6. **[AC6 — Gallery view để browse hồ sơ theo card]**
   Given file `baserow/views/02-customers-gallery.json`
   When chủ nhà thuốc mở gallery view
   Then thấy card mỗi khách hiển thị: `full_name` (primary), `care_group`, `phone`, `is_complaint_active`, `is_opted_out`, `friend_status`; dùng để overview danh sách khách nhanh hơn grid.

7. **[AC7 — view 02-customers-by-group có đủ fields Story 4.x]**
   Given `02-customers-by-group.json` từ Story 3.2 thiếu 2 fields thêm sau đó
   When Story 6.1 update view
   Then `is_opted_out` (added Story 4.4) và `group6_unlocked` (added Story 4.2) có trong `fields` array với `hidden: false`; contract test xác nhận.

8. **[AC8 — Contract tests pass]**
   Given các file view JSON của Story 6.1
   When chạy `node --test tests/contract/baserow-views.test.js`
   Then tất cả tests 15.1–15.8 pass; toàn bộ suite không có regression.

## Tasks / Subtasks

- [x] Task 1 — Update `baserow/views/02-customers-by-group.json` (AC: 1, 2, 7)
  - [x] 1.1 Thêm `{ "name": "is_opted_out", "hidden": false }` vào `fields` array (sau `is_complaint_active`)
  - [x] 1.2 Thêm `{ "name": "group6_unlocked", "hidden": false }` vào `fields` array (sau `is_opted_out`)
  - [x] 1.3 Verify tất cả 11 fields hiện diện: `full_name`, `phone`, `care_group`, `is_complaint_active`, `is_opted_out`, `group6_unlocked`, `friend_status`, `notes`, `pharmacy_id`, `created_at` (hidden), `updated_at` (hidden)
  - [x] 1.4 Cập nhật `description` để đề cập tenant isolation và filter workflow

- [x] Task 2 — Tạo `baserow/views/02-customers-gallery.json` (AC: 6)
  - [x] 2.1 type=`gallery`, table=`Customers`, name=`customers-gallery`
  - [x] 2.2 Fields card visible: `full_name`, `care_group`, `phone`, `is_complaint_active`, `is_opted_out`, `friend_status`
  - [x] 2.3 Fields hidden: `notes`, `pharmacy_id`, `group6_unlocked`, `created_at`, `updated_at`
  - [x] 2.4 sortings: `care_group` ASC, `full_name` ASC
  - [x] 2.5 Thêm description: "Gallery view hồ sơ khách — browse theo card. Lọc theo pharmacy_id trước khi xem."

- [x] Task 3 — Tạo `baserow/views/05-customer-messages-lookup.json` (AC: 5)
  - [x] 3.1 type=`grid`, table=`Messages`, name=`customer-messages-lookup`
  - [x] 3.2 sortings: `pharmacy_id` ASC (nhóm theo tenant trước), `ts` DESC (mới nhất lên đầu sau)
  - [x] 3.3 Fields visible: `customer_ref`, `type`, `status`, `case_id`, `content`, `ts`, `pharmacy_id`
  - [x] 3.4 Fields hidden: `message_id`, `error`, `care_group`
  - [x] 3.5 description: "Lịch sử hội thoại — filter theo pharmacy_id để xem tin của tenant. customer_ref = token ẩn danh (NFR-5, không phải tên/SĐT thật). Không có back-reference từ Customer record do thiết kế PII-min v1."

- [x] Task 4 — Contract tests (AC: 7, 8)
  - [x] 4.1 Thêm `describe("AC1/AC7 (Story 6.1) — customers-by-group updated")` trong `tests/contract/baserow-views.test.js`:
    - 15.1: `is_opted_out` có trong fields với `hidden: false`
    - 15.2: `group6_unlocked` có trong fields với `hidden: false`
    - 15.3: tổng visible field count ≥ 9 (`full_name`, `phone`, `care_group`, `is_complaint_active`, `is_opted_out`, `group6_unlocked`, `friend_status`, `notes`, `pharmacy_id`)
  - [x] 4.2 Thêm `describe("AC6 (Story 6.1) — customers-gallery view")`:
    - 15.4: type=gallery, table=Customers, name=customers-gallery
    - 15.5: `full_name`, `care_group`, `phone`, `is_complaint_active`, `is_opted_out`, `friend_status` visible
    - 15.6: description tồn tại và đề cập pharmacy_id filter
  - [x] 4.3 Thêm `describe("AC5 (Story 6.1) — customer-messages-lookup view")`:
    - 15.7: type=grid, table=Messages, name=customer-messages-lookup
    - 15.8: sort ts DESC có trong sortings; `customer_ref`, `type`, `status`, `case_id`, `content`, `ts`, `pharmacy_id` visible; `message_id` và `error` hidden
  - [x] 4.4 Chạy `node --test tests/contract/baserow-views.test.js` → exit 0
  - [x] 4.5 Chạy toàn bộ suite `npm test` → không có regression (baseline: 768 tests)

## Dev Notes

### Architecture Constraints

- **Không build frontend riêng v1** — FR-14 delivered hoàn toàn qua Baserow UI/views. Không có API endpoint mới, không có UI component mới. [Source: architecture.md#Kiến trúc 7 thành phần]
- **Multi-tenant isolation**: mọi record `Customers` phân vùng theo `pharmacy_id`; filter per-tenant phải set thủ công (hoặc trong onboarding runbook Story 7.1) vì Baserow link_row filter đòi row_id cụ thể — không thể hardcode trong view JSON. [Source: architecture.md#Multi-tenancy]
- **PII minimization**: `full_name` và `phone` chỉ tồn tại trong Baserow self-host; cloud calls chỉ thấy `customer_ref` token ẩn danh; Messages không có link_row → Customers là intentional NFR-5 design — KHÔNG thêm customer_id link_row vào Messages mà không refactor cả Epic 5 n8n workflows. [Source: architecture.md#PII-minimization bắt buộc + NFR-5]

### Purchases & CareSchedule Back-References (No File Work Needed)

Baserow tự động hiển thị linked rows khi mở một record. Dev **không cần tạo thêm file hay field** cho AC3 và AC4:
- `Purchases.customer_id` = `link_row → Customers` → khi mở Customer record, tab/panel "Purchases" xuất hiện tự động với related rows [Source: `baserow/schema/03-medications.json`]
- `CareSchedule.customer_id` = `link_row → Customers` → tương tự, tab "CareSchedule" tự động [Source: `baserow/schema/04-care-schedule.json`]
- `EscalationCases.customer_id` = `link_row → Customers` → tab "EscalationCases" tự động (bonus — không yêu cầu AC nhưng có sẵn) [Source: `baserow/schema/06-escalation-cases.json`]

Dev chỉ cần **verify** (không tạo mới) rằng các schema files trên có `customer_id` link_row field. Nếu missing → thêm vào schema file tương ứng (schema là source of truth, apply script sẽ tạo field khi chạy).

### Conversation History — v1 Design Constraint

`Messages` dùng text `customer_ref` (không phải link_row → Customers) vì:
1. NFR-5 PII minimization: Messages gửi ra cloud-bound (OpenRouter, OpenClaw) → dùng token ẩn danh
2. Epic 5 n8n workflows đã viết hardcode `customer_ref` — refactor ra ngoài scope Story 6.1

Workaround v1: chủ nhà thuốc navigate riêng đến view `05-customer-messages-lookup.json`, filter `pharmacy_id` = tenant của mình → thấy toàn bộ hội thoại của tenant theo thứ tự thời gian. Không filter được theo tên khách cụ thể (chỉ có customer_ref ẩn danh trong Messages). Đây là giới hạn thiết kế có chủ ý, không phải bug.

### View Naming Convention

File prefix = số thứ tự schema tương ứng:
- `02-*` = Customers table (schema `02-customers.json`)
- `05-*` = Messages table (schema `05-messages.json`)
- Existing: `02-customers-by-group`, `02-customers-counter-form`, `02-customers-phone-lookup`, `05-messages-history`

Story 6.1 thêm: `02-customers-gallery`, `05-customer-messages-lookup`. [Source: architecture.md#Source tree + `baserow/views/` existing files]

### Existing `02-customers-by-group.json` — Update Not Rewrite

File này **đã tồn tại** từ Story 3.2. Story 6.1 chỉ **thêm 2 fields** (`is_opted_out`, `group6_unlocked`) — KHÔNG xóa hoặc reorder fields hiện có để tránh break Story 3.2 contract tests. Existing tests tại `tests/contract/baserow-views.test.js` lines 105–146 phải tiếp tục pass.

### apply-baserow-schema.mjs Support

Script `scripts/apply-baserow-schema.mjs` đã có `loadViews()` + `applyView()` (added Story 3.1). Story 6.1 không cần thay đổi script — các view JSON mới sẽ được pick up tự động bởi `VIEWS_DIR` glob.

Verify sau khi tạo files: `node scripts/apply-baserow-schema.mjs --views --dry-run` → phải print tên 3 view files mới (02-customers-gallery, 05-customer-messages-lookup, và 02-customers-by-group updated) mà không lỗi JSON parse.

### Project Structure Notes

- Files cần update: `baserow/views/02-customers-by-group.json` (thêm 2 fields)
- Files cần tạo mới: `baserow/views/02-customers-gallery.json`, `baserow/views/05-customer-messages-lookup.json`
- Files cần update (tests): `tests/contract/baserow-views.test.js` (thêm describe block)
- Files KHÔNG touch: n8n workflows (Epic 5), schema files (đã có link_row — verify only), `scripts/apply-baserow-schema.mjs`

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 6.1`] — AC từ epics
- [Source: `_bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/prd.md#FR-14`] — FR-14 consequences testable
- [Source: `_bmad-output/planning-artifacts/architecture.md#Baserow naming`] — PascalCase tables, snake_case fields
- [Source: `_bmad-output/planning-artifacts/architecture.md#Không build frontend riêng v1`] — CRM = Baserow UI/views only
- [Source: `baserow/schema/02-customers.json`] — Customers table fields (is_opted_out, group6_unlocked, care_group range 1..6)
- [Source: `baserow/schema/03-medications.json`] — Purchases.customer_id = link_row → Customers (AC3)
- [Source: `baserow/schema/04-care-schedule.json`] — CareSchedule.customer_id = link_row → Customers (AC4)
- [Source: `baserow/schema/05-messages.json`] — Messages.customer_ref = text (no link_row — v1 design constraint)
- [Source: `baserow/views/02-customers-by-group.json`] — existing view to update (add is_opted_out, group6_unlocked)
- [Source: `baserow/views/05-messages-history.json`] — reference pattern for Messages grid view structure
- [Source: `tests/contract/baserow-views.test.js`] — existing test structure to extend (lines 250–310 for Story 5.4 pattern)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- All 4 tasks complete: updated 02-customers-by-group.json (+is_opted_out, +group6_unlocked), created 02-customers-gallery.json (gallery view), created 05-customer-messages-lookup.json (messages lookup grid), added 8 contract tests (15.1–15.8)
- 776/776 tests pass (+8 new vs baseline 768)

### File List

- baserow/views/02-customers-by-group.json (updated)
- baserow/views/02-customers-gallery.json (new)
- baserow/views/05-customer-messages-lookup.json (new)
- tests/contract/baserow-views.test.js (updated)

## Senior Developer Review (AI)

**Reviewer:** gabenidolcs (AI) — 2026-06-07
**Outcome:** APPROVED

### AC Coverage

| AC | Status | Notes |
|----|--------|-------|
| AC1 — customers-by-group sorted + 9 visible fields | ✅ Pass | care_group ASC → full_name ASC; all 9 required fields visible |
| AC2 — per-tenant isolation via pharmacy_id | ✅ Pass | pharmacy_id visible; description documents manual filter requirement; no hardcoded filter |
| AC3 — Purchases back-reference (link_row) | ✅ Pass | 03-medications.json.customer_id = link_row → Customers (test 15.13) |
| AC4 — CareSchedule back-reference (link_row) | ✅ Pass | 04-care-schedule.json.customer_id = link_row → Customers (test 15.14) |
| AC5 — Messages lookup view | ✅ Pass | type=grid/Messages; sort pharmacy_id ASC + ts DESC; correct visible/hidden fields |
| AC6 — Gallery view | ✅ Pass | type=gallery/Customers; 6 card fields visible; sort care_group + full_name ASC |
| AC7 — is_opted_out + group6_unlocked in customers-by-group | ✅ Pass | Both hidden:false; tests 15.1–15.2 confirm |
| AC8 — Contract tests pass | ✅ Pass | 782/782 pass; no regressions |

### Issues Found

| Severity | Issue | Fix Applied |
|----------|-------|-------------|
| MEDIUM | sprint-status.yaml showed `ready-for-dev` for 6-1 | ✅ Auto-fixed → `done` |
| LOW | `docs/spike-multi-tenant-g6.md` modified but unrelated to 6.1 | No action — Story 1.6 leftover, committed separately |

### Change Log

- 2026-06-07: Review APPROVED by AI (gabenidolcs); sprint-status synced to `done`
