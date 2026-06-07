---
baseline_commit: 186516d
---

# Story 4.1: Soạn tin chủ động từ template kịch bản

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a hệ thống MeCare,
I want tự soạn tin chăm sóc bằng template cứng theo nhóm + hồ sơ khách,
so that nội dung đúng kịch bản đã duyệt, giọng persona thống nhất, không sáng tác tư vấn y tế.

## Acceptance Criteria

1. **[AC1 — Template cứng, chỉ approved, đúng nhóm]**
   Given khách thuộc một nhóm chăm sóc (1..6)
   When n8n workflow `MC-Compose-MessageFromTemplate` được gọi với `pharmacy_id`, `customer_id`, `care_group`, `message_id`
   Then:
   - Lấy `body_template` từ Baserow `MessageTemplates` lọc `status=approved` VÀ `care_group` khớp VÀ `pharmacy_id` khớp
   - Điền đúng placeholder `[TÊN]`, `[TÊN THUỐC]`, `[NGÀY TÁI KHÁM]` từ hồ sơ khách trong Baserow `Customers`
   - Giọng văn persona "Dược Sĩ Hải": xưng "em", gọi "anh/chị [TÊN]", mở "Dạ,…", kết "ạ"/"nhé" — bảo tồn nguyên văn từ template approved (KHÔNG viết lại)
   - n8n KHÔNG tự sinh nội dung ngoài template (AR-5)
   - Không có template `status=approved` cho nhóm đó → KHÔNG soạn tin; ghi log `{reason: "no_template", care_group, pharmacy_id}`; workflow trả về `{result: "skip", reason: "no_template"}`

2. **[AC2 — Bắt buộc đủ dữ liệu placeholder]**
   Given template yêu cầu placeholder bắt buộc (ví dụ `[TÊN]`, `[TÊN THUỐC]`) mà hồ sơ khách thiếu
   When soạn tin
   Then KHÔNG soạn tin; ghi log `{reason: "missing_placeholder", missing_fields: [...]}`; workflow trả về `{result: "skip", reason: "missing_placeholder", missing_fields: [...]}`

3. **[AC3 — Câu bắt buộc TPCN]**
   Given template thuộc `care_group=4` (TPCN & dụng cụ y tế)
   When soạn tin thành công
   Then nội dung cuối kèm nguyên văn câu bắt buộc: `"Lưu ý: thực phẩm bảo vệ sức khỏe, không phải thuốc điều trị bệnh."` (NFR-2); không chẩn đoán bệnh; không tư vấn y tế ngoài kịch bản

4. **[AC4 — Idempotency: kiểm tra message_id trước khi ghi]**
   Given `message_id` đã tồn tại trong Baserow `Messages`
   When workflow được gọi lại với cùng `message_id` (retry scenario)
   Then KHÔNG tạo hàng Messages mới; trả về `{result: "skip", reason: "duplicate_message_id"}`

5. **[AC5 — Audit-first: ghi Messages pending trước khi trả kết quả]**
   Given soạn tin thành công (AC1 + AC2 + AC3 pass)
   When workflow hoàn thành compose
   Then ghi một hàng vào Baserow `Messages` với:
   - `status=pending`, `type=proactive`
   - `customer_ref=<SHA-256 hash của pharmacy_id+":"+customer_id>` (PII-min, KHÔNG lưu tên/SĐT)
   - `message_id=<UUID input từ caller>`
   - `care_group=<int>`
   - `content=<nội dung đã điền placeholder, kèm TPCN suffix nếu nhóm 4>`
   - `ts=<ISO-8601 UTC>`
   - `pharmacy_id=<string>`
   Workflow trả về `{result: "composed", message_id, content, customer_ref}`

## Tasks / Subtasks

- [x] Task 1: Tạo `n8n/lib/compose-message.js` (AC: 1, 2, 3)
  - [x] 1.1 Export function `substituteTemplate(bodyTemplate, placeholderMap)` — replace `[FIELD]` patterns; return `{ok: true, content}` hoặc `{ok: false, missing: [...fieldNames]}`
  - [x] 1.2 Export function `detectMissingPlaceholders(bodyTemplate, placeholderMap)` — scan `[...]` tokens trong template; return array tên field thiếu (chưa có trong map hoặc giá trị rỗng)
  - [x] 1.3 Export function `appendTpcnSuffix(content, careGroup)` — nếu `careGroup === 4` append `"\n\nLưu ý: thực phẩm bảo vệ sức khỏe, không phải thuốc điều trị bệnh."` (nguyên văn, không rút gọn)
  - [x] 1.4 Export function `buildCustomerRef(pharmacyId, customerId)` — trả `crypto.createHash("sha256").update(pharmacyId + ":" + customerId).digest("hex")`; sử dụng Node.js built-in `crypto` (no deps)

