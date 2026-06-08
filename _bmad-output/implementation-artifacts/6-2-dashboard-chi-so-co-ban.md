# Story 6.2: Dashboard chỉ số cơ bản

Status: ready-for-dev

## Story

As a chủ nhà thuốc,
I want một dashboard chỉ số vận hành trong Baserow,
so that tôi theo dõi mức dùng gói tháng và tải chăm sóc mà không cần hỏi MeCare.

## Acceptance Criteria

1. **AC1 — QuotaCounter view tồn tại:** `baserow/views/07-quota-counter-dashboard.json` tồn tại, parse được JSON hợp lệ, có `type="grid"`, `table="QuotaCounter"`.
2. **AC2 — Fields đúng:** Fields `period_month`, `sent_count`, `cap` đều `hidden=false`; field `pharmacy_id` có `hidden=true`.
3. **AC3 — Sort mới nhất lên đầu:** `sortings[0].field === "period_month"` và `sortings[0].order === "DESC"`.
4. **AC4 — Tenant isolation pattern:** `pharmacy_id` ẩn trong view JSON; mô tả view ghi rõ "Filter by pharmacy_id per tenant qua onboarding runbook" — link_row filter không hardcode vì cần row_id cụ thể per tenant (per pattern AC2 Story 6.1).
5. **AC5 — Escalation count covered:** `baserow/views/06-escalation-cases-list.json` (đã tồn tại) hiện đủ `state`, `created_at`, `case_id` — pharmacist owner thấy số ca leo thang qua row count Baserow; không cần view mới.
6. **AC6 — Customers by group covered:** `baserow/views/02-customers-by-group.json` (Story 6.1, done) hiện phân bổ khách 6 nhóm; không tạo view mới.
7. **AC7 — Contract tests pass:** Tests 16.1–16.8 trong `tests/contract/baserow-views.test.js` cover AC1–AC4; toàn bộ suite pass (kể cả 782 existing tests không có regression).
8. **AC8 — Không build frontend:** Story này không tạo Express route, EJS template, API endpoint, hay bất kỳ custom frontend code nào (architecture.md line 167).

## Tasks / Subtasks

- [x] Task 1: Tạo `baserow/views/07-quota-counter-dashboard.json` (AC: 1, 2, 3, 4)
  - [x] 1.1: Khởi tạo file với `type`, `table`, `name`, `description`
  - [x] 1.2: Thêm `fields` array — `period_month` (hidden:false), `sent_count` (hidden:false), `cap` (hidden:false), `pharmacy_id` (hidden:true)
  - [x] 1.3: Thêm `sortings: [{ "field": "period_month", "order": "DESC" }]`
- [x] Task 2: Thêm contract tests 16.1–16.8 vào `tests/contract/baserow-views.test.js` (AC: 7)
  - [x] 2.1: Thêm test group `describe('16. quota-counter-dashboard view', ...)` sau group 15.x
  - [x] 2.2: Test 16.1 — file tồn tại và parse được JSON
  - [x] 2.3: Test 16.2 — `type === 'grid'`
  - [x] 2.4: Test 16.3 — `table === 'QuotaCounter'`
  - [x] 2.5: Test 16.4 — field `period_month` hidden===false
  - [x] 2.6: Test 16.5 — field `sent_count` hidden===false
  - [x] 2.7: Test 16.6 — field `cap` hidden===false
  - [x] 2.8: Test 16.7 — field `pharmacy_id` hidden===true
  - [x] 2.9: Test 16.8 — sortings[0].field==='period_month' && sortings[0].order==='DESC'
- [x] Task 3: Chạy test suite — xác nhận all pass, no regressions (AC: 7)
  - [x] 3.1: `cd /home/tinxu-luna/mecare/tests && node --test`
  - [x] 3.2: Tổng số tests phải ≥ 790 (782 existing + 8 mới)
- [x] Task 4: Cập nhật sprint-status.yaml (AC: all)
  - [x] 4.1: `6-2-dashboard-chi-so-co-ban: backlog` → `done`
  - [x] 4.2: Cập nhật `last_updated` comment

## Dev Notes

- **Architecture — no frontend:** Toàn bộ Epic 6 deliver qua Baserow UI/views. Không tạo Express route, EJS template, hay API endpoint nào [Source: _bmad-output/planning-artifacts/architecture.md line 167].
- **QuotaCounter schema** (`baserow/schema/07-quota-counter.json`): `pharmacy_id` (link_row→Pharmacies), `period_month` (text, YYYY-MM), `sent_count` (number, decimals:0), `cap` (number, decimals:0).
- **Tenant isolation constraint:** Baserow link_row filter cần `row_id` cụ thể của bản ghi Pharmacies — không thể hardcode trong view JSON. Onboarding runbook áp filter thủ công per tenant sau khi deploy. View JSON chỉ ẩn `pharmacy_id` field để clean UI.
- **Reused existing views (không modify):**
  - `06-escalation-cases-list.json` đã có `state`, `created_at`, sort DESC — đủ cho AC5 (escalation count via Baserow row count)
  - `02-customers-by-group.json` đã sort theo `care_group ASC` — đủ cho AC6 (customers by group)
- **Test file pattern:** `loadView(filename)` helper đã có trong `tests/contract/baserow-views.test.js`. Dùng `loadView('07-quota-counter-dashboard.json')` như các tests 15.x trước.
- **Test runner:** Node.js built-in `--test` (không phải Jest/Mocha). Chạy từ `tests/` directory (`cd tests && node --test`).

### Project Structure Notes

- **New file:** `baserow/views/07-quota-counter-dashboard.json`
- **Modified file:** `tests/contract/baserow-views.test.js` (thêm describe block 16.x)
- **Modified file:** `_bmad-output/implementation-artifacts/sprint-status.yaml` (6-2: backlog → done)
- Không có file nào khác cần thay đổi.
- Đặt test group `16.x` sau group `15.x` cuối cùng để giữ sequential ordering.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.2 line 662] — User story + ACs epics: sent_count vs cap, escalation count, customers by group
- [Source: _bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/prd.md#FR-15] — Dashboard chỉ số cơ bản consequences (testable)
- [Source: _bmad-output/planning-artifacts/architecture.md line 167] — "Không build frontend riêng v1. Dashboard + CRM = Baserow UI/views"
- [Source: baserow/schema/07-quota-counter.json] — QuotaCounter field definitions
- [Source: baserow/views/06-escalation-cases-list.json] — Existing escalation view reused for AC5
- [Source: baserow/views/02-customers-by-group.json] — Existing customers-by-group view reused for AC6 (Story 6.1)
- [Source: _bmad-output/implementation-artifacts/6-1-ho-so-khach-danh-sach-loc-theo-nhom.md] — Tenant isolation pattern (AC2) + test loadView() pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `baserow/views/07-quota-counter-dashboard.json`: grid view, QuotaCounter table, period_month/sent_count/cap visible, pharmacy_id hidden, sorted period_month DESC.
- Added tests 16.1–16.8 to `tests/contract/baserow-views.test.js`. All 8 tests pass.
- Full test suite: 790/790 pass (782 existing + 8 new). Zero regressions.
- No custom frontend code created (architecture.md line 167 constraint respected).

### File List

- `baserow/views/07-quota-counter-dashboard.json` (new)
- `tests/contract/baserow-views.test.js` (modified — added tests 16.1–16.8)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — 6-2: done)
- `_bmad-output/implementation-artifacts/6-2-dashboard-chi-so-co-ban.md` (modified — task checkboxes, completion notes)
