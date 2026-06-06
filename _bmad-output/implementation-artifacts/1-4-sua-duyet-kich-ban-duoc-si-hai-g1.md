---
baseline_commit: c574298
---

# Story 1.4: Sửa & duyệt kịch bản "Dược Sĩ Hải" (G1)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a chủ sản phẩm MeCare,
I want bộ kịch bản chăm sóc 6 nhóm được viết lại theo persona "Dược Sĩ Hải" và mô hình relay, nạp vào Baserow rồi duyệt nội dung,
so that AI có **nguồn kịch bản đã phê duyệt trong Baserow** (`status=approved`), không còn dùng persona cũ "Ngọc" hay mô hình 2-vai cũ, làm điều kiện chặn go-live (Open Q3).

## Acceptance Criteria

**AC1 — Chuyển hóa toàn bộ kịch bản vào Baserow, KHÔNG vào file `openclaw/kichban/`**
- **Given** file nguồn `kichban-chamsoc-khachhang.md` (746 dòng, persona cũ "Ngọc", mô hình 2-vai)
- **When** chuyển hóa nội dung
- **Then** đích đến là **Baserow** `MessageTemplates` (proactive, `body_template` cho từng `care_group` 1–6) + `FaqEntries` (reactive FAQ + `mandatory_suffix`) — **KHÔNG** ghi vào `openclaw/kichban/` (thư mục đó = cache phái sinh, hiện chỉ có `.gitkeep`)
- **And** nội dung được giữ ở **2 nơi đồng bộ**: (a) file seed `baserow/seed/08-message-templates-draft.json` + `baserow/seed/09-faq-entries-draft.json` (artifact version-controlled), (b) hàng thật trong Baserow sau khi áp seed
- **And** mỗi record `MessageTemplates` có đủ `care_group` (1..6), `body_template` (đã điền, KHÔNG rỗng), `status`, `version ≥ 1`, `updated_by`; mỗi record `FaqEntries` có `scope`, `question`, `answer`, `status`, `version ≥ 1`, `updated_by`

**AC2 — Persona "Dược Sĩ Hải" + mô hình relay, sạch dấu vết "Ngọc"/2-vai**
- **Given** mọi tin nhắn/FAQ chuyển hóa
- **When** rà persona & mô hình luồng
- **Then** **không còn chuỗi "Ngọc"** ở bất kỳ record nào (cả 27 dòng nguồn đã liệt kê); persona xưng tên giữa câu là **"Dược Sĩ Hải"** (hoặc "Hải"), tự xưng vẫn giữ **"em"**
- **And** mô tả luồng kết nối dược sĩ theo **mô hình relay**: AI ("Dược Sĩ Hải") luôn là người nói với khách; Dược Sĩ Hải thật chỉ cố vấn hậu trường; khách KHÔNG thấy việc chuyển giao — KHÔNG dùng câu chữ 2-vai cũ ("nhân viên → kết nối dược sĩ" kiểu hai người tách biệt trước mặt khách)
- **And** cấp cứu (115) mô tả phát **song song**, không phụ thuộc relay

**AC3 — Lằn ranh an toàn y tế hiện diện nguyên văn (mandatory phrases)**
- **Given** kịch bản từng nhóm
- **When** rà nội dung an toàn y tế
- **Then** **TPCN/Nhóm 4** kèm câu bắt buộc **nguyên văn**: `"thực phẩm bảo vệ sức khỏe, không phải thuốc điều trị bệnh"` — đặt ở `FaqEntries.mandatory_suffix` cho scope TPCN
- **And** **quy tắc bù liều (missed dose)** hiện diện trong tin Nhóm 1: quên trong 1–2 tiếng → vẫn uống; qua lâu → bỏ liều đó, uống liều kế đúng giờ; **nguyên văn** `"không uống gấp đôi để bù liều"`
- **And** **OTC/Nhóm 2 cờ đỏ định lượng**: `sốt > 38.5°C kéo dài > 2 ngày`, khó thở/đau tức ngực, nôn/tiêu chảy liên tục → khuyến nghị gặp bác sĩ / leo thang