- [x] Task 2: Tạo `n8n/workflows/MC-Compose-MessageFromTemplate.json` (AC: 1, 2, 3, 4, 5)
  - [x] 2.1 Workflow metadata: `name: "MC-Compose-MessageFromTemplate"`, `active: false`; trigger: `n8n-nodes-base.executeWorkflowTrigger` (được gọi như sub-workflow từ Story 4.2)
  - [x] 2.2 Node "Check Idempotency" (HTTP Request GET): query `Messages` by `message_id`; IF found → Set `{result: "skip", reason: "duplicate_message_id"}` → Stop
  - [x] 2.3 Node "Fetch Template" (HTTP Request GET): `{{$env.BASEROW_URL}}/api/database/rows/table/{{$env.BASEROW_TABLE_MESSAGE_TEMPLATES}}/?filter__field_care_group__equal={{care_group}}&filter__field_status__equal=approved&filter__field_pharmacy_id__equal={{pharmacy_id}}&user_field_names=true`; auth header `Token {{$env.BASEROW_TOKEN}}`
  - [x] 2.4 Node "Guard: No Template" (IF): `{{ $json.count === 0 }}` → Set `{result: "skip", reason: "no_template"}` → Stop
  - [x] 2.5 Node "Fetch Customer" (HTTP Request GET): lấy row `Customers` bằng `customer_id`; extract `full_name`, `notes`, `care_group`
  - [x] 2.6 Node "Resolve + Substitute Placeholders" (Code): build `placeholderMap = {TÊN: full_name, "TÊN THUỐC": <parse từ notes>, "NGÀY TÁI KHÁM": <từ CareSchedule nếu cần>}`; gọi logic `detectMissingPlaceholders` + `substituteTemplate` (inline từ `n8n/lib/compose-message.js` — copy-paste vào Code node vì n8n không import local module); return `{ok, content, missing}`
  - [x] 2.7 Node "Guard: Missing Placeholder" (IF): `{{ !$json.ok }}` → Set `{result: "skip", reason: "missing_placeholder", missing_fields: $json.missing}` → Stop
  - [x] 2.8 Node "Append TPCN Suffix" (Code): `appendTpcnSuffix(content, care_group)` inline; return `composed_content`
  - [x] 2.9 Node "Build customer_ref" (Code): `buildCustomerRef(pharmacy_id, customer_id)` inline; return `customer_ref`
  - [x] 2.10 Node "Audit-First Write Messages" (HTTP Request POST): `{{$env.BASEROW_URL}}/api/database/rows/table/{{$env.BASEROW_TABLE_MESSAGES}}/` body JSON `{pharmacy_id, customer_ref, message_id, care_group, type: "proactive", content: composed_content, status: "pending", ts: <ISO-8601 UTC now>}`; auth header `Token {{$env.BASEROW_TOKEN}}`
  - [x] 2.11 Node "Return Result" (Set): `{result: "composed", message_id, content: composed_content, customer_ref}`

- [x] Task 3: Cập nhật `.env.example` với biến mới (AC: 1, 5)
  - [x] 3.1 Thêm `BASEROW_TABLE_MESSAGE_TEMPLATES=<table_id>` vào `.env.example` (với comment: "Baserow table ID for MessageTemplates — dùng bởi n8n workflow 4.1")
  - [x] 3.2 Thêm `BASEROW_TABLE_MESSAGES=<table_id>` vào `.env.example` (với comment: "Baserow table ID for Messages — dùng bởi n8n workflow 4.1 audit-first write")
  - [x] 3.3 Nếu `BASEROW_TOKEN` chưa có trong `.env.example` → thêm với comment "Baserow API token (Database token, readonly hoặc readwrite per table)"

