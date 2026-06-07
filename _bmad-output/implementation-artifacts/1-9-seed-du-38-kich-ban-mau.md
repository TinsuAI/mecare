# Story 1.9: Seed đủ 38 kịch bản mẫu vào MessageTemplates

Status: review

## Story

As a kỹ sư vận hành MeCare,
I want seed tất cả 38 scenarios từ content đã duyệt Story 1.4 vào bảng `MessageTemplates` (một row mỗi scenario),
so that Epic 4 và Story 6.3 có đủ nội dung thật để test và chủ nhà thuốc có sẵn template để duyệt từng kịch bản riêng.

## Acceptance Criteria

1. **Given** Baserow live đã có schema từ Story 1.8 và field `scenario_id` đã được thêm, **When** chạy `node scripts/apply-baserow-schema.mjs --seed`, **Then** bảng `MessageTemplates` có đúng 38 rows, tất cả `status=draft`.

2. **Given** 38 rows đã seed, **When** kiểm tra nội dung, **Then** mỗi row có: `scenario_id` unique (ví dụ "1.1", "2.3", "6.5"); `care_group` đúng số nhóm (1–6); `body_template` tiếng Việt từ Story 1.4 approved seed (persona "Dược Sĩ Hải", không có "Ngọc"); `status=draft`; `updated_by="story-1.9"`.

3. **Given** seed đã chạy thành công, **When** chạy lại lần 2, **Then** exit 0, 38 rows skipped, 0 inserted (idempotent theo key `scenario_id`).

4. **Given** scenario 1.10 có 2 text variants (cao huyết áp và tiểu đường) trong kịch bản gốc, **When** seed, **Then** 1.10 được seed là 1 row duy nhất (`scenario_id="1.10"`) với body_template generalized `[cao huyết áp/tiểu đường]` từ Story 1.4 seed — tổng 38 rows không phải 39.

5. **Given** tests trong `tests/contract/kichban-content.test.js`, **When** chạy `npm test` sau Story 1.9, **Then** tất cả tests pass với assertions cập nhật: 38 individual rows thay vì 6 consolidated rows.

## Tasks / Subtasks

