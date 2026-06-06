---
baseline_commit: 5e69297
---

# Story 1.2: Khởi tạo Baserow schema nguồn sự thật

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a kỹ sư MeCare,
I want các bảng lõi trong Baserow theo chuẩn naming và phân vùng tenant,
so that mọi tính năng sau ghi/đọc trên một schema nhất quán, cách ly theo nhà thuốc.

## Acceptance Criteria

**AC1 — Bộ bảng lõi đầy đủ theo AR-3**
- **Given** Baserow đã chạy (Story 1.1, `baserow/baserow:1.30.1`)
- **When** áp dụng schema theo AR-3
- **Then** tồn tại đủ 9 bảng: `Pharmacies`, `Customers`, `Medications`/`Purchases`, `CareSchedule`, `Messages`, `EscalationCases`, `QuotaCounter`, `MessageTemplates`, `FaqEntries`
- **And** naming: Table **PascalCase số nhiều**, field **snake_case**, FK dạng `<entity>_id`

**AC2 — Bảng kịch bản (MessageTemplates + FaqEntries) đủ field duyệt + seed draft**
- **Given** bảng `MessageTemplates` (proactive) và `FaqEntries` (reactive)
- **When** kiểm tra field
- **Then** mỗi bảng có: phân loại nhóm/phạm vi (`care_group` cho `MessageTemplates` / `scope` cho `FaqEntries`), nội dung (`body_template` cho `MessageTemplates`; `question`+`answer` cho `FaqEntries`), `status` (enum `draft`/`approved`), `version`, `updated_by`, `approved_at`, `approved_by`
- **And** `FaqEntries` có thêm `mandatory_suffix` (câu bắt buộc TPCN)
- **And** seed bản ghi placeholder cho đủ 6 nhóm với `status=draft` (nội dung persona "Dược Sĩ Hải" thật do **Story 1.4** điền/duyệt — story này chỉ tạo khung record draft, KHÔNG copy persona cũ "Ngọc")

**AC3 — Customers có 3 field nghiệp vụ đặc thù**
- **Given** bảng `Customers`
- **When** kiểm tra field
- **Then** có `care_group` (integer `1..6`), `is_complaint_active` (boolean — cờ Nhóm 5 cắt ngang, **KHÔNG ghi đè** `care_group`), `friend_status` (trạng thái opt-in kết bạn Zalo)

**AC4 — Phân vùng tenant trên mọi bảng nghiệp vụ**
- **Given** mọi bảng nghiệp vụ
- **When** kiểm tra phân vùng
- **Then** mỗi bảng (trừ chính `Pharmacies`) có field `pharmacy_id`
- **And** truy vấn/seed mặc định lọc theo `pharmacy_id` (NFR-6 isolation); seed gắn đúng tenant đầu tiên `tructam`

**AC5 — Mã hóa at-rest + không rò PII ra ngoài self-host**
- **Given** field dữ liệu sức khỏe (tên, SĐT, thuốc, ghi chú tình trạng)
- **When** lưu at-rest
- **Then** mã hóa at-rest được bật ở tầng Postgres/volume self-host (Baserow KHÔNG có per-field encryption — enforce ở lớp DB/disk; xem Dev Notes › Mã hóa at-rest)
- **And** không có PII sức khỏe lọt ra ngoài Baserow self-host: schema không định nghĩa webhook/field export ra cloud; chỉ `customer_ref` ẩn danh mới được ra ngoài (PII-min, NFR-5)

## Tasks / Subtasks

