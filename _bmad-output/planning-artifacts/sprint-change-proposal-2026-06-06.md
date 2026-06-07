    # Sprint Change Proposal — MeCare

**Ngày:** 2026-06-06
**Người lập:** Tinsu (qua workflow Correct Course)
**Chế độ:** Batch
**Scope phân loại:** Moderate (Direct Adjustment — implementation chưa bắt đầu)

---

## 1. Tóm tắt vấn đề (Issue Summary)

**Trigger:** Trong lúc rà soát planning artifacts, phát hiện hai điều về **bộ kịch bản chăm sóc 6 nhóm** (hiện có sẵn ở landing page: `website/pages/kichban.html` + nguồn `kichban-chamsoc-khachhang.md`):

1. **Kịch bản ĐÃ được nhắc đầy đủ trong docs** (PRD FR-3/FR-7, Epics Story 1.4/4.1/5.1, Architecture AR-5) — đây KHÔNG phải gap.
2. **Mô hình lưu trữ kịch bản trong docs KHÁC yêu cầu thực tế.** Docs lưu kịch bản dạng **file** `openclaw/kichban/` (1 file/nhóm), chỉ MeCare operator sửa lúc onboarding. Yêu cầu mới: kịch bản phải lưu trong **Baserow CRM** để **chủ hiệu thuốc tự sửa trực tiếp** theo nhu cầu; n8n điều phối đọc template từ Baserow — đúng tinh thần **nguồn sự thật duy nhất**.

**Bằng chứng cụ thể:**
- `architecture.md:219` — `Kịch bản RAG: openclaw/kichban/ — 1 file/nhóm, tên nhom-<n>-<ten>.md` (file-based).
- `epics.md:65` (AR-5) — `RAG nguồn = openclaw/kichban/ (1 file/nhóm)`.
- `epics.md:223` (Story 1.4) — sửa kịch bản vào `openclaw/kichban/`, người duyệt = chủ sản phẩm/MeCare, không self-serve.
- `architecture.md:157` (proactive) — `n8n cron → query Baserow CareSchedule → điền template cứng` — template không nằm ở Baserow.

**Quyết định đã chốt với Tinsu:**
- Cổng duyệt: **Draft → chủ hiệu thuốc tự duyệt** (kèm cảnh báo R2 + lưu version/audit).
- Phạm vi Baserow: **Cả hai** — template proactive (FR-3/Story 4.1) + nội dung FAQ reactive (FR-7/Story 5.1).

---

## 2. Phân tích tác động (Impact Analysis)

### 2.1 Epic Impact

| Epic | Tác động | Mức |
|------|----------|-----|
| **Epic 1 — Nền tảng** | Story 1.2 (schema) + Story 1.4 (kịch bản) đổi đích lưu trữ sang Baserow | Action-needed |
| **Epic 4 — Chăm sóc chủ động** | Story 4.1 lấy template từ Baserow thay vì file | Action-needed |
| **Epic 5 — Trả lời & leo thang** | Story 5.1 RAG nguồn = Baserow + re-index khi đổi | Action-needed |
| **Epic 6 — CRM & Dashboard** | Thêm view/story quản lý kịch bản cho chủ hiệu thuốc (self-edit + tự duyệt) | Action-needed (story mới) |
| **Epic 7 — Onboarding** | Story 7.1 runbook: seed kịch bản vào Baserow thay vì copy file | Minor edit |
| Epic 2, 3 | Không tác động | N/A |

### 2.2 Story Impact (chi tiết ở §4)
- Sửa: **1.2, 1.4, 4.1, 5.1, 7.1**.
- Thêm mới: **6.3** (Quản lý & tự duyệt kịch bản — chủ hiệu thuốc).

### 2.3 Artifact Conflicts
- **Architecture:** AR-5 (nguồn RAG/template), AR-9 (project structure — `openclaw/kichban/` không còn là nguồn sự thật), §Baserow entities (thêm bảng), §luồng proactive (line 157), §Boundaries data (line 338).
- **PRD:** §4.5 CRM (thêm quản lý kịch bản), FR-3/FR-7 (nguồn = Baserow), định nghĩa "Kịch bản chăm sóc" (line 105).
- **UI/UX:** Không có spec UX riêng (v1 dùng Baserow UI) → chỉ thêm Baserow views, không cần wireframe mới.