- [x] Task 1: Thêm field `scenario_id` vào schema MessageTemplates (AC: #1, #2)
  - [x] 1.1: Sửa `baserow/schema/08-message-templates.json` — thêm `{ "name": "scenario_id", "type": "text" }` vào đầu mảng `fields` (trước `pharmacy_id`)
  - [x] 1.2: Giữ nguyên `"primary": "care_group"` — Baserow primary field không đổi được sau khi tạo bảng; `scenario_id` dùng làm idempotency key trong seed, không cần là Baserow primary
  - [x] 1.3: Chạy `node scripts/apply-baserow-schema.mjs --schema` — xác nhận output thêm field `scenario_id` vào live Baserow

- [x] Task 2: Xóa 6 placeholder rows từ Story 1.8 trong Baserow live (AC: #1)
  - [x] 2.1: Truy cập Baserow UI `https://mecareapp.tinsu.ai` → table `MessageTemplates`
  - [x] 2.2: Select all 6 rows → Delete rows (thực hiện qua Baserow REST API batch-delete, xóa 8 rows gồm 6 placeholder + 2 extra)
  - [x] 2.3: Xác nhận bảng hiện có 0 rows trước khi seed

- [x] Task 3: Cập nhật seed file với 38 individual rows (AC: #1, #2, #3, #4)
  - [x] 3.1: Sửa `baserow/seed/08-message-templates-draft.json`:
    - Đổi `"key": ["care_group"]` → `"key": ["scenario_id"]`
    - Xóa 6 rows cũ (consolidated per-group), thêm 38 rows mới (per-scenario)
  - [x] 3.2: Cấu trúc mỗi row:
    ```json
    {
      "scenario_id": "1.1",
      "care_group": 1,
      "body_template": "[nội dung từ Story 1.4 seed]",
      "status": "draft",
      "version": 1,
      "updated_by": "story-1.9"
    }
    ```
  - [x] 3.3: Cách lấy nội dung — tách body_template hiện tại của mỗi group trong seed theo pattern `### X.X —`:
    ```js
    // Pseudocode để tách — viết tay hoặc dùng script tạm
    const sections = body_template.split(/\n(?=### \d+\.\d+)/);
    // section[0] = "### 1.1 — Chào mừng...\n[content]"
    // → scenario_id = "1.1", care_group = 1
    ```
  - [x] 3.4: Giữ nguyên tất cả nội dung tiếng Việt đã duyệt từ Story 1.4 seed — KHÔNG dùng `kichban-chamsoc-khachhang.md` (còn "Ngọc", chưa approve)

- [x] Task 4: Chạy seed và xác nhận 38 rows (AC: #1, #2)
  - [x] 4.1: Chạy `node scripts/apply-baserow-schema.mjs --seed`
  - [x] 4.2: Xác nhận output: `inserted=38, skipped=0`
  - [x] 4.3: Kiểm tra Baserow UI: đủ 38 rows hiển thị, `scenario_id` column có giá trị "1.1" → "6.5"

- [x] Task 5: Verify idempotency (AC: #3)
  - [x] 5.1: Chạy lại `node scripts/apply-baserow-schema.mjs --seed`
  - [x] 5.2: Xác nhận output: `inserted=0, skipped=38`
  - [x] 5.3: Row count trong Baserow vẫn là 38

- [x] Task 6: Cập nhật tests (AC: #5)
  - [x] 6.1: Sửa `tests/contract/kichban-content.test.js` và `tests/contract/baserow-schema.test.js`:
    - Thay test `"đủ care_group 1..6"` → `"38 rows, mỗi row có scenario_id"`
    - Thêm test: `scenario_id` unique trong toàn bộ 38 rows
    - Thêm test: `care_group` nằm trong range 1–6
    - Cập nhật `baserow-schema.test.js`: `"6 nhóm MessageTemplates"` → `"38 scenarios MessageTemplates"`
    - Giữ nguyên: test persona "Dược Sĩ Hải", "Ngọc" absent, câu an toàn bắt buộc
  - [x] 6.2: Chạy `npm test` — tất cả tests pass

- [x] Task 7: Chạy full test suite (AC: #5)
  - [x] 7.1: Chạy `npm test` — 287 tests pass (≥ 285 baseline Story 1.8)
  - [x] 7.2: Không có regression nào trong tests khác

## Dev Notes

### Scenario ID Mapping — 38 Rows

| Group | scenario_ids | Count |
|-------|-------------|-------|
| 1 (Bệnh mãn tính) | "1.1" → "1.11" | 11 |
| 2 (Thuốc OTC) | "2.1" → "2.5" | 5 |
| 3 (Thuốc theo đơn) | "3.1" → "3.5" | 5 |
| 4 (TPCN + dụng cụ) | "4.1" → "4.6" | 6 |
| 5 (Hỏi thăm / phản ánh) | "5.1" → "5.6" | 6 |
| 6 (Không ghi được triệu chứng) | "6.1" → "6.5" | 5 |
| **Tổng** | | **38** |

**1.10 — 1 row, không tách**: Kịch bản 1.10 có 2 text variants (cao huyết áp / tiểu đường) trong `kichban-chamsoc-khachhang.md`. Story 1.4 seed đã merge thành 1 row với nội dung generalized (`[cao huyết áp/tiểu đường]`). Giữ 1 row duy nhất `scenario_id="1.10"` để tổng = 38. AC4 ghi nhận điều này.

### Content Source — Dùng Story 1.4 Seed, Không Dùng File Gốc

Content lấy từ `baserow/seed/08-message-templates-draft.json` (body_template hiện tại của mỗi trong 6 group rows). File này đã:
- Chuyển persona "Ngọc" → "Dược Sĩ Hải" (Story 1.4)
- Thêm câu an toàn bắt buộc (không uống gấp đôi, Sốt 38.5°C)
- Được format phù hợp với relay model (AI nói, dược sĩ thật hậu trường)

`kichban-chamsoc-khachhang.md` vẫn dùng "Ngọc" — **KHÔNG dùng làm source cho body_template**.

### Migration Note — Xóa 6 Rows Cũ

6 rows hiện có (care_group 1–6, mỗi row chứa tất cả scenarios concatenated) là placeholder từ Story 1.8. Không có cơ chế tự động xóa trong `apply-baserow-schema.mjs` — dev cần xóa thủ công qua Baserow UI hoặc API trước Task 4.

Lý do cần xóa: key mới là `scenario_id`. 6 rows cũ không có `scenario_id` → không conflict với upsert mới → nhưng tổng sẽ là 44 rows (6 cũ + 38 mới) thay vì 38. Xóa thủ công là an toàn vì đây là data `draft`, chưa có production traffic.

### Schema Change — Không Thay Primary

`baserow/schema/08-message-templates.json` hiện có `"primary": "care_group"`. **Không cần đổi `primary`** — Baserow đã tạo bảng với care_group là primary display field. Thêm `scenario_id` là text field bình thường; script `--schema` sẽ add field này vào bảng đã tồn tại.

### Không Cần Thay Đổi Script

`scripts/apply-baserow-schema.mjs` đã hỗ trợ đầy đủ:
- `--schema`: add field mới vào table đã tồn tại (idempotent)
- `--seed`: upsert theo `key` field trong seed JSON
- `kichban-ops.mjs#upsertSeed`: insert-only by default, skip row có key trùng

Không viết thêm code script — chỉ sửa JSON files và tests.

### Project Structure Notes

- Schema: `baserow/schema/08-message-templates.json` (modify: add scenario_id field)
- Seed: `baserow/seed/08-message-templates-draft.json` (modify in-place: 6 rows → 38 rows, key change)
- Test: `tests/contract/kichban-content.test.js` (modify: update assertions, add scenario_id checks)
- Script: `scripts/apply-baserow-schema.mjs` (no change)
- Lib: `openclaw/lib/kichban-ops.mjs` (no change)

Không tạo file mới. Seed file giữ tên `08-message-templates-draft.json` — naming convention giữ nguyên từ Story 1.2.

### References

- Content source (body_template): [Source: baserow/seed/08-message-templates-draft.json]
- Schema to modify: [Source: baserow/schema/08-message-templates.json]
- Upsert logic: [Source: openclaw/lib/kichban-ops.mjs#upsertSeed]
- Script flags & auth: [Source: scripts/apply-baserow-schema.mjs — lines 1–40 (comments)]
- Tests to update: [Source: tests/contract/kichban-content.test.js]
- Epic story definition: [Source: _bmad-output/planning-artifacts/epics.md#Story-1.9 (line 303)]
- Sprint status: [Source: _bmad-output/implementation-artifacts/sprint-status.yaml]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `baserow/schema/08-message-templates.json` — added `scenario_id` text field
- `baserow/seed/08-message-templates-draft.json` — 6 rows → 38 per-scenario rows; key changed to `scenario_id`
- `tests/contract/kichban-content.test.js` — updated assertions: 38 rows, scenario_id unique, care_group range
- `tests/contract/baserow-schema.test.js` — updated: "6 nhóm" → "38 scenarios" assertion