**AC4 — Duyệt nội dung: draft → approved có dấu vết**
- **Given** kịch bản đã viết lại trong Baserow ở `status=draft`
- **When** rà duyệt và phê duyệt
- **Then** mọi record dùng cho tải thật chuyển `status=approved` + ghi `approved_at` (timestamp) + `approved_by` (tên người duyệt) trước khi dùng
- **And** thao tác duyệt **idempotent**: chạy lại không tạo bản ghi trùng, không reset `approved_at` đã có
- **And** đây là **điều kiện chặn go-live, KHÔNG chặn bắt đầu code** (Open Q3) — story để lại trạng thái approved nhưng downstream Epic 4/5 mới enforce "chỉ approved được gửi"

**AC5 — Cơ chế nạp/cập nhật + duyệt chạy được, idempotent**
- **Given** seed `MessageTemplates`/`FaqEntries` skeleton rỗng do Story 1.2 đã tạo (insert-only)
- **When** áp nội dung mới (đã điền) lên Baserow
- **Then** có đường **cập nhật (update/upsert)** hàng đã tồn tại theo key (`care_group` cho MessageTemplates, `scope` cho FaqEntries) — vì applier hiện tại **chỉ insert, skip khi key trùng**, không update (xem Dev Notes › Gap applier)
- **And** chạy lần 2 không nhân đôi hàng, không hạ cấp `status` đã approved về draft ngoài ý muốn
- **And** regression Story 1.1+1.2+1.3 vẫn pass (`cd tests && node --test`)

## Tasks / Subtasks