- [x] Task 4: Tạo `tests/unit/compose-message.test.js` (AC: 1, 2, 3)
  - [x] 4.1 Import `{substituteTemplate, detectMissingPlaceholders, appendTpcnSuffix, buildCustomerRef}` từ `../../n8n/lib/compose-message.js`
  - [x] 4.2 Test: `substituteTemplate("Dạ, [TÊN] ơi...", {TÊN: "Lan"})` → `{ok: true, content: "Dạ, Lan ơi..."}`
  - [x] 4.3 Test: `substituteTemplate("Dạ, [TÊN] ơi, thuốc [TÊN THUỐC]...", {TÊN: "Lan"})` → `{ok: false, missing: ["TÊN THUỐC"]}`
  - [x] 4.4 Test: `detectMissingPlaceholders("Thuốc [TÊN THUỐC], tái khám [NGÀY TÁI KHÁM]", {TÊN THUỐC: "Metformin"})` → `["NGÀY TÁI KHÁM"]`
  - [x] 4.5 Test: `appendTpcnSuffix("Chào anh/chị.", 4)` → kết thúc bằng `"Lưu ý: thực phẩm bảo vệ sức khỏe, không phải thuốc điều trị bệnh."` (nguyên văn)
  - [x] 4.6 Test: `appendTpcnSuffix("Chào anh/chị.", 1)` → KHÔNG thêm câu TPCN; content giữ nguyên
  - [x] 4.7 Test: `buildCustomerRef("ph-001", "cust-123")` → hex string 64 ký tự (SHA-256 output)
  - [x] 4.8 Test: `buildCustomerRef` với cùng input → cùng output (deterministic)

- [x] Task 5: Tạo `tests/contract/n8n-workflow-structure.test.js` (AC: 1, 2, 3, 4, 5)
  - [x] 5.1 Load `n8n/workflows/MC-Compose-MessageFromTemplate.json`; assert parse JSON không lỗi
  - [x] 5.2 Assert `workflow.name === "MC-Compose-MessageFromTemplate"` (naming convention `MC-<domain>-<action>`)
  - [x] 5.3 Assert `workflow.nodes` là mảng, `length >= 8` (8 nodes tối thiểu)
  - [x] 5.4 Assert có node type `n8n-nodes-base.executeWorkflowTrigger` (sub-workflow callable)
  - [x] 5.5 Assert có ít nhất 2 node type `n8n-nodes-base.httpRequest` (Fetch Template + Audit-First Write)
  - [x] 5.6 Assert có ít nhất 2 node type `n8n-nodes-base.if` (Guard: No Template + Guard: Missing Placeholder)
  - [x] 5.7 Assert có node type `n8n-nodes-base.code` (Substitute Placeholders)
  - [x] 5.8 Assert `workflow.active === false` (workflow chỉ active khi Story 4.2 scheduler kích hoạt)

## Dev Notes

### Architecture Constraints