- [x] **Task 1 — Định nghĩa schema JSON cho 9 bảng vào `baserow/schema/`** (AC: #1, #2, #3, #4)
  - [x] `baserow/schema/01-pharmacies.json` — `Pharmacies` (tenant root: `pharmacy_slug` unique, `persona_name`, `zalo_session_ref`, `monthly_quota`, `working_hours`, `created_at`)
  - [x] `baserow/schema/02-customers.json` — `Customers` (`pharmacy_id` FK, `full_name`, `phone`, `care_group` int 1..6, `is_complaint_active` bool, `friend_status`, `notes`, `created_at`, `updated_at`)
  - [x] `baserow/schema/03-medications.json` — `Medications`/`Purchases` (`pharmacy_id`, `customer_id` FK, `product_name`, `qty`, `purchased_at`, `note`)
  - [x] `baserow/schema/04-care-schedule.json` — `CareSchedule` (`pharmacy_id`, `customer_id`, `care_group`, `due_at`, `cadence_type`, `status`)
  - [x] `baserow/schema/05-messages.json` — `Messages` (`pharmacy_id`, `customer_ref`, `case_id`, `care_group`, `type` enum proactive/reply/escalation/pharmacist_reply, `content`, `error`, `ts` ISO-8601 UTC) — audit-first FR-10
  - [x] `baserow/schema/06-escalation-cases.json` — `EscalationCases` (`case_id` unique = mã ca, `pharmacy_id`, `customer_id`, `trigger`, `customer_content`, `pharmacist_reply`, `state` enum open/waiting_pharmacist/resolved, `created_at`, `resolved_at`)
  - [x] `baserow/schema/07-quota-counter.json` — `QuotaCounter` (`pharmacy_id`, `period_month`, `sent_count`, `cap`)
  - [x] `baserow/schema/08-message-templates.json` — `MessageTemplates` (`pharmacy_id`, `care_group` 1..6, `body_template`, `status` draft/approved, `version`, `updated_by`, `approved_at`, `approved_by`)
  - [x] `baserow/schema/09-faq-entries.json` — `FaqEntries` (`pharmacy_id`, `scope`, `question`, `answer`, `mandatory_suffix`, `status`, `version`, `updated_by`, `approved_at`, `approved_by`)
- [x] **Task 2 — Script áp schema vào Baserow qua REST API** (AC: #1, #4)
  - [x] `scripts/apply-baserow-schema.sh` (hoặc `.js` zero-dep theo pattern Story 1.1 `tests/`): đọc `BASEROW_API_URL` + `BASEROW_API_TOKEN` từ env, tạo database/tables/fields từ `baserow/schema/*.json` theo thứ tự số (FK sau bảng được tham chiếu)
  - [x] Idempotent: chạy lại không tạo trùng bảng/field (check tồn tại trước khi tạo)
  - [x] Map kiểu field Baserow đúng: text/long_text/number(int)/boolean/single_select(enum status,type,state)/date(ISO-8601)/link_row(FK)
- [x] **Task 3 — Seed dữ liệu draft + tenant Trúc Tâm vào `baserow/seed/`** (AC: #2, #4)
  - [x] `baserow/seed/01-pharmacy-tructam.json` — 1 record `Pharmacies` (`pharmacy_slug=tructam`, `persona_name=Dược Sĩ Hải`)
  - [x] `baserow/seed/08-message-templates-draft.json` — 6 record `MessageTemplates` (mỗi `care_group` 1..6) `status=draft`, `body_template` = placeholder rỗng/TODO (nội dung thật = Story 1.4)
  - [x] `baserow/seed/09-faq-entries-draft.json` — record FAQ khung `status=draft` (gồm `mandatory_suffix` TPCN để trống chờ Story 1.4)
  - [x] `scripts/apply-baserow-schema.sh` (hoặc script seed riêng) nạp seed gắn `pharmacy_id` của `tructam`
- [x] **Task 4 — Mã hóa at-rest + biến env** (AC: #5)
  - [x] Bổ sung `BASEROW_API_TOKEN` (và `BASEROW_API_URL`) vào `.env.example` (placeholder) + `tenants/_template.env` nếu per-tenant token
  - [x] Document cơ chế mã hóa at-rest ở tầng Postgres/volume (xem Dev Notes › Mã hóa at-rest) trong `docs/data-governance.md`; KHÔNG cố gắng mã hóa per-field trong Baserow (không hỗ trợ)
  - [x] Xác minh schema không khai báo webhook/export ra cloud
- [x] **Task 5 — Xác minh end-to-end** (AC: tất cả)
  - [x] `docker compose up -d baserow postgres` → Baserow healthy
  - [x] Tạo API token Baserow → chạy `scripts/apply-baserow-schema.sh` → 9 bảng tồn tại (gọi REST `GET /api/database/tables/...` xác nhận)
  - [x] Xác nhận naming: table PascalCase số nhiều, field snake_case, FK `<entity>_id`
  - [x] Xác nhận `Customers` có `care_group`/`is_complaint_active`/`friend_status`; `MessageTemplates`/`FaqEntries` đủ field duyệt; mọi bảng nghiệp vụ có `pharmacy_id`
  - [x] Chạy lại script → idempotent (không trùng)
  - [x] Ghi lệnh + kết quả vào Completion Notes

## Dev Notes

### Bối cảnh & ranh giới story
- Story này **chỉ tạo schema + seed khung draft** trong Baserow. **KHÔNG**: sinh mã ca (Story 1.3), viết lại/duyệt nội dung kịch bản persona "Dược Sĩ Hải" (Story 1.4), build workflow n8n hay logic agent (Epic 2+). [Source: epics.md#Story-1.2 ; epics.md#Story-1.4]
- **Phụ thuộc ngược Story 1.4:** AC2 yêu cầu "seed 6 nhóm với `status=draft`". Story 1.4 mới là nơi chuyển hóa nội dung kịch bản thật (`kichban-chamsoc-khachhang.md`, persona cũ "Ngọc" → "Dược Sĩ Hải") vào các record này. Ở Story 1.2 chỉ tạo **khung record draft rỗng/placeholder** đủ 6 nhóm để Story 1.4 cập nhật tại chỗ. TUYỆT ĐỐI không copy persona "Ngọc" hay mô hình 2-vai cũ vào seed. [Source: epics.md#Story-1.4 ; [[mecare-persona-relay]] ; [[mecare-kichban-baserow-sot]]]
- **Baserow = nguồn sự thật structured** (authoritative). Memory layer OpenClaw (SQLite+sqlite-vec) là phái sinh recall-only, rebuild được từ `Messages` — KHÔNG tạo bảng/field cho memory ở Baserow. [Source: architecture.md#Data-Architecture]
- Tenant đầu tiên thực tế = **Trúc Tâm** (`pharmacy_slug=tructam`). Mọi seed gắn tenant này. [Source: architecture.md#First-Implementation-Priority]

### Story 1.1 intelligence (đọc kỹ — kế thừa)
- Baserow đã chạy: image **`baserow/baserow:1.30.1`** (pin tag, KHÔNG `latest`), Postgres dùng chung (`POSTGRES_BASEROW_DB:-baserow`), healthcheck HTTP đã pass. [Source: 1-1-*.md#File-List ; docker-compose.yml:29-42]
- `baserow/{schema,seed,views}/` hiện chỉ có `.gitkeep` (rỗng) — story này điền nội dung thật. [Source: repo `find baserow -type f`]
- Convention đã chốt từ foundation: **JSON inter-component snake_case** khớp Baserow field; pin tag cụ thể; KHÔNG hardcode secret/token trong file commit (đọc từ env). [Source: 1-1-*.md#Convention-bắt-buộc]
- Pattern test zero-dep đã có (`tests/`, Node built-in runner). Nếu viết script JS, theo cùng style ESM (`openclaw/package.json` đã set `"type":"module"`). [Source: 1-1-*.md#Senior-Developer-Review M3]
- `.gitignore` chặn `*.env`/secrets — token Baserow đọc từ env, KHÔNG commit. [Source: 1-1-*.md#Completion-Notes AC4]

### Schema entities (AR-3) — bảng lõi & field bắt buộc
[Source: architecture.md#Data-Architecture]
| Bảng | Vai trò | Field then chốt |
|---|---|---|
| `Pharmacies` | tenant root | `pharmacy_slug` (unique), `persona_name`, `zalo_session_ref`, `monthly_quota`, `working_hours` |
| `Customers` | hồ sơ khách | `pharmacy_id`, `full_name`, `phone`, `care_group` (1..6), `is_complaint_active` (bool cờ N5), `friend_status` |
| `Medications`/`Purchases` | thuốc/đơn mua | `pharmacy_id`, `customer_id`, `product_name`, `purchased_at` |
| `CareSchedule` | lịch nhắc due | `pharmacy_id`, `customer_id`, `care_group`, `due_at`, `cadence_type` |
| `Messages` | mọi tin (audit-first FR-10) | `pharmacy_id`, `customer_ref`, `case_id`, `type` (proactive/reply/escalation/pharmacist_reply), `content`, `error`, `ts` |
| `EscalationCases` | ca leo thang | `case_id` (unique=mã ca), `pharmacy_id`, `trigger`, `state` (open/waiting_pharmacist/resolved) |
| `QuotaCounter` | trần gói tháng | `pharmacy_id`, `period_month`, `sent_count`, `cap` |
| `MessageTemplates` | kịch bản proactive (SoT) | `pharmacy_id`, `care_group`, `body_template`, `status`, `version`, `updated_by`, `approved_at`, `approved_by` |
| `FaqEntries` | FAQ reactive (SoT) | `pharmacy_id`, `scope`, `question`, `answer`, `mandatory_suffix`, `status`, `version`, `updated_by`, `approved_at`, `approved_by` |

### Naming bắt buộc (enforce — chống drift)
[Source: architecture.md#Naming-Patterns]
- Table: **PascalCase số nhiều** — `Pharmacies`, `Customers`, `EscalationCases`.
- Field: **snake_case** — `pharmacy_id`, `care_group`, `opt_in_zalo`, `created_at`.
- FK: `<entity>_id` — `pharmacy_id`, `customer_id`.
- `care_group` = integer `1..6`; Nhóm 5 = boolean `is_complaint_active` riêng, **KHÔNG ghi đè** `care_group` (giải Open Q6).
- `status` kịch bản = enum `draft`/`approved` (single_select); chỉ `approved` được dùng cho tải thật (enforce ở Epic 4/5, không phải story này).
- Thời gian: **ISO-8601 UTC** lưu trữ. Boolean `true/false`. Tiền: integer VND.

### Mã hóa at-rest (AC5 — đọc kỹ, tránh làm sai)
- **Baserow KHÔNG có mã hóa per-field.** Dữ liệu nằm trong Postgres dùng chung. "Mã hóa at-rest" (NFR-5) enforce ở **tầng Postgres/volume self-host**, không phải trong định nghĩa field Baserow. KHÔNG cố tạo field "encrypted" trong schema — sẽ sai pattern. [Source: architecture.md#Authentication-Security-Data-Governance]
- Cơ chế hợp lệ: mã hóa volume/disk của host (LUKS/dm-crypt) hoặc Postgres TDE-equivalent ở tầng hạ tầng. Story này **document** cơ chế trong `docs/data-governance.md` + để hook cấu hình; không tự dựng disk-encryption trong code (việc vận hành VPS).
- **PII-min ranh giới:** PII thật (tên/SĐT) chỉ sống trong Baserow self-host + de-anonymize ở zalo-bridge. Mọi payload ra cloud dùng `customer_ref` token ẩn danh. Vì vậy `Messages` ra-cloud-bound dùng `customer_ref`, KHÔNG `phone`/`full_name`. Schema KHÔNG được khai báo webhook/export đẩy PII ra ngoài. [Source: architecture.md#Format-Patterns ; #Architectural-Boundaries]

### Áp schema vào Baserow — cách làm
- Baserow không có "migration file" native. Áp schema qua **REST API token-auth** (`BASEROW_API_TOKEN`), tạo database → tables → fields theo thứ tự (bảng được FK tham chiếu tạo trước). [Source: architecture.md#API-Communication-Patterns ; Baserow 1.30 REST API]
- Field FK trong Baserow = kiểu `link_row` trỏ tới table đích → tạo bảng đích trước (thứ tự số 01→09 trong `baserow/schema/` đã phản ánh dependency: `Pharmacies` trước, bảng có `pharmacy_id`/`customer_id` sau).
- Script **idempotent**: trước khi tạo, `GET` list table/field, bỏ qua nếu đã tồn tại (cho phép chạy lại an toàn — pattern enforce xuyên hệ qua idempotency).
- Token đọc từ env, KHÔNG commit (kế thừa AC4 Story 1.1).

### Cấu trúc thư mục mục tiêu (story này điền)
```
baserow/
├── schema/   01-pharmacies.json … 09-faq-entries.json   # ĐỊNH NGHĨA 9 bảng
├── seed/     01-pharmacy-tructam.json, 08-…draft.json, 09-…draft.json
└── views/    (chưa bắt buộc story này — dashboard/form = Epic 6/3)
scripts/
└── apply-baserow-schema.sh   # áp schema + seed qua REST API (idempotent)
docs/
└── data-governance.md        # document mã hóa at-rest + PII-min
```
[Source: architecture.md#Complete-Project-Directory-Structure]

### Ranh giới kiến trúc (giữ đúng để không vỡ epic sau)
- **Baserow authoritative; memory recall-only** — không tạo cấu trúc memory ở Baserow. [Source: architecture.md#Data-boundaries]
- **Tenant boundary** = `pharmacy_id` mọi bảng; isolation NFR-6. [Source: architecture.md#Tenant-boundary]
- **Mã ca `ESC-<pharmacy_slug>-<YYYYMMDD>-<seq>`** là idempotency key — Story 1.2 chỉ tạo field `case_id` (text unique) trong `EscalationCases`/`Messages`; **logic sinh mã = Story 1.3**, không implement ở đây. [Source: architecture.md#Naming-Patterns ; epics.md#Story-1.3]
- Anti-patterns TRÁNH: trộn camelCase/snake_case; tạo field PII export ra cloud; mã hóa per-field giả trong Baserow; copy persona "Ngọc"/mô hình 2-vai vào seed; image `latest`. [Source: architecture.md#Anti-patterns]

### Testing standards
- Story dữ liệu/hạ tầng — không có app test framework. **Kiểm thử = vận hành thực + assert qua REST API:**
  - `docker compose up -d baserow postgres` → poll healthcheck.
  - Chạy `scripts/apply-baserow-schema.sh` → `GET` tables/fields, assert: 9 bảng tồn tại; naming đúng; `Customers` 3 field đặc thù; bảng kịch bản đủ field duyệt; mọi bảng nghiệp vụ có `pharmacy_id`.
  - Chạy lại script → idempotent (không trùng table/field).
  - Có thể bổ sung test zero-dep theo pattern `tests/contract/` Story 1.1 (vd `baserow-schema.test.js` parse `baserow/schema/*.json` assert naming/field bắt buộc — chạy offline, không cần Baserow live).
- Ghi lệnh + kết quả vào Completion Notes.

### Project Structure Notes
- Bám 1:1 `architecture.md#Complete-Project-Directory-Structure` (`baserow/schema/01..` đã liệt kê ở architecture; story này thêm `08-message-templates.json`/`09-faq-entries.json` cho 2 bảng kịch bản — biến thể chấp nhận, đúng AR-3 entities).
- `baserow/views/` để sau (dashboard Epic 6, form nhập liệu Epic 3) — không bắt buộc story này.

### References
- [Source: epics.md#Story-1.2-Khởi-tạo-Baserow-schema-nguồn-sự-thật] — story gốc + 5 AC BDD
- [Source: epics.md#Story-1.4] — phụ thuộc seed kịch bản persona "Dược Sĩ Hải"
- [Source: architecture.md#Data-Architecture] — AR-3 entities lõi + field
- [Source: architecture.md#Naming-Patterns] — table/field/FK convention, care_group/is_complaint_active
- [Source: architecture.md#Authentication-Security-Data-Governance] — NFR-5 mã hóa at-rest, PII-min
- [Source: architecture.md#Format-Patterns] — JSON snake_case, customer_ref ẩn danh, ISO-8601
- [Source: architecture.md#Multi-tenancy] — pharmacy_id isolation NFR-6
- [Source: architecture.md#Complete-Project-Directory-Structure] — baserow/{schema,seed,views}
- [Source: 1-1-scaffold-repo-docker-compose-stack-self-host.md] — Baserow 1.30.1 đang chạy, convention foundation
- [[mecare-architecture-openclaw]] — OpenClaw-trung tâm, Baserow authoritative
- [[mecare-kichban-baserow-sot]] — kịch bản = Baserow SoT, chủ hiệu thuốc tự sửa+duyệt
- [[mecare-persona-relay]] — persona "Dược Sĩ Hải" (KHÔNG "Ngọc")

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, dev-story workflow)

### Debug Log References

- Dry-run validate schema JSON (offline): `node scripts/apply-baserow-schema.mjs --dry-run` → 9 bảng OK.
- Contract test fail→fix: `CareSchedule`/`QuotaCounter` là danh từ tập hợp AR-3 (không hậu tố -s) → nới assertion plural + whitelist; test "Ngọc" bắt nhầm comment `_note` cảnh báo → đổi sang chỉ quét `rows`.
- Live e2e fail→fix: tài khoản Baserow mới KHÔNG tự tạo workspace → applier tự `POST /api/workspaces/` khi rỗng.
- Port 8080 bị service khác (https redirect) chiếm → e2e dùng alt port 8085 (precedent Story 1.1 alt-port).

### Completion Notes List

**Phạm vi:** chỉ schema + seed khung draft (đúng ranh giới). KHÔNG sinh mã ca (Story 1.3), KHÔNG nội dung persona thật (Story 1.4), KHÔNG copy persona cũ "Ngọc".

**AC results:**
- **AC1 ✅** 9 bảng tạo live, REST `GET tables` xác nhận `count=9`: Pharmacies, Customers, Purchases, CareSchedule, Messages, EscalationCases, QuotaCounter, MessageTemplates, FaqEntries. Table PascalCase (Purchases = biến thể Medications/Purchases; CareSchedule/QuotaCounter danh từ tập hợp AR-3), field snake_case, FK `<entity>_id` = link_row.
- **AC2 ✅** MessageTemplates + FaqEntries đủ field duyệt (`status` enum draft/approved, `version`, `updated_by`, `approved_at`, `approved_by`); FaqEntries có `mandatory_suffix`. Seed 6 nhóm MessageTemplates `status=draft`, `body_template` rỗng (nội dung = Story 1.4).
- **AC3 ✅** Customers: `care_group` (number), `is_complaint_active` (boolean — KHÔNG ghi đè care_group), `friend_status` (single_select opt-in Zalo).
- **AC4 ✅** Mọi bảng nghiệp vụ (trừ Pharmacies) có `pharmacy_id` link_row → Pharmacies; seed gắn tenant `tructam` (persona Dược Sĩ Hải).
- **AC5 ✅** Mã hóa at-rest document ở `docs/data-governance.md` (LUKS/dm-crypt tầng volume — Baserow KHÔNG per-field). Schema sạch: không webhook/export/url (grep CLEAN). Messages dùng `customer_ref` ẩn danh, KHÔNG phone/full_name.

**Lệnh + kết quả e2e (live, Baserow 1.30.1 alt port 8085):**
```
docker compose up -d postgres baserow      # HEALTHY after ~90s (port 8085)
POST /api/user/                            # register first user -> 200
node scripts/apply-baserow-schema.mjs      # RUN1: tạo 9 bảng + seed +1/+6/+1
GET /api/database/tables/database/12/      # count=9 (đủ 9 bảng)
node scripts/apply-baserow-schema.mjs      # RUN2: 0 create-actions, seed bỏ qua 1/6/1 -> idempotent ✅
docker compose down -v                     # teardown sạch
```

**Tests:** `cd tests && node --test` → **68 pass / 0 fail** (40 Story 1.1 regression + 25 contract `baserow-schema.test.js` phủ AC1-AC5 + seed + applier-compat/enum/ordering + 3 integration `apply-baserow-schema.test.js` dry-run/auth-guard). Offline, zero-dep Node built-in runner.

**Auth note:** schema ops (tạo bảng/field) cần JWT user (BASEROW_EMAIL+PASSWORD); database Token chỉ đủ seed (row). Applier hỗ trợ cả hai + auto-tạo workspace nếu rỗng.

### File List

**Mới:**
- `baserow/schema/01-pharmacies.json` … `09-faq-entries.json` (9 file định nghĩa bảng)
- `baserow/seed/01-pharmacy-tructam.json`, `08-message-templates-draft.json`, `09-faq-entries-draft.json`
- `scripts/apply-baserow-schema.mjs` (applier idempotent, Node ESM zero-dep)
- `scripts/apply-baserow-schema.sh` (wrapper)
- `docs/data-governance.md` (mã hóa at-rest + PII-min NFR-5)
- `tests/contract/baserow-schema.test.js` (25 test AC1-AC5 + seed + applier-compat/enum/FK-ordering)
- `tests/integration/apply-baserow-schema.test.js` (3 test: dry-run happy + auth-guard error, exercise script thật)
- `_bmad-output/implementation-artifacts/tests/test-summary-1.2.md` (QA automation summary, qa-generate-e2e-tests)

**Sửa:**
- `.env.example` (+ BASEROW_API_URL/DATABASE_NAME/EMAIL/PASSWORD/API_TOKEN placeholder)
- `tenants/_template.env` (+ BASEROW_API_TOKEN per-tenant placeholder)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (1-2 → in-progress → review)
- `scripts/apply-baserow-schema.mjs` (review-fix: seed idempotency scoped theo tenant — NFR-6)

## Change Log

| Version | Date | Mô tả |
|---|---|---|
| 0.2.0 | 2026-06-06 | Story 1.2 implement: 9 schema JSON + applier idempotent + seed draft tructam + data-governance doc + 14 contract test. Live e2e Baserow 1.30.1 pass (9 bảng, idempotent). 54/54 test pass. Status → review. |
| 0.2.1 | 2026-06-06 | Senior Developer Review (AI) — auto-fix. M1: seed idempotency scoped theo tenant (NFR-6, sửa cross-tenant collision). M2: File List + Completion Notes sync (thêm integration test, 54→68 pass). 68/68 test pass. 0 CRITICAL → Status → done. |

## Senior Developer Review (AI)

**Reviewer:** gabenidolcs · **Date:** 2026-06-06 · **Outcome:** ✅ Approve (auto-fix applied)

**Phạm vi review:** schema JSON (9), applier `apply-baserow-schema.mjs`, seed (3), `docs/data-governance.md`, env (`.env.example`, `tenants/_template.env`), test (contract+integration). Loại trừ `_bmad/`, `_bmad-output/`.

### AC × implementation
| AC | Verdict | Bằng chứng |
|---|---|---|
| AC1 — 9 bảng + naming | ✅ IMPLEMENTED | 9 file `baserow/schema/01..09`; PascalCase (CareSchedule/QuotaCounter = danh từ tập hợp AR-3, whitelist test:39); field snake_case; FK `<entity>_id` = link_row |
| AC2 — bảng kịch bản field duyệt | ✅ IMPLEMENTED | `08`/`09`: status enum draft/approved + version+updated_by+approved_at+approved_by; FaqEntries có mandatory_suffix; seed 6 nhóm draft |
| AC3 — Customers 3 field | ✅ IMPLEMENTED | `02-customers.json`: care_group(number)/is_complaint_active(boolean)/friend_status(single_select) |
| AC4 — pharmacy_id tenant | ✅ IMPLEMENTED | mọi bảng ≠ Pharmacies có pharmacy_id link_row→Pharmacies; seed gắn tenant tructam |
| AC5 — at-rest + no PII export | ✅ IMPLEMENTED | `docs/data-governance.md` (LUKS/dm-crypt + PII-min); schema grep clean webhook/export/encrypted; Messages dùng customer_ref |

Tasks 1–5: tất cả [x] xác minh đúng (file tồn tại + nội dung khớp + 68 test pass + live e2e đã ghi Completion Notes). Không có task [x] giả.

### Findings + fixes
- **[M1 — FIXED] Seed idempotency bỏ qua tenant (correctness/NFR-6).** `applySeed()` matches() dedup theo `key` (vd `care_group`) trên TOÀN bảng — tenant #2 seed care_group 1..6 sẽ trùng row tenant #1 → bị bỏ qua → tenant #2 mất template. Latent isolation bug khi onboard nhà thuốc thứ 2. **Fix:** thêm `sameTenant(r)` scope dedup theo `pharmacy_id` link khi `tenant_slug` có. `scripts/apply-baserow-schema.mjs:233-242`.
- **[M2 — FIXED] File List + Completion Notes lệch git reality.** `tests/integration/apply-baserow-schema.test.js` + `tests/test-summary-1.2.md` có trong git nhưng thiếu trong File List; Completion Notes ghi "54 pass" nhưng thực 68 (qa-generate-e2e thêm +14). **Fix:** sync File List + đổi 54→68.
- **[L1 — accepted] CareSchedule/QuotaCounter không số nhiều** — danh từ tập hợp AR-3 hợp lệ, đã document + whitelist test. Không sửa.
- **[L2 — noted] `applySeed` GET tables mỗi seed file (N+1)** — 3 file, scale tầm thường. Không sửa story này.

0 CRITICAL/HIGH sau fix → Status done.
