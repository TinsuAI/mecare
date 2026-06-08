# Story 6.3: Quản lý & tự duyệt kịch bản (chủ hiệu thuốc)

Status: done

## Story

As a chủ nhà thuốc,
I want sửa template chăm sóc + FAQ trực tiếp trên Baserow và tự bấm duyệt,
so that kịch bản khớp nhu cầu nhà thuốc mà không cần MeCare can thiệp.

## Acceptance Criteria

1. **AC1 — MessageTemplates edit view tồn tại:** `baserow/views/08-message-templates-edit.json` tồn tại, parse được JSON hợp lệ, có `type="grid"`, `table="MessageTemplates"`.
2. **AC2 — MessageTemplates fields đúng:** `care_group`, `body_template`, `status` đều `hidden=false`; system fields `pharmacy_id`, `scenario_id`, `version`, `updated_by`, `approved_at`, `approved_by` đều `hidden=true`.
3. **AC3 — FaqEntries edit view tồn tại:** `baserow/views/09-faq-entries-edit.json` tồn tại, parse được JSON hợp lệ, có `type="grid"`, `table="FaqEntries"`.
4. **AC4 — FaqEntries fields đúng:** `scope`, `question`, `answer`, `mandatory_suffix`, `status` đều `hidden=false`; system fields `pharmacy_id`, `version`, `updated_by`, `approved_at`, `approved_by` đều `hidden=true`.
5. **AC5 — Tenant isolation documented:** `pharmacy_id` ẩn trong cả 2 view JSON; description của mỗi view ghi rõ "Filter by pharmacy_id per tenant qua onboarding runbook" — link_row filter không hardcode vì cần row_id cụ thể per tenant (đồng nhất với pattern Story 6.1 + 6.2).
6. **AC6 — R2 warning + draft→approved workflow documented:** description của `08-message-templates-edit.json` ghi rõ cảnh báo R2 (chủ chịu trách nhiệm nội dung y tế) và workflow draft→approved (sửa → auto draft; bấm approve → status=approved, cần set version/updated_by/approved_at qua Baserow automation hoặc onboarding runbook).
7. **AC7 — Contract tests pass:** Tests 17.1–17.19 trong `tests/contract/baserow-views.test.js` cover AC1–AC5; toàn bộ suite pass (kể cả 792 existing tests không có regression).
8. **AC8 — Không build frontend:** Không tạo Express route, EJS template, API endpoint, hay bất kỳ custom frontend code nào (architecture.md line 167).

## Tasks / Subtasks

- [x] Task 1: Tạo `baserow/views/08-message-templates-edit.json` (AC: 1, 2, 5, 6)
  - [x] 1.1: Khởi tạo file với `type="grid"`, `table="MessageTemplates"`, `name="message-templates-edit"`
  - [x] 1.2: Thêm `description` — bao gồm R2 warning + draft→approved workflow instructions + tenant isolation note
  - [x] 1.3: `fields` array — `care_group` (hidden:false), `body_template` (hidden:false), `status` (hidden:false)
  - [x] 1.4: System fields `pharmacy_id`, `scenario_id`, `version`, `updated_by`, `approved_at`, `approved_by` đều `hidden=true`
  - [x] 1.5: Thêm `sortings: [{ "field": "care_group", "order": "ASC" }]` — nhóm 1→6 theo thứ tự

- [x] Task 2: Tạo `baserow/views/09-faq-entries-edit.json` (AC: 3, 4, 5)
  - [x] 2.1: Khởi tạo file với `type="grid"`, `table="FaqEntries"`, `name="faq-entries-edit"`
  - [x] 2.2: Thêm `description` — tenant isolation note (pharmacy_id filter qua runbook)
  - [x] 2.3: `fields` array — `scope` (hidden:false), `question` (hidden:false), `answer` (hidden:false), `mandatory_suffix` (hidden:false), `status` (hidden:false)
  - [x] 2.4: System fields `pharmacy_id`, `version`, `updated_by`, `approved_at`, `approved_by` đều `hidden=true`
  - [x] 2.5: Thêm `sortings: [{ "field": "scope", "order": "ASC" }]` — sort theo scope alphabetical

- [x] Task 3: Thêm contract tests 17.1–17.19 vào `tests/contract/baserow-views.test.js` (AC: 7)
  - [x] 3.1: Load `messageTemplatesEdit = loadView('08-message-templates-edit.json')` và `faqEntriesEdit = loadView('09-faq-entries-edit.json')` ở top của file (sau các loadView hiện có)
  - [x] 3.2: Tests 17.1–17.10 cho `08-message-templates-edit.json` (chi tiết bên dưới)
  - [x] 3.3: Tests 17.11–17.19 cho `09-faq-entries-edit.json` (chi tiết bên dưới)