### 2.4 Technical Impact
- **Baserow:** +2 bảng — `MessageTemplates` (proactive, per nhóm) + `FaqEntries` (reactive); mỗi bảng có field `status` (draft/approved), `version`, `updated_by`, `approved_at`.
- **n8n:** workflow proactive query template từ Baserow (chỉ `status=approved`); cache + invalidation.
- **OpenClaw RAG:** index nguồn từ Baserow (qua webhook on-change re-index) thay vì file tĩnh; rebuild được từ Baserow (giữ đúng quy tắc memory recall-only).
- **R2 guardrail:** AI chỉ nạp record `status=approved`. Cảnh báo rõ cho chủ khi tự duyệt (chịu trách nhiệm nội dung y tế). Story 1.5 spike guardrail vẫn áp dụng — test trên nội dung Baserow.

---

## 3. Hướng xử lý đề xuất (Recommended Approach)

**Chọn: Option 1 — Direct Adjustment (sửa stories + architecture trước khi dev).**

**Lý do:**
- `sprint-status.yaml`: implementation **chưa bắt đầu** → không có code để rollback, rủi ro thấp nhất khi sửa ở tầng planning.
- Thay đổi không phá vỡ MVP, không bỏ epic nào — chỉ đổi nguồn sự thật của kịch bản (file → Baserow) và thêm năng lực self-edit.
- Phù hợp tinh thần "nguồn sự thật duy nhất" mà architecture đã chọn cho Baserow.

**Effort:** Medium · **Risk:** Medium (phải giữ cổng duyệt R2) · **Timeline:** không trễ — sửa trước khi code Epic 1.

Phương án loại trừ:
- Option 2 (Rollback): N/A — chưa có code.
- Option 3 (MVP review): không cần — MVP vẫn đạt; đây là tinh chỉnh nguồn dữ liệu, không cắt scope.

---

## 4. Đề xuất sửa chi tiết (Detailed Change Proposals)

### 4.1 Architecture — AR-5 (Guardrail Hybrid)
**File:** `epics.md:65` & `architecture.md:175`

**OLD:**
> Proactive = template cứng (n8n điền từ kịch bản, agent không sinh tự do); reactive FAQ = agent + RAG kịch bản đã duyệt... RAG nguồn = `openclaw/kichban/` (1 file/nhóm).

**NEW:**
> Proactive = template cứng (n8n điền từ template kịch bản, agent không sinh tự do); reactive FAQ = agent + RAG kịch bản đã duyệt... **Nguồn sự thật kịch bản = Baserow** (bảng `MessageTemplates` + `FaqEntries`, chỉ record `status=approved`). RAG/template re-index từ Baserow qua webhook on-change. `openclaw/kichban/` (nếu giữ) chỉ là cache phái sinh, rebuild được từ Baserow.

**Rationale:** Chủ hiệu thuốc tự sửa → nguồn phải là Baserow (1 nguồn sự thật), không phải file tĩnh.

### 4.2 Architecture — Baserow entities & project structure (AR-9)
**File:** `architecture.md:135` (entities), `:219`, `:304`, `:346` (`openclaw/kichban/`)

**Thay đổi:** Thêm vào danh sách entities Baserow:
- `MessageTemplates`: `nhom`, `cadence_type`, `body_template` (placeholder), `status` (draft/approved), `version`, `updated_by`, `approved_at`.
- `FaqEntries`: `nhom`/`scope`, `question`, `answer`, `mandatory_suffix` (TPCN), `status`, `version`, `updated_by`, `approved_at`.

Sửa mọi tham chiếu `openclaw/kichban/` làm "nguồn" → "cache phái sinh từ Baserow".

**Rationale:** Đồng bộ data boundary `architecture.md:338` (Baserow authoritative).

### 4.3 Story 1.2 — Khởi tạo Baserow schema
**Section:** Acceptance Criteria

**THÊM AC:**
> **Given** schema Baserow
> **When** tạo bảng
> **Then** có bảng `MessageTemplates` và `FaqEntries`, mỗi bảng có field `status` (draft/approved), `version`, `updated_by`, `approved_at`; seed nội dung 6 nhóm từ `kichban-chamsoc-khachhang.md` (sau khi viết lại persona Hải ở Story 1.4) với `status=draft`.

**Rationale:** Schema phải chứa kịch bản + cổng duyệt ngay từ nền tảng.

### 4.4 Story 1.4 — Sửa & duyệt kịch bản "Dược Sĩ Hải"
**File:** `epics.md:223`

**OLD AC:** chuyển hóa sang `openclaw/kichban/` (1 file/nhóm); chủ sản phẩm rà duyệt → đánh dấu "đã duyệt".

**NEW AC:**
> **When** chuyển hóa kịch bản sang **Baserow** (`MessageTemplates` + `FaqEntries`, không phải file)
> **Then** mỗi record persona "Dược Sĩ Hải" + mô hình relay, `status=draft`
> **Given** kịch bản trong Baserow **When** duyệt **Then** đặt `status=approved` + ghi `approved_at`/`approved_by` trước khi dùng tải thật (chặn go-live).