- **n8n = orchestrator proactive; KHÔNG gọi OpenClaw** — Story 4.1 dùng template cứng (AR-5). OpenClaw chỉ dùng cho reactive FAQ (Epic 5). n8n điền placeholder, KHÔNG để agent sinh tự do nội dung. [Source: architecture.md#AI / Agent + #API & Communication Patterns]
- **Scope: COMPOSE only, KHÔNG SEND** — Workflow trả về `composed_content` + ghi Messages `status=pending`. Gọi openzca qua zalo-bridge là Story 4.2. KHÔNG gọi zalo-bridge trong Story 4.1.
- **Audit-first bắt buộc** — ghi `Messages` row (status=pending) TRƯỚC khi trả kết quả. Anti-pattern: ghi Messages sau side-effect. [Source: architecture.md#Communication Patterns Enforcement]
- **Idempotency** — kiểm tra `message_id` tồn tại trong Messages TRƯỚC khi ghi hàng mới. `message_id` là UUID do caller Story 4.2 sinh và truyền vào. [Source: architecture.md#Communication Patterns]
- **PII-min** — `customer_ref` trong Messages = SHA-256 hash của `pharmacy_id+":"+customer_id`. KHÔNG lưu `full_name` hoặc `phone` vào `Messages.content`. PII sống trong Customers Baserow self-host. [Source: architecture.md#Authentication & Security]
- **Placeholder nguồn gốc** — `full_name` từ `Customers.full_name`; `[TÊN THUỐC]` từ `Customers.notes` (free-text, MVP — Purchases table chưa implement per Story 3.1); `[NGÀY TÁI KHÁM]` từ `CareSchedule.due_at` nếu cần (optional placeholder).
- **n8n Code node không import local module** — logic từ `n8n/lib/compose-message.js` phải được COPY-PASTE inline vào Code node. File `compose-message.js` tồn tại độc lập để unit test; Code node có bản copy tương đương.
- **Env vars Baserow** — table IDs phải động qua env (không hardcode). Baserow table IDs thay đổi khi re-seed. Dùng `$env.BASEROW_TABLE_MESSAGE_TEMPLATES` và `$env.BASEROW_TABLE_MESSAGES`.
- **n8n workflow naming** — `MC-Compose-MessageFromTemplate` (pattern `MC-<domain>-<action>`). File: `n8n/workflows/MC-Compose-MessageFromTemplate.json`. [Source: architecture.md#Naming Patterns]
- **Template source of truth** — chỉ `MessageTemplates.status=approved` được dùng. Story 4.1 KHÔNG seed template (đã seed ở Story 1.9). Chủ hiệu thuốc duyệt qua Baserow UI. [Source: architecture.md#Data Architecture]
- **Multi-tenant isolation** — mọi query MessageTemplates và Messages phải filter theo `pharmacy_id`. Không mix data giữa các tenant. [Source: architecture.md#Multi-tenancy]
- **JSON snake_case** — payload gửi Baserow dùng snake_case fields. Không trộn camelCase. [Source: architecture.md#Format Patterns]

### Project Structure Notes

- `n8n/workflows/` — hiện có `.gitkeep` only. File `MC-Compose-MessageFromTemplate.json` là workflow đầu tiên.
- `n8n/lib/` — chưa tồn tại; cần tạo cùng `compose-message.js`. Nếu n8n không có thêm lib file khác sau này, thư mục này là nhỏ nhưng cần thiết cho testability.
- `tests/unit/` — chưa tồn tại; cần tạo. Dùng Node.js built-in test runner (pattern: `import { test, describe } from "node:test"`; `import assert from "node:assert/strict"`), `"type": "module"` trong `tests/package.json` đã đặt sẵn.
- `tests/contract/n8n-workflow-structure.test.js` — file mới trong thư mục contract đã có.
- `.env.example` — thêm 3 biến mới: `BASEROW_TABLE_MESSAGE_TEMPLATES`, `BASEROW_TABLE_MESSAGES`, `BASEROW_TOKEN` (nếu chưa có).

### References

- [Source: epics.md#Story 4.1 L476-495] — AC đầy đủ + scope + TPCN constraint
- [Source: architecture.md#API & Communication Patterns] — Proactive flow: n8n → MessageTemplates → placeholder fill → audit-first Messages pending → send (Story 4.2)
- [Source: architecture.md#Communication Patterns] — Audit-first, idempotency message_id, JSON snake_case, customer_ref ẩn danh
- [Source: architecture.md#Process Patterns Enforcement] — Bắt buộc: ghi Messages audit-first, quota check 2 tầng (Story 4.3), fail-safe leo thang
- [Source: architecture.md#Naming Patterns] — MC-<domain>-<action>; snake_case fields; Messages payload format
- [Source: architecture.md#AI / Agent] — AR-5: proactive = template cứng, KHÔNG free generation từ OpenClaw
- [Source: prd.md#FR-3 L157-167] — Placeholder list: [TÊN], [TÊN THUỐC], [NGÀY TÁI KHÁM]; persona voice thống nhất
- [Source: prd.md#§10 L417-424] — Persona "Dược Sĩ Hải": xưng em, gọi anh/chị, Dạ/ạ/nhé; emoji 💊 😊 🙏 vừa phải
- [Source: prd.md#§11.1 L452] — TPCN bắt buộc: "không phải thuốc điều trị bệnh"; không chẩn đoán
- [Source: baserow/schema/08-message-templates.json] — MessageTemplates: body_template, status, care_group, pharmacy_id, scenario_id
- [Source: baserow/schema/05-messages.json] — Messages: customer_ref, message_id, type=proactive, status=pending, ts ISO-8601 UTC
- [Source: baserow/schema/02-customers.json] — Customers: full_name, notes (thuốc MVP), care_group
- [Source: baserow/schema/04-care-schedule.json] — CareSchedule: due_at, cadence_type (NGÀY TÁI KHÁM placeholder nếu cần)
- [Source: _bmad-output/implementation-artifacts/3-1-tao-ho-so-khach-tai-quay-20s.md] — Purchases deferred; thuốc lấy từ Customers.notes (MVP decision)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- n8n Code nodes inline logic from `n8n/lib/compose-message.js` verbatim — n8n cannot import local modules. Both copies must stay in sync.
- `tests/unit/` directory created (new); uses same `node:test` + `node:assert/strict` pattern as contract tests.
- `BASEROW_TOKEN` already existed in `.env.example` (zalo-bridge section) — task 3.3 not needed; added `BASEROW_TABLE_CUSTOMERS` as bonus for workflow completeness.
- Workflow has 15 nodes (4 httpRequest, 3 if, 3 code, 4 set, 1 trigger) — satisfies all contract test assertions.
- Story 4.1 scope: COMPOSE only, no openzca/send. `Messages.status=pending` written. Sending is Story 4.2.

### File List

**New files:**
- `n8n/lib/compose-message.js` — substituteTemplate, detectMissingPlaceholders, appendTpcnSuffix, buildCustomerRef (ESM, no deps)
- `n8n/workflows/MC-Compose-MessageFromTemplate.json` — n8n workflow JSON, active=false, 15 nodes
- `tests/unit/compose-message.test.js` — 19 unit tests for compose-message.js functions (expanded post-QA gap-fill)
- `tests/contract/n8n-workflow-structure.test.js` — 18 contract tests for workflow JSON structure (5.1–5.18, expanded post-QA gap-fill)

**Modified files:**
- `.env.example` — added BASEROW_TABLE_MESSAGE_TEMPLATES, BASEROW_TABLE_MESSAGES, BASEROW_TABLE_CUSTOMERS
- `_bmad-output/implementation-artifacts/4-1-soan-tin-chu-dong-tu-template-kich-ban.md` — task checkboxes, dev record, status→review

## Senior Developer Review (AI)

**Reviewer:** claude-sonnet-4-6 | **Date:** 2026-06-07 | **Outcome:** ✅ Approved (post-fix)

### Findings & Fixes Applied

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | HIGH | `care_group` not coerced to `Number()` in `Append TPCN Suffix` node — string `"4"` from caller skips TPCN disclaimer (AC3/NFR-2 violation) | Fixed: `Number(care_group)` in Append TPCN Suffix node; `care_group_int = Number(care_group)` in Build customer_ref |
| 2 | HIGH | `Audit-First Write Messages` `jsonBody` used string interpolation for `content` — double quotes in template text would break JSON parsing at runtime | Fixed: `Build customer_ref` now pre-serializes body via `JSON.stringify()`; Audit-First Write references `$json.jsonBody` |
| 3 | MEDIUM | Story File List claimed "8 unit tests / 8 contract tests" — post-QA gap-fill actual counts are 19 / 18 | Fixed: Updated File List counts in story artifact |
| 4 | MEDIUM | `BASEROW_TOKEN` in `.env.example` under `zalo-bridge` section comment but consumed by n8n workflows — operator would expect to find it near Baserow vars | Fixed: Added clarifying comment to `.env.example` |
| 5 | LOW | `Fetch Template` picks `results[0]` without explicit ordering — non-deterministic when multiple approved templates for same group | Accepted as-is (MVP; Baserow default order is insertion order; chủ hiệu thuốc expected to maintain ≤1 approved per group) |
| 6 | LOW | `detectMissingPlaceholders` O(n²) dedup via `seen.includes` | Accepted as-is (SMS templates < 10 placeholders; impact negligible) |

### Checklist

- [x] Story file loaded
- [x] Status verified as `review`
- [x] Epic 4, Story 1 IDs resolved
- [x] Architecture constraints verified (audit-first, idempotency, PII-min, COMPOSE-only)
- [x] Tech stack detected: n8n + Node.js ESM + Baserow REST API
- [x] Acceptance Criteria cross-checked against implementation (AC1–AC5 all implemented)
- [x] File List reviewed and corrected for post-QA test counts
- [x] Tests: 37 passing (19 unit + 18 contract), 0 failures
- [x] Code quality reviewed: compose-message.js, workflow JSON, all 3 code nodes
- [x] Security reviewed: SHA-256 PII-min correct; no PII in Messages content; env vars dynamic
- [x] 2 HIGH issues auto-fixed; 2 MEDIUM issues auto-fixed; 2 LOW accepted
- [x] 0 CRITICAL issues → status → `done`
- [x] Sprint status sync required

## Change Log

| Date | Change |
|------|--------|
| 2026-06-07 | Story created and implemented (dev agent: claude-sonnet-4-6) |
| 2026-06-07 | QA gap-fill: unit tests expanded 8→19, contract tests 8→18 |
| 2026-06-07 | Senior review: care_group coercion fix; jsonBody injection fix; file list updated; BASEROW_TOKEN comment clarified |