- [x] Task 4: Chạy test suite — xác nhận all pass, no regressions (AC: 7)
  - [x] 4.1: `cd /home/tinxu-luna/mecare/tests && node --test`
  - [x] 4.2: Tổng số tests phải ≥ 811 (792 existing + 19 mới)

- [x] Task 5: Cập nhật sprint-status.yaml (AC: all)
  - [x] 5.1: `6-3-quan-ly-tu-duyet-kich-ban-chu-hieu-thuoc: backlog` → `done`
  - [x] 5.2: Cập nhật `last_updated` comment

## Dev Notes

### Architecture — no frontend

Toàn bộ Epic 6 deliver qua Baserow views. **Không tạo Express route, EJS template, hay API endpoint nào.** [Source: `_bmad-output/planning-artifacts/architecture.md` line 167: "Không build frontend riêng v1. Dashboard + CRM = Baserow UI/views"]

### MessageTemplates schema (`baserow/schema/08-message-templates.json`)

| Field | Type | Visible in edit view? |
|-------|------|-----------------------|
| `scenario_id` | text | ❌ hidden (system key) |
| `pharmacy_id` | link_row → Pharmacies | ❌ hidden (tenant isolation) |
| `care_group` | number 1..6 | ✅ visible |
| `body_template` | long_text | ✅ visible |
| `status` | single_select (draft/approved) | ✅ visible |
| `version` | number | ❌ hidden (system) |
| `updated_by` | text | ❌ hidden (system) |
| `approved_at` | date+time | ❌ hidden (system) |
| `approved_by` | text | ❌ hidden (system) |

### FaqEntries schema (`baserow/schema/09-faq-entries.json`)

| Field | Type | Visible in edit view? |
|-------|------|-----------------------|
| `pharmacy_id` | link_row → Pharmacies | ❌ hidden (tenant isolation) |
| `scope` | text | ✅ visible |
| `question` | long_text | ✅ visible |
| `answer` | long_text | ✅ visible |
| `mandatory_suffix` | long_text | ✅ visible |
| `status` | single_select (draft/approved) | ✅ visible |
| `version` | number | ❌ hidden (system) |
| `updated_by` | text | ❌ hidden (system) |
| `approved_at` | date+time | ❌ hidden (system) |
| `approved_by` | text | ❌ hidden (system) |

### Tenant isolation constraint

Baserow link_row filter cần `row_id` cụ thể của bản ghi Pharmacies — không thể hardcode trong view JSON. Onboarding runbook áp filter thủ công per tenant sau khi deploy. View JSON chỉ ẩn `pharmacy_id` field để clean UI. **Pattern này đã được thiết lập ở Story 6.1 (AC2) và Story 6.2 (AC4)** — giữ nhất quán.

### R2 warning và draft→approved workflow (không phải code)

Cảnh báo R2 (NFR-2) và auto-draft khi edit **không thể enforce qua view JSON đơn thuần**. Approach:
- **Description field trong view JSON** = nơi document R2 warning và workflow instructions (readable bởi Baserow admin khi setup per-tenant)
- **Thực thi runtime:** Baserow built-in automation (if configured) hoặc onboarding runbook hướng dẫn chủ thuốc về quy trình; `status` field là single_select → chủ tự set draft/approved qua dropdown
- **Version increment** và **approved_at auto-fill** → operational step; dev ghi chú trong view description; Story 7.1 (runbook) sẽ formalize

**KHÔNG tạo n8n workflow hay webhook trong story này** — out of scope cho Epic 6 (Baserow-only views).

### Contract test specification — tests 17.1–17.19

Thêm vào sau group 16.x, trước closing of file. Pattern theo tests 15.x và 16.x.

**Load statements (top of file, sau 16.x loads):**
```js
const messageTemplatesEdit = loadView("08-message-templates-edit.json");
const faqEntriesEdit = loadView("09-faq-entries-edit.json");
```

**Group 17 — message-templates-edit view:**
```
17.1:  file exists + valid JSON (via loadView — throws if not found/invalid)
17.2:  type === 'grid'
17.3:  table === 'MessageTemplates'
17.4:  care_group visible (hidden===false)
17.5:  body_template visible (hidden===false)
17.6:  status visible (hidden===false)
17.7:  pharmacy_id hidden (hidden===true)
17.8:  version hidden (hidden===true)
17.9:  updated_by hidden (hidden===true)
17.10: approved_at hidden (hidden===true)
```