- [x] **Task 1 — Chuyển hóa nội dung 6 nhóm → seed MessageTemplates** (AC: #1, #2, #3)
  - [x] Đọc đầy đủ `kichban-chamsoc-khachhang.md` (746 dòng); với mỗi Nhóm 1–6, gộp các mẫu tin proactive thành `body_template` (giữ placeholder `[TÊN]`, `[TÊN THUỐC]`, `[LIỀU DÙNG]`, `[NGÀY...]` — guardrail điền runtime, KHÔNG điền cứng)
  - [x] Đổi **mọi** "Ngọc" → "Dược Sĩ Hải" (27 dòng nguồn: 3,5,19,32,41,57,72,84,102,217,237,259,331,347,364,427,446,464,534,577,596,614,666,683,700,721,731); giữ tự xưng "em"
  - [x] Viết lại câu "kết nối dược sĩ" theo **mô hình relay** (AI front, dược sĩ hậu trường) — rà các dòng 47,127,145,157,164,194,249,331,373,389,401,407,411,456,488,504,536,548,558,567,690,723–731
  - [x] Đảm bảo Nhóm 1 chứa quy tắc bù liều nguyên văn "không uống gấp đôi để bù liều" (nguồn 1.4, dòng 88–92); Nhóm 2 chứa cờ đỏ OTC >38.5°C >2 ngày (nguồn 2.4, dòng 293–298)
  - [x] Ghi vào `baserow/seed/08-message-templates-draft.json`: 6 hàng, `body_template` đã điền, `version: 1`, `updated_by: "story-1.4"`, `status: "draft"` (thay khung rỗng `seed-1.2`)
- [x] **Task 2 — Chuyển hóa FAQ + câu bắt buộc → seed FaqEntries** (AC: #1, #2, #3)
  - [x] Tách nội dung reactive (giải đáp cách dùng, phản ứng có hại, khiếu nại chất lượng, TPCN…) thành các record `FaqEntries` theo `scope` (mở rộng từ 1 scope "general" sang nhiều scope theo chủ đề/nhóm)
  - [x] `mandatory_suffix` cho scope TPCN = nguyên văn "thực phẩm bảo vệ sức khỏe, không phải thuốc điều trị bệnh"
  - [x] Persona "Dược Sĩ Hải" + relay (như Task 1); cấp cứu 115 song song
  - [x] Ghi vào `baserow/seed/09-faq-entries-draft.json`: các hàng `question`/`answer`/`mandatory_suffix` đã điền, `version: 1`, `updated_by: "story-1.4"`, `status: "draft"`
- [x] **Task 3 — Đường cập nhật (update/upsert) seed lên Baserow** (AC: #1, #5)
  - [x] Vì `applySeed` trong `scripts/apply-baserow-schema.mjs` **insert-only** (skip khi key trùng, KHÔNG update) → bổ sung chế độ update: cờ `--update-seed` (hoặc upsert) cập nhật `body_template`/`question`/`answer`/`mandatory_suffix`/`version`/`updated_by` cho hàng đã tồn tại theo key
  - [x] Giữ idempotent: không nhân đôi hàng; KHÔNG tự ý hạ `status=approved` về draft khi update nội dung (chỉ bump nội dung + version; trạng thái duyệt do Task 4 quản)
  - [x] Reuse env/auth pattern Story 1.2/1.3: row ops đủ với database token (`BASEROW_API_TOKEN`), đọc `BASEROW_API_URL` từ env, KHÔNG hardcode/commit
- [x] **Task 4 — Bước duyệt: draft → approved có dấu vết** (AC: #4)
  - [x] Thêm script/cờ duyệt (vd `scripts/approve-kichban.mjs` hoặc `--approve`): set `status=approved`, `approved_at=<now ISO>`, `approved_by=<arg>` cho các record của tenant
  - [x] Idempotent: chạy lại không reset `approved_at` đã có; chỉ duyệt record đang `draft`
  - [x] Lọc theo `pharmacy_id` (NFR-6 isolation) — chỉ duyệt đúng tenant (`tructam`)
- [x] **Task 5 — Test + xác minh** (AC: #2, #3, #5)
  - [x] Test contract offline (zero-dep, `tests/contract/`): assert seed JSON KHÔNG chứa chuỗi "Ngọc"; chứa các câu bắt buộc nguyên văn (TPCN suffix, "không uống gấp đôi", "38.5"); 6 nhóm đủ `body_template` không rỗng
  - [x] Test logic update/upsert + approve (in-memory/fake store mô phỏng unique key — pattern Story 1.3): update sửa nội dung không nhân đôi; approve set 3 field + idempotent
  - [x] `cd tests && node --test` → toàn bộ pass gồm regression 1.1/1.2/1.3
  - [x] (Nếu Baserow live) áp seed update + approve thật → `GET` xác nhận 6 MessageTemplates + FAQ ở `status=approved`, `body_template` không rỗng, không có "Ngọc"

## Dev Notes

### Bối cảnh & ranh giới story
- Story này là **chuyển hóa nội dung + duyệt**, KHÔNG build runtime agent. KHÔNG: logic gửi tin (Epic 4), KHÔNG phát hiện trigger/relay runtime (Epic 5), KHÔNG guardrail enforcement "chỉ approved mới gửi" (Epic 4/5 enforce). Story chỉ tạo **nguồn dữ liệu kịch bản approved** trong Baserow. [Source: epics.md#Story-1.4 ; architecture.md#Decision-Impact-Implementation-Sequence]
- **Đích = Baserow, KHÔNG phải file.** AR-3 neo "schema = nguồn sự thật"; kịch bản authoritative ở `MessageTemplates`/`FaqEntries`. `openclaw/kichban/` (hiện `.gitkeep` rỗng) = cache phái sinh rebuild từ Baserow — TUYỆT ĐỐI không coi là nguồn. [Source: architecture.md#Data-Architecture ; openclaw/kichban/.gitkeep]
- Chủ hiệu thuốc về sau tự sửa+tự duyệt qua Baserow UI (Story 6.3). Story 1.4 = nạp nội dung gốc lần đầu + duyệt go-live đầu tiên. [Source: architecture.md#Data-Architecture "Chủ hiệu thuốc tự sửa + tự duyệt"]

### Story 1.2 + 1.3 intelligence (đọc kỹ — kế thừa)
- **Schema MessageTemplates/FaqEntries đã có (Story 1.2).** KHÔNG sửa schema. Field MessageTemplates: `pharmacy_id` (link), `care_group` (number, primary), `body_template` (long_text), `status` (single_select draft/approved), `version`, `updated_by`, `approved_at` (date+time), `approved_by`. Field FaqEntries: `pharmacy_id`, `scope` (text, primary), `question`, `answer`, `mandatory_suffix` (long_text), `status`, `version`, `updated_by`, `approved_at`, `approved_by`. [Source: baserow/schema/08-message-templates.json ; baserow/schema/09-faq-entries.json]
- **Seed skeleton rỗng do Story 1.2 tạo sẵn**: `baserow/seed/08-message-templates-draft.json` có 6 hàng `body_template: ""` `updated_by: "seed-1.2"`; `09-faq-entries-draft.json` có 1 hàng scope "general" rỗng. `_note` của chúng nói rõ "nội dung thật do Story 1.4 điền/duyệt, KHÔNG copy persona cũ 'Ngọc'". Story 1.4 **thay nội dung** các file này. [Source: baserow/seed/08-message-templates-draft.json ; baserow/seed/09-faq-entries-draft.json]
- **Pattern code = ESM zero-dep, Node built-in test runner** (`openclaw/package.json` `"type":"module"`, node>=20). Script mới theo style `scripts/apply-baserow-schema.mjs` / `scripts/demo-allocate-case.mjs`. Test ở `tests/`, chạy `cd tests && node --test`; giữ regression xanh (Story 1.3 để lại 125 test pass). [Source: openclaw/package.json ; 1-3-*.md#Senior-Developer-Review ; scripts/apply-baserow-schema.mjs]
- **Auth Baserow:** schema ops cần JWT user (`BASEROW_EMAIL`+`BASEROW_PASSWORD`); **row ops** (update body_template, approve) đủ với database token (`BASEROW_API_TOKEN`). Đọc `BASEROW_API_URL`/token từ env, KHÔNG commit. [Source: 1-2-*.md#Completion-Notes ; scripts/apply-baserow-schema.mjs L109-112]

### ⚠️ Gap applier — bắt buộc xử (AC5)
- `applySeed()` trong `scripts/apply-baserow-schema.mjs` (L218-254) là **insert-only idempotent by key**: nếu hàng có key (`care_group`/`scope`) đã tồn tại → **skip**, KHÔNG update. Nghĩa là nếu Story 1.2 đã áp seed rỗng lên Baserow live, chạy lại seed với nội dung mới **sẽ không điền nội dung**. Dev PHẢI thêm đường update/upsert (Task 3) — KHÔNG dựa vào re-run seed mặc định. [Source: scripts/apply-baserow-schema.mjs L218-254]
- Seed match key: `seed.key` = `["care_group"]` cho MessageTemplates, `["scope"]` cho FaqEntries; lọc theo `tenant_slug: "tructam"` → cần Pharmacies tenant `tructam` đã seed trước. [Source: baserow/seed/08-*.json ; scripts/apply-baserow-schema.mjs L225-236]

### Persona "Dược Sĩ Hải" + mô hình relay (chốt 2026-06-06)
- Persona front-line = **AI mang danh "Dược Sĩ Hải"** trên Zalo cá nhân; tự xưng **"em"**, gọi khách "anh/chị [TÊN]". Mô hình relay (KHÔNG takeover trực tiếp):
  `Khách → AI "Dược Sĩ Hải" → (ca khó) tạo EscalationCase → báo Zalo Dược Sĩ Hải THẬT → dược sĩ gõ phương án → AI nhắn lại khách giọng persona`.
- **AI luôn là người nói**; Dược Sĩ Hải thật = cố vấn hậu trường, khách không thấy chuyển giao. Cấp cứu 115 phát **song song** không phụ thuộc relay. Viết câu chữ "kết nối dược sĩ" theo tinh thần này — KHÔNG mô tả 2 người tách biệt trước mặt khách (mô hình 2-vai cũ). [Source: prds/.../addendum.md §2 L22-42, L77-79]
- Sắc thái tone (reconcile-kichban §3): biến thể xưng hô "anh/chị [TÊN] **kính mến**" (khiếu nại) / "**thân mến**" (phục hồi quan hệ); lựa chọn đánh số mang emoji cảm xúc (1→dừng, 3→leo thang); cụm trấn an cố định "em luôn ở đây ạ". Giữ các sắc thái này khi viết lại. [Source: prds/.../reconcile-kichban.md §3]

### Nội dung an toàn y tế — câu bắt buộc nguyên văn (AC3)
- TPCN suffix: `"thực phẩm bảo vệ sức khỏe, không phải thuốc điều trị bệnh"` (nguồn dòng 434; FR-7). → `FaqEntries.mandatory_suffix` scope TPCN.
- Missed dose (Nhóm 1, nguồn 1.4 dòng 88–92): quên 1–2 tiếng → vẫn uống; qua lâu → bỏ liều, uống liều kế; nguyên văn `"không uống gấp đôi để bù liều"`. [Source: prds/.../reconcile-kichban.md GAP-2]
- OTC cờ đỏ (Nhóm 2, nguồn 2.4 dòng 293–298): sốt >38.5°C kéo dài >2 ngày; khó thở/đau tức ngực; nôn/tiêu chảy liên tục → khuyến nghị bác sĩ. [Source: prds/.../reconcile-kichban.md GAP-1]
- Đơn bác sĩ giá trị 5 ngày; đổi thuốc thay thế chỉ khi khách đồng ý + dược sĩ kiểm tương đương; thuốc kê đơn không bán thêm tự do. [Source: prds/.../reconcile-kichban.md §1]

### Source tree — file sẽ chạm
- `baserow/seed/08-message-templates-draft.json` — UPDATE: điền 6 `body_template` (hiện rỗng)
- `baserow/seed/09-faq-entries-draft.json` — UPDATE: điền FAQ + mandatory_suffix; mở rộng scope
- `scripts/apply-baserow-schema.mjs` — UPDATE: thêm đường update/upsert (AC5)
- `scripts/approve-kichban.mjs` — NEW (hoặc cờ `--approve`): bước duyệt (AC4)
- `tests/contract/kichban-content.test.js` — NEW: assert no "Ngọc", có câu bắt buộc, 6 nhóm đầy
- `tests/integration/seed-update-approve.test.js` — NEW: update/approve idempotent
- KHÔNG chạm: `baserow/schema/*` (schema đã chốt Story 1.2), `openclaw/kichban/` (cache phái sinh)

### Testing standards
- Test framework = Node built-in `node:test` + `node:assert`, zero-dep, ở `tests/`. Chạy `cd tests && node --test`. Test offline KHÔNG phụ thuộc Baserow live (mô phỏng store như Story 1.3). Toàn bộ regression cũ phải xanh. [Source: 1-3-*.md#Dev-Notes ; tests/package.json]

### Project Structure Notes
- Trùng khớp cấu trúc: seed/schema dưới `baserow/`, script vận hành dưới `scripts/`, test dưới `tests/` — đúng pattern đã thiết lập Story 1.1–1.3. Không phát sinh thư mục mới.
- Không biến lệch: nội dung kịch bản ở Baserow (không ở `openclaw/kichban/`) đúng quyết định AR-3.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement]
- [Source: _bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/addendum.md#§2-relay #§5-persona]
- [Source: _bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/reconcile-kichban.md#GAP-1 #GAP-2 #§3-tone]
- [Source: baserow/schema/08-message-templates.json ; baserow/schema/09-faq-entries.json]
- [Source: baserow/seed/08-message-templates-draft.json ; baserow/seed/09-faq-entries-draft.json]
- [Source: scripts/apply-baserow-schema.mjs#applySeed]
- [Source: kichban-chamsoc-khachhang.md (746 dòng — nguồn chuyển hóa)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (BMAD dev-story workflow)

### Debug Log References

- `node --test` (chạy từ `tests/`): 178/178 pass, 0 fail, 48 suites (baseline Story 1.3 = 125 → +51 test Story 1.4 + QA gap + review regression). Trị số 150 trong bản nháp đầu đã lỗi thời (QA workflow nâng lên 176; review wiring + intra-batch dedup nâng lên 178).
- Regression note: 3 contract test Story 1.2 (`baserow-schema.test.js`) trước assert seed RỖNG; cập nhật assertion sang "đã điền" cho khớp done-state Story 1.4 (nội dung chi tiết tách sang `kichban-content.test.js`).

### Completion Notes List

- **Task 1 + 2 — nội dung:** Chuyển hóa 746 dòng `kichban-chamsoc-khachhang.md` (persona cũ "Ngọc", mô hình 2-vai) → 6 hàng `MessageTemplates.body_template` (proactive theo nhóm 1–6) + 9 hàng `FaqEntries` (reactive theo scope). Viết lại toàn bộ theo persona **"Dược Sĩ Hải"** + **mô hình relay** (AI luôn là người nói, dược sĩ thật hậu trường, khách không thấy chuyển giao). Giải quyết mâu thuẫn persona-vs-relay: thay câu "để em hỏi dược sĩ" bằng tự-rà-soát liền mạch ("em xem thật kỹ…báo lại trong vài phút"). Giữ placeholder runtime (`[TÊN]`, `[TÊN THUỐC]`…). Câu an toàn nguyên văn: "không uống gấp đôi để bù liều" (Nhóm 1), "Sốt trên 38.5°C kéo dài hơn 2 ngày" (Nhóm 2), TPCN suffix "thực phẩm bảo vệ sức khỏe, không phải thuốc điều trị bệnh". Đã loại bỏ hết "Ngọc" (kể cả trong `_note`).
- **Task 3 — upsert:** Thêm cờ `--update-seed` vào `apply-baserow-schema.mjs`: insert mới + PATCH nội dung hàng đã tồn tại theo key; KHÔNG đụng `status`/`approved_at`/`approved_by` (không hạ approved→draft). Idempotent.
- **Task 4 — duyệt:** Logic thuần tách vào `openclaw/lib/kichban-ops.mjs` (zero-dep, test offline được — pattern Story 1.3). `scripts/approve-kichban.mjs` wire logic vào Baserow REST: set `status=approved` + `approved_at=<now ISO>` + `approved_by=<--by>`; lọc `pharmacy_id` tenant `tructam` (NFR-6); idempotent (bỏ qua record đã approved, không reset `approved_at`); có `--dry-run`. Auth qua env (`BASEROW_API_TOKEN` đủ), KHÔNG hardcode.
- **Task 5 — test:** `tests/contract/kichban-content.test.js` (no "Ngọc", câu bắt buộc nguyên văn, 6 nhóm body không rỗng, scope FAQ cốt lõi) + `tests/integration/seed-update-approve.test.js` (upsert sửa không nhân đôi + không hạ approved; approve 3 field + idempotent + tenant isolation; guard arg). Toàn bộ 150 test xanh.
- **Ranh giới:** KHÔNG build runtime agent / gửi tin / enforce "chỉ approved mới gửi" (Epic 4/5). Story chỉ tạo nguồn kịch bản approved trong Baserow. AC4 là điều kiện chặn go-live, không chặn code (Open Q3). Bước duyệt thật lên Baserow live = vận hành (cần env), chưa chạy ở đây.

### File List

- `baserow/seed/08-message-templates-draft.json` — UPDATE: điền 6 `body_template` persona Hải/relay
- `baserow/seed/09-faq-entries-draft.json` — UPDATE: 9 scope FAQ + mandatory_suffix
- `scripts/apply-baserow-schema.mjs` — UPDATE: cờ `--update-seed` (upsert, giữ trạng thái duyệt)
- `openclaw/lib/kichban-ops.mjs` — NEW: logic thuần upsert + approve (zero-dep, DI store)
- `scripts/approve-kichban.mjs` — NEW: bước duyệt draft→approved qua Baserow REST (AC4)
- `tests/contract/kichban-content.test.js` — NEW: contract nội dung seed
- `tests/integration/seed-update-approve.test.js` — NEW: upsert + approve idempotent
- `tests/contract/baserow-schema.test.js` — UPDATE: 2 test seed-empty → seed-filled (done-state 1.4)

## Change Log

| Ngày | Version | Mô tả | Tác giả |
|------|---------|-------|---------|
| 2026-06-06 | 0.1.0 | Story 1.4: chuyển hóa kịch bản "Dược Sĩ Hải" + relay vào Baserow seed; thêm upsert (`--update-seed`) + approve (`approve-kichban.mjs`); 150/150 test pass | dev-story (claude-opus-4-8) |
| 2026-06-06 | 0.2.0 | Senior Developer Review (AI): wire `apply-baserow-schema.mjs` upsert vào lib `kichban-ops.mjs` (bỏ logic trùng, prod path nay được test); intra-batch dedup theo key trong `upsertSeed`; `approve-kichban.mjs` DRY-RUN reuse `belongsToTenant`; +2 test → 178/178 pass | review (claude-opus-4-8) |

## Senior Developer Review (AI)

**Reviewer:** thephams (gabenidolcs) · **Date:** 2026-06-06 · **Outcome:** ✅ Approve (sau auto-fix)

### Phạm vi
Adversarial review toàn bộ File List vs git reality + 5 AC. File List khớp git (8 file chạm, đúng khai báo). 178/178 test pass sau fix.

### AC verification
- **AC1** ✓ 6 MessageTemplates `body_template` đã điền, 9 FaqEntries `question`/`answer`/`mandatory_suffix`, `version≥1`, `updated_by`. Đích = Baserow seed, KHÔNG `openclaw/kichban/`.
- **AC2** ✓ Không còn "Ngọc"; persona "Dược Sĩ Hải" + "em"; relay (không "kết nối dược sĩ"/"nhân viên" 2-vai); 115 song song.
- **AC3** ✓ TPCN suffix nguyên văn; "không uống gấp đôi để bù liều" (Nhóm 1); cờ đỏ 38.5°C/>2 ngày (Nhóm 2).
- **AC4** ✓ `approveDrafts` set 3 field + idempotent + tenant filter (NFR-6).
- **AC5** ✓ Upsert path + idempotent + regression xanh.

### Findings & resolution (auto-fixed)
| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| A | MEDIUM | `apply-baserow-schema.mjs::applySeed` reimplement upsert inline; lib `upsertSeed` (đã test) KHÔNG dùng trong prod → prod path không test, divergence risk | Wire `applySeed` → `upsertSeed` qua store adapter (list lọc tenant) + `decorate` gắn `pharmacy_id` khi insert; bỏ logic + const `SEED_STATUS_FIELDS` trùng |
| B | MEDIUM | Debug Log/Change Log ghi "150/150" trong khi suite thực 176 (QA đã thêm test) | Cập nhật → 178/178 |
| C | LOW | `upsertSeed`/`applySeed` snapshot `existing` 1 lần → 2 row cùng key trong 1 batch cùng insert (nhân đôi) | `upsertSeed` push hàng vừa tạo vào snapshot; +2 regression test intra-batch |
| D | LOW | `approve-kichban.mjs` DRY-RUN reimplement filter tenant inline | Import + reuse `belongsToTenant` |

Không có CRITICAL/HIGH. Status → done.