**Rationale:** Đích lưu trữ đổi sang Baserow; giữ cổng duyệt G1.

### 4.5 Story 4.1 — Soạn tin chủ động từ template
**File:** `epics.md:428`

**NEW AC:**
> **Given** khách thuộc một nhóm **When** soạn tin **Then** n8n lấy `body_template` từ Baserow `MessageTemplates` (chỉ `status=approved`, đúng nhóm); điền placeholder từ hồ sơ; agent KHÔNG sinh tự do; nếu không có template approved cho nhóm → KHÔNG gửi + cảnh báo.

**Rationale:** Template từ Baserow, enforce cổng duyệt ở tầng gửi.

### 4.6 Story 5.1 — Trả lời FAQ trong phạm vi kịch bản
**File:** `epics.md:511`

**NEW AC:**
> **Given** FAQ trong Baserow `FaqEntries` (`status=approved`) **When** agent trả lời **Then** RAG chỉ index record approved; re-index khi Baserow webhook báo đổi; TPCN luôn kèm `mandatory_suffix`; ngoài phạm vi → leo thang.

**Rationale:** RAG nguồn = Baserow + re-index động.

### 4.7 Story MỚI 6.3 — Quản lý & tự duyệt kịch bản (chủ hiệu thuốc)
**Epic:** 6 — CRM & Dashboard

> **As** chủ hiệu thuốc
> **I want** sửa template chăm sóc + FAQ trực tiếp trên Baserow và tự bấm duyệt,
> **So that** kịch bản khớp nhu cầu nhà thuốc mà không cần MeCare can thiệp.
>
> **AC:**
> 1. Baserow view cho `MessageTemplates` + `FaqEntries` (lọc theo nhóm), chủ per-tenant token-auth chỉnh được.
> 2. Sửa → tự động về `status=draft`; chủ bấm duyệt → `status=approved`, ghi `version`/`updated_by`/`approved_at`.
> 3. **Cảnh báo R2 rõ ràng** khi duyệt: chủ chịu trách nhiệm nội dung y tế; không khuyến khích chẩn đoán/đổi liều.
> 4. Lưu version cũ (audit) — rollback được.
> 5. Chỉ record `approved` mới vào template proactive / RAG FAQ.

**Rationale:** Hiện thực hóa self-edit + cổng "draft → chủ tự duyệt".

### 4.8 Story 7.1 — Runbook onboarding (minor)
Đổi bước "copy file kịch bản vào `openclaw/kichban/`" → "seed kịch bản vào Baserow (`status=draft`), hướng dẫn chủ duyệt".

### 4.9 PRD (minor)
- `prd.md:105` định nghĩa "Kịch bản chăm sóc": thêm "lưu trên Baserow, chủ hiệu thuốc tự sửa + tự duyệt".
- §4.5 CRM: thêm năng lực quản lý kịch bản.
- FR-3/FR-7: ghi nguồn = Baserow approved.

---

## 5. Bàn giao thực thi (Implementation Handoff)

**Scope:** Moderate — cần sắp xếp lại backlog (thêm story, sửa AC nhiều story).

**Bàn giao:**
1. **Product Owner / Dev** — cập nhật `epics.md` (Story 1.2, 1.4, 4.1, 5.1, 6.3 mới, 7.1) + `sprint-status.yaml` (thêm 6.3).
2. **Architect (hoặc Dev kiêm)** — cập nhật `architecture.md` AR-5, AR-9, Baserow entities, luồng proactive, data boundary.
3. **Dev** — khi code Epic 1: tạo bảng Baserow `MessageTemplates`/`FaqEntries` + status field; Epic 4/5 đọc từ Baserow; Epic 6 view self-edit.

**Success criteria:**
- Kịch bản (template + FAQ) sống trong Baserow, là nguồn sự thật duy nhất.
- Chủ hiệu thuốc sửa + tự duyệt qua Baserow; chỉ `approved` được AI dùng.
- n8n proactive + OpenClaw RAG đều đọc từ Baserow; `openclaw/kichban/` chỉ còn là cache (nếu giữ).
- Cổng duyệt + audit version giữ nguyên tinh thần R2.

---

## 6. Checklist status

- §1 Trigger & Context — [x] Done
- §2 Epic Impact — [x] Done
- §3 Artifact Conflict — [x] Done (UX N/A — không có spec riêng)
- §4 Path Forward — [x] Done (Option 1 Direct Adjustment)
- §5 Proposal Components — [x] Done
- §6 Final Review & Handoff — chờ Tinsu duyệt