**Group 17 — faq-entries-edit view:**
```
17.11: file exists + valid JSON
17.12: type === 'grid'
17.13: table === 'FaqEntries'
17.14: scope visible (hidden===false)
17.15: question visible (hidden===false)
17.16: answer visible (hidden===false)
17.17: status visible (hidden===false)
17.18: pharmacy_id hidden (hidden===true)
17.19: version hidden (hidden===true)
```

### Existing views (KHÔNG sửa)

- `02-customers-by-group.json` — Story 6.1, read-only customer list
- `07-quota-counter-dashboard.json` — Story 6.2, quota dashboard
- `06-escalation-cases-list.json` — Story 5.4, escalation cases
- Toàn bộ views hiện có: không thay đổi

### Previous story patterns (Story 6.2)

- View JSON structure: `{ "type", "table", "name", "description", "fields": [...], "sortings": [...] }`
- Field entry: `{ "name": "field_name", "hidden": true/false }`
- Sorting entry: `{ "field": "field_name", "order": "ASC"|"DESC" }`
- Test runner: Node.js built-in `--test`, chạy từ `tests/` directory
- loadView() helper đã có, dùng ngay — không tạo lại

### "Chỉ thấy 2 bảng" yêu cầu (workspace visibility)

Epics AC cuối: chủ nhà thuốc workspace chỉ thấy `MessageTemplates` + `FaqEntries`. **Đây là Baserow workspace permission** — cấu hình qua Baserow Admin UI, không qua JSON file. Scope của story này chỉ là view JSON + contract tests. Workspace visibility step được document trong onboarding runbook (Story 7.1). Ghi chú trong dev completion notes.

### Nguồn sự thật — chỉ status=approved được dùng

- Epic 4 (Story 4.1 — `MC-Compose-MessageFromTemplate`): query `status=approved` từ MessageTemplates
- Epic 5 (Story 5.1 — RAG FAQ): query `status=approved` từ FaqEntries
- Story 6.3 không cần enforce constraint này trong view — đây là business logic của n8n workflow/OpenClaw, đã implement ở Epic 4+5.

### Project Structure Notes

**New files:**
- `baserow/views/08-message-templates-edit.json`
- `baserow/views/09-faq-entries-edit.json`

**Modified files:**
- `tests/contract/baserow-views.test.js` — thêm loadView calls + describe blocks 17.x
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 6-3: backlog → done
- `_bmad-output/implementation-artifacts/6-3-quan-ly-tu-duyet-kich-ban-chu-hieu-thuoc.md` — task checkboxes + completion notes

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` line 678] — Story 6.3 user story + ACs đầy đủ
- [Source: `_bmad-output/planning-artifacts/architecture.md` line 143] — MessageTemplates schema description
- [Source: `_bmad-output/planning-artifacts/architecture.md` line 146] — "Kịch bản = Baserow authoritative. Chủ hiệu thuốc tự sửa + tự duyệt (draft→approved)"
- [Source: `_bmad-output/planning-artifacts/architecture.md` line 167] — No frontend constraint
- [Source: `_bmad-output/planning-artifacts/architecture.md` line 186] — R2 guardrail hybrid explanation
- [Source: `baserow/schema/08-message-templates.json`] — MessageTemplates field definitions
- [Source: `baserow/schema/09-faq-entries.json`] — FaqEntries field definitions
- [Source: `_bmad-output/implementation-artifacts/6-2-dashboard-chi-so-co-ban.md`] — Pattern: view JSON structure, test loadView(), tenant isolation in description, test group numbering
- [Source: `_bmad-output/implementation-artifacts/6-1-ho-so-khach-danh-sach-loc-theo-nhom.md`] — Tenant isolation pattern (pharmacy_id hidden + runbook note)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List
- 811/811 tests pass (792 existing + 19 new tests 17.1–17.19)
- Workspace visibility ("chỉ thấy 2 bảng") is Baserow Admin UI permission — deferred to Story 7.1 runbook
- R2 warning + draft→approved workflow documented in view description; enforcement via Baserow automation or runbook

### File List
- baserow/views/08-message-templates-edit.json (new)
- baserow/views/09-faq-entries-edit.json (new)
- tests/contract/baserow-views.test.js (modified: loadView calls + tests 17.1–17.19)
- _bmad-output/implementation-artifacts/sprint-status.yaml (6-3: ready-for-dev → done)
- _bmad-output/implementation-artifacts/6-3-quan-ly-tu-duyet-kich-ban-chu-hieu-thuoc.md (task checkboxes + completion notes)
