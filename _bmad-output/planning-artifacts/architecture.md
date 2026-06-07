---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-06-06'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/prd.md
  - _bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/addendum.md
  - _bmad-output/planning-artifacts/briefs/brief-MeCare-2026-06-05/brief.md
  - _bmad-output/planning-artifacts/briefs/brief-MeCare-2026-06-05/addendum.md
workflowType: 'architecture'
project_name: 'MeCare'
user_name: 'Tinsu'
date: '2026-06-06'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (16 FR, 6 nhóm tính năng):**

| Nhóm FR | FR | Ngụ ý kiến trúc |
|---|---|---|
| Thu thập & phân nhóm tại quầy | FR-1, FR-2 | Form nhập liệu nhanh (≤20s) ghi vào Baserow; logic gợi ý nhóm từ loại thuốc; cảnh báo SĐT trùng |
| Chăm sóc chủ động theo nhóm | FR-3, FR-4, FR-5, FR-6 | Scheduler theo cadence riêng 6 nhóm; engine soạn tin (Hermes) điền placeholder từ hồ sơ; enforce rate-limit per-nhóm + trần gói 1.000 tin/tháng; counter theo tháng/nhà thuốc; tôn trọng opt-out |
| Trả lời & leo thang relay | FR-7, FR-8, FR-9, FR-10 | Trả lời FAQ trong kịch bản; trigger detection; state machine ca leo thang có **mã ca** duy nhất; relay 2 chiều Zalo chăm sóc ↔ Zalo dược sĩ thật; timeout/fallback không treo ca; lưu toàn bộ hội thoại |
| Lớp Zalo Cá Nhân an toàn | FR-11, FR-12, FR-13 | Send/receive qua openzalo/openzca (web automation); chỉ nhắn khách opt-in; jitter + trần gửi/ngày + giờ hành chính + warm-up + biến thể nội dung; giám sát phiên + cảnh báo khi automation hỏng |
| CRM & Dashboard | FR-14, FR-15 | Baserow: hồ sơ khách, lọc theo nhóm, lịch sử hội thoại; dashboard chỉ số (tin đã gửi vs trần, số ca leo thang, khách theo nhóm) |
| Onboarding thủ công | FR-16 | Quy trình setup tận tay per nhà thuốc: kết nối Zalo, nạp/duyệt kịch bản, khởi tạo CRM, cấu hình relay, warm-up |

**Non-Functional Requirements (định hình kiến trúc):**
- **Anti-ban Zalo (R1, rủi ro cao nhất):** nhịp giống người (jitter, trần tin/ngày, chỉ giờ hành chính), warm-up tài khoản mới, biến thể nội dung tin, auto-throttle theo tín hiệu rủi ro (tỉ lệ chặn/báo xấu/gửi lỗi). Trần gói 1.000 tin/tháng vừa là điểm giá vừa là van an toàn.
- **An toàn y tế (R2):** AI chỉ nói trong kịch bản đã duyệt; không chẩn đoán, không tự đổi liều/thuốc; trigger leo thang chặt + catch-all "không chắc → dược sĩ"; cấp cứu → khuyến cáo 115 song song, không phụ thuộc relay.
- **SLA relay:** câu hỏi thường < 5 phút trong giờ; phản ứng có hại → leo thang ngay; timeout không để ca treo im lặng (ngưỡng phút chốt khi vận hành — Open Q7).
- **Fragility web automation (R4):** phụ thuộc DOM/giao diện web Zalo; giám sát phiên, không mất tin âm thầm (queue hoặc báo lỗi rõ).
- **Data governance:** dữ liệu sức khỏe khách lưu trên Baserow — chính sách lưu trữ/bảo mật cần chốt ở architecture.

**Scale & Complexity:**
- Primary domain: **backend automation/integration (event-driven)** + CRM web nhẹ.
- Complexity level: **Trung bình–cao** — không do quy mô tải (≤10 nhà thuốc, ≤1.000 tin/tháng/nhà thuốc) mà do 3 điểm rủi ro tích hợp: (1) Zalo web automation không chính thức, (2) human-in-the-loop relay đồng thời nhiều ca, (3) ranh giới an toàn y tế.
- Multi-tenancy: **có** — mỗi nhà thuốc 1 phiên Zalo + persona riêng + counter/quota riêng; cô lập tenant quan trọng (1 phiên hỏng không kéo tenant khác).
- Estimated architectural components: ~7 (CRM/DB, scheduler, AI compose engine, trigger/escalation engine, Zalo send/receive layer, session monitor, dashboard).

### Technical Constraints & Dependencies

Stack đã neo trong brief + PRD addendum (architecture làm rõ *cách ghép*, không chọn lại nền tảng trừ khi tìm thấy chặn đường):
- **Điều phối:** n8n workflows.
- **Tác vụ AI:** Hermes agent (Nous Research) — soạn tin/hội thoại theo kịch bản.
- **CRM/DB:** Baserow — nguồn sự thật cho FR-10, FR-14, FR-15.
- **Kênh khách:** Zalo Cá Nhân (không OA) mang danh persona, qua plugin openzalo/openzca (automation bản web Zalo).
- Repo hiện trạng: greenfield cho backend sản phẩm — mới có `website/` (sales kit), `videos/` (Remotion), `kichban-chamsoc-khachhang.md`. Backend n8n/Baserow/Zalo/Hermes chưa code.

### Cross-Cutting Concerns Identified

- **Idempotency + correlation theo mã ca** — chống map nhầm ca leo thang đồng thời (adversarial review từng flag race condition).
- **Quản lý phiên Zalo per-tenant** + phục hồi khi mất kết nối / Zalo đổi UI.
- **Rate-limit/quota kế toán nhiều tầng** — per-khách, per-nhóm, per-nhà thuốc/tháng (trần gói).
- **Lập lịch theo timezone / giờ hành chính** nhà thuốc.
- **Observability/alerting** cho vận hành solo (Tinsu) — cảnh báo phiên hỏng, ca treo, chạm trần.
- **Bảo mật dữ liệu sức khỏe** trên Baserow (data governance).

## Starter / Foundation Evaluation

### Primary Technology Domain

Backend automation/integration (event-driven) + agent gateway + CRM web nhẹ. **Không phải greenfield `create-app`** — runtime stack đã được neo trong PRD/brief; "foundation" = cách dựng & ghép nền tảng self-hosted, không phải scaffold code.

### Stack hiện trạng đã verify (web, Jun 2026)

| Thành phần | Trạng thái | Vai trò trong foundation chốt |
|---|---|---|
| **OpenClaw** | Self-hosted agent gateway; agent-native (tool use, sessions, memory, multi-agent routing); channel + memory + tool + provider plugin architecture | **Lõi** — channel Zalo + agent hội thoại + memory |
| **openzalo / openzca** | openzca = CLI build trên zca-js (mô phỏng browser Zalo Web, unofficial, rủi ro ToS, MIT); openzalo = channel plugin TypeScript của OpenClaw, cần openzca trong PATH | **Channel Zalo** cho OpenClaw (gửi/nhận tin khách) |
| **n8n** | v2.0, Community Edition free, Docker, queue mode, webhooks | **Scheduler** — cron cadence 6 nhóm + enforce quota/trần gói |
| **Baserow** | v1.30.x self-hosted, REST API token-auth, webhooks, unlimited self-hosted | **CRM/DB authoritative** — hồ sơ, nhóm, counter, ca leo thang, dashboard |
| **Hermes agent** | Python agent framework riêng (trùng vai với OpenClaw) | **Bỏ như runtime riêng** (xem quyết định dưới) |

### Selected Foundation: OpenClaw-trung tâm (hướng B)

**Rationale:** lấy channel Zalo (openzalo) + agent + memory sẵn có, giảm tự viết lớp Zalo và lớp recall; đáp ứng yêu cầu Tinsu "memory layer nhớ toàn bộ hoạt động hiệu thuốc". Đánh đổi đã chấp nhận: thêm OpenClaw làm thành phần lõi (PRD addendum chưa duyệt — ghi lý do tại đây), và phải siết guardrail an toàn y tế vì agent linh hoạt khó ép "chỉ nói trong kịch bản" hơn luồng cứng.

**Sơ đồ foundation:**

```
Khách ──Zalo── [openzalo channel] ─┐
                                    ▼
                        OpenClaw Gateway (agent + memory layer)
                          │   ├─ persona "Dược Sĩ Hải" trả lời (model qua provider plugin)
                          │   ├─ phát hiện trigger → relay sang Zalo dược sĩ thật
                          │   └─ Memory layer self-host (SQLite + sqlite-vec) — nhớ hoạt động hiệu thuốc
                          ▼
        ghi structured ──▶ Baserow (CRM / dashboard / quota — nguồn sự thật)
                          ▲
        cron / cadence ─── n8n (đẩy tin chủ động theo lịch 6 nhóm + enforce trần gói)
```

### Quyết định nền tảng (chốt với Tinsu)

1. **Hermes agent — BỎ như runtime riêng.** OpenClaw tự là agent; model cắm qua provider plugin (Hermes model / Claude / local đều được). Bớt 1 tầng trùng vai. *Lệch PRD addendum — lý do: tránh 2 agent runtime chồng nhau.*
2. **n8n — GIỮ, thu hẹp vai trò = scheduler.** OpenClaw reactive (chỉ phản hồi tin đến); chăm sóc CHỦ ĐỘNG theo lịch (nhắc thuốc, refill, tái khám) cần cron → n8n. n8n không điều phối hội thoại, chỉ lập lịch + enforce quota/trần gói + trigger gửi tin chủ động.
3. **Baserow — GIỮ làm nguồn sự thật structured + dashboard.** Memory layer là recall ngữ nghĩa phái sinh, rebuild được từ Baserow. Quy tắc: Baserow authoritative; memory chỉ để agent nhớ/tra, không giữ số liệu dashboard cần.
4. **Memory engine — built-in SQLite + sqlite-vec, self-host.** Dữ liệu sức khỏe = PII nhạy cảm → **bắt buộc self-host**; TRÁNH Mem0/Pinecone cloud (vướng §11.2 data governance). Knowledge-graph plugin để dành nếu cần suy luận quan hệ về sau.

### Deployment foundation

- **Docker Compose self-host**, 1 VPS: services `openclaw` + `n8n` + `postgres` (n8n + Baserow dùng chung engine, schema riêng) + `baserow` + `zalo-bridge` (openzca per-tenant) + memory store (SQLite local trong OpenClaw).
- Ngôn ngữ: low-code n8n (JS function node khi cần) + TS (openzalo/openzca) + Python (OpenClaw core) + provider model.
- Per-tenant cô lập phiên Zalo (1 phiên hỏng không kéo tenant khác).
- Secrets: env per-tenant / external secrets; không CI/CD nặng ở v1 (≤10 tenant, vận hành solo).
- **Initialization story đầu tiên:** dựng Docker Compose stack + cấu hình openzalo channel + memory plugin self-host cho 1 tenant (Trúc Tâm).

### Rủi ro foundation phải xử ở bước sau

- **R2 an toàn y tế khó hơn:** agent OpenClaw linh hoạt → cần guardrail tầng tool/prompt ép "chỉ nói trong kịch bản duyệt", chặn tự sáng tác y tế (giải ở step 4/5).
- **Dual source of truth Baserow vs memory:** ranh giới phải cứng (giải ở step 4).
- **Phụ thuộc OSS phát triển nhanh** (OpenClaw, zca-js) + rủi ro ToS Zalo (R1) vẫn nguyên.

**Note:** Foundation này LỆCH PRD addendum §1 (vốn nêu n8n điều phối + Hermes AI, không nêu OpenClaw). Cần phản ánh ngược lại PRD addendum trước go-live.

## Core Architectural Decisions

### Decision Priority

**Critical (chặn implementation):** platform composition (OpenClaw lõi), model AI + PII strategy, guardrail y tế, relay correlation theo mã ca, multi-tenancy isolation.
**Important:** Baserow schema, n8n scheduler model, anti-ban throttle placement, observability solo.
**Deferred (post-MVP):** knowledge-graph memory, gói giá thứ 2, đa channel Zalo OA, billing tự động.

### Data Architecture

- **Baserow = nguồn sự thật structured.** Entities lõi:
  - `Pharmacies` (tenant: persona, Zalo session ref, quota tháng, giờ làm việc)
  - `Customers` (tên, SĐT, nhóm 1–6, opt-in Zalo, **trạng thái Nhóm 5 = cờ cắt ngang không xóa nhóm gốc** — giải Open Q6)
  - `Medications/Purchases`
  - `CareSchedule` (lịch nhắc due theo cadence nhóm)
  - `Messages` (mọi tin: chủ động / trả lời / leo thang / phương án dược sĩ — FR-10)
  - `EscalationCases` (mã ca, trigger, nội dung khách, phương án, trạng thái, timestamp)
  - `QuotaCounter` (tin/tháng/tenant — trần gói)
  - `MessageTemplates` (template proactive per nhóm: `body_template`, `status` draft/approved, `version`, `updated_by`, `approved_at`) — **nguồn sự thật kịch bản chủ động**
  - `FaqEntries` (FAQ reactive: `question`, `answer`, `mandatory_suffix` TPCN, `status`, `version`, `updated_by`, `approved_at`) — **nguồn sự thật FAQ**
  - `CustomerGroupChanges` (audit log đổi nhóm: `changed_at`, `customer_id`, `pharmacy_id`, `from_group`, `to_group`, `changed_by` — append-only, không xóa) — **thêm Story 3.2**
- **Kịch bản = Baserow authoritative.** Chủ hiệu thuốc tự sửa + tự duyệt (draft→approved) qua Baserow UI per-tenant; chỉ `status=approved` được dùng. `openclaw/kichban/` (nếu giữ) = cache phái sinh, rebuild từ Baserow.
- **DB engine:** PostgreSQL dùng chung (Baserow + n8n schema riêng).
- **Memory layer (OpenClaw, SQLite + sqlite-vec) = phái sinh, recall-only.** Index hội thoại + hoạt động hiệu thuốc để bơm context cho agent. Rebuild được từ Baserow `Messages`. KHÔNG giữ số liệu dashboard cần (tránh dual source of truth).
- **Multi-tenancy:** phân vùng theo `pharmacy_id` mọi bảng; mỗi tenant 1 phiên Zalo + persona + quota riêng, cô lập (1 phiên hỏng không kéo tenant khác).

### Authentication & Security / Data Governance

- **PII-minimization bắt buộc** (vì model chạy cloud): prompt gửi OpenRouter dùng **mã khách ẩn danh** (token nội bộ thay tên/SĐT); không gửi định danh ra cloud. De-anonymize ở tầng gửi tin local.
- **Pin provider non-TQ trên OpenRouter** cho DeepSeek (data residency dữ liệu sức khỏe).
- Mã hóa at-rest dữ liệu sức khỏe (Postgres + memory store); host self-host, network nội bộ Docker.
- Dashboard Baserow: chỉ chủ nhà thuốc per-tenant, token-auth.

### API & Communication Patterns

- **Hội thoại (reactive):** Khách →Zalo→ openzalo channel → OpenClaw agent → trả lời / phát hiện trigger.
- **Chủ động (proactive):** n8n cron → query Baserow `CareSchedule` due → lấy **template cứng từ Baserow `MessageTemplates`** (chỉ `status=approved`, đúng nhóm) → enforce quota/rate-limit → điền placeholder (guardrail hybrid) → gửi qua openzca → ghi `Messages`. Không có template approved → không gửi + cảnh báo.
- **Relay leo thang:** OpenClaw phát trigger → tạo `EscalationCase` có **mã ca duy nhất** → gửi Zalo dược sĩ thật (kèm mã ca) → phương án về **khớp đúng mã ca** (chống race condition — adversarial review flag) → agent nhắn lại khách giữ nguyên nội dung chuyên môn → ghi Baserow. **Idempotency key = mã ca.** Timeout: n8n watchdog, ca không treo im lặng (ngưỡng phút = Open Q7).
- Component talk: Baserow REST API + webhooks; OpenClaw ↔ n8n qua HTTP/webhook; openzca CLI qua zalo-bridge.

### Frontend Architecture

- **Không build frontend riêng v1.** Dashboard + CRM = **Baserow UI/views** (lọc theo nhóm, hồ sơ, lịch sử hội thoại, chỉ số). Form nhập liệu tại quầy = Baserow form view (FR-1, ≤20s).

### Infrastructure & Deployment

- Docker Compose self-host 1 VPS: `openclaw` + `n8n` + `postgres` + `baserow` + `zalo-bridge` (openzca per-tenant) + memory (SQLite trong OpenClaw).
- **Public access — Cloudflare Tunnel** (không mở firewall port): 3 subdomain cố định, trỏ vào localhost:
  | Domain | Host port | Service | Dùng bởi |
  |--------|-----------|---------|----------|
  | `mecareapp.tinsu.ai` | `8001` | Baserow CRM | nhà thuốc truy cập hàng ngày |
  | `mecareapp-n8n.tinsu.ai` | `8002` | n8n scheduler | Tinsu admin |
  | `mecareapp-webhook.tinsu.ai` | `8003` | zalo-bridge | Zalo server POST webhook |
- **Port layout (bất biến):** internal ports `N8N_PORT=5678` và `ZALO_BRIDGE_PORT=3000` cố định (hardcode trong healthcheck). Chỉ host ports (`BASEROW_HTTP_PORT`, `N8N_HTTP_PORT`, `ZALO_BRIDGE_HOST_PORT`) là an toàn thay đổi. Xem `.env.example` PORT GUIDE section.
- **Anti-ban throttle (R1):** đặt ở **zalo-bridge** (jitter, trần tin/ngày, chỉ giờ hành chính, biến thể nội dung, warm-up) + n8n enforce trần gói 1.000/tháng. Auto-throttle theo tín hiệu rủi ro (tỉ lệ chặn/báo xấu/gửi lỗi).
- **Session monitor (FR-13):** zalo-bridge giám sát phiên openzca; mất phiên / gửi lỗi ≥3 → cảnh báo Tinsu; tin chưa gửi queue, không mất âm thầm.
- **Observability solo:** alert kênh riêng (Zalo/Telegram Tinsu) cho: phiên hỏng, ca treo quá SLA, chạm trần gói.

### AI / Agent

- **Provider:** **DeepSeek V4 Flash qua OpenRouter** (`$0.098/$0.197` per 1M, ctx 1M, MoE 284B/13B). Cắm vào OpenClaw provider plugin. Pin provider non-TQ.
- **Guardrail Hybrid (R2):** proactive = template cứng (n8n điền từ template Baserow, agent không sinh tự do); reactive FAQ = agent + **RAG kịch bản đã duyệt** + prompt guardrail + auto-leo-thang khi không chắc (catch-all FR-8). Cấp cứu → 115 song song relay.
- **Nguồn sự thật kịch bản = Baserow** (`MessageTemplates` + `FaqEntries`, chỉ `status=approved`); RAG/template re-index từ Baserow qua webhook on-change. Chủ hiệu thuốc tự sửa + tự duyệt. Seed ban đầu từ `kichban-chamsoc-khachhang.md` (cần cập nhật persona Ngọc→Hải + mô hình relay trước go-live — Open Q3).
- **Hermes agent bỏ** như runtime riêng (OpenClaw tự là agent; model qua provider).

### Decision Impact / Implementation Sequence

1. Dựng Docker Compose stack + Postgres + Baserow schema.
2. zalo-bridge + openzca cho 1 tenant (Trúc Tâm) + warm-up.
3. OpenClaw + openzalo channel + DeepSeek provider + memory layer.
4. RAG kịch bản + guardrail hybrid.
5. n8n scheduler + quota + relay watchdog (mã ca).
6. Observability / alert solo.

**Cross-component dependencies:**
- PII-min ↔ tầng de-anonymize local (gửi tin)
- Mã ca ↔ idempotency relay (chống map nhầm ca đồng thời)
- Baserow ↔ memory: ranh giới cứng (Baserow authoritative, memory recall-only)
- Quota enforce ở 2 điểm: n8n (trần gói tháng) + zalo-bridge (trần ngày/anti-ban)

## Implementation Patterns & Consistency Rules

**Điểm dễ xung đột nhận diện:** đặt tên Baserow tables/fields, đặt tên n8n workflow, format mã ca, schema payload giữa component, JSON convention, error/retry, logging, config per-tenant, convention RAG/template. Stack low-code (n8n + OpenClaw + Baserow + CLI bridge) → patterns khớp thực tế này, không phải boilerplate web.

### Naming Patterns

**Baserow (DB):**
- Table: **PascalCase số nhiều** — `Pharmacies`, `Customers`, `EscalationCases`.
- Field: **snake_case** — `pharmacy_id`, `care_group`, `opt_in_zalo`, `created_at`.
- FK: `<entity>_id` — `pharmacy_id`, `customer_id`.
- Nhóm chăm sóc: integer `1..6` field `care_group`; Nhóm 5 = boolean cờ riêng `is_complaint_active` (KHÔNG ghi đè `care_group`).

**n8n workflows:**
- Tên: `MC-<domain>-<action>` — `MC-Schedule-DueReminders`, `MC-Relay-Watchdog`, `MC-Zalo-Send`.
- Mỗi workflow 1 trách nhiệm; sub-flow gọi qua Execute Workflow.

**OpenClaw / agent:**
- Tool name: snake_case động từ — `create_escalation_case`, `lookup_customer`, `send_care_message`.
- Persona config per-tenant: `persona_<pharmacy_slug>`.

**Mã ca (correlation key):** format cố định **`ESC-<pharmacy_slug>-<YYYYMMDD>-<seq>`** — duy nhất toàn hệ, dùng làm **idempotency key** mọi nơi (Baserow, relay, log).

### Structure Patterns

- Repo layout: `docker-compose.yml` (root) · `n8n/` (workflow JSON export) · `openclaw/` (config, plugins, RAG kịch bản) · `zalo-bridge/` (TS openzca wrapper) · `baserow/` (schema migration/seed) · `docs/`.
- Kịch bản: nguồn sự thật = Baserow `MessageTemplates`/`FaqEntries`. `openclaw/kichban/` (nếu giữ) = cache RAG phái sinh, rebuild từ Baserow on-change.
- Secrets/config per-tenant: `tenants/<pharmacy_slug>.env` (KHÔNG commit).

### Format Patterns

- **JSON inter-component: snake_case** (khớp Baserow), không trộn camelCase.
- Payload event chuẩn (mọi tin nội bộ):
  ```json
  { "case_id": "ESC-...", "pharmacy_id": "...", "customer_ref": "<token ẩn danh>",
    "care_group": 1, "type": "proactive|reply|escalation|pharmacist_reply",
    "trigger": "...", "content": "...", "ts": "ISO-8601" }
  ```
- **`customer_ref` = token ẩn danh** trong mọi payload tới cloud (PII-min); de-anonymize chỉ ở zalo-bridge lúc gửi tin thật.
- Thời gian: **ISO-8601 UTC** lưu trữ; hiển thị giờ VN ở dashboard.
- Boolean: `true/false`. Tiền: integer VND.

### Communication Patterns

- Event naming: **`domain.action`** snake — `escalation.created`, `escalation.resolved`, `message.sent`, `session.lost`, `quota.reached`.
- Mọi tin gửi/nhận ghi `Messages` Baserow **trước** khi xử tiếp (audit-first, FR-10).
- Idempotency: thao tác relay/gửi check `case_id`/`message_id` tồn tại trước khi tạo (chống double-send, race condition).

### Process Patterns

- **Retry:** gửi Zalo lỗi → retry backoff (jitter), tối đa 3 → phát `session.lost` alert (FR-13); tin vào queue, KHÔNG drop âm thầm.
- **Error handling:** lỗi nghiệp vụ ghi `Messages.error` + alert Tinsu; không nuốt lỗi.
- **Trạng thái relay:** ca leo thang `open → waiting_pharmacist → resolved`; watchdog n8n quá SLA → nhắc + escalate alert, không treo.
- **Guardrail enforce:** proactive luôn qua template; reactive qua RAG + validate; "không chắc → leo thang" là default — fail-safe về phía leo thang (counter-metric SM-C2).

### Enforcement — mọi agent/dev BẮT BUỘC

- Dùng **mã ca** làm idempotency key, không tự chế ID khác.
- JSON snake_case + `customer_ref` ẩn danh khi ra cloud.
- Ghi `Messages` audit-first trước mọi side-effect.
- Quota check 2 tầng (n8n tháng + bridge ngày) trước khi gửi.
- Fail-safe: nghi ngờ y tế → leo thang, không tự trả lời.

**Anti-patterns (TRÁNH):** gửi tên/SĐT thật ra cloud · tạo ID ca tùy tiện · gửi tin không qua quota check · agent sinh tự do nội dung y tế proactive · drop tin lỗi không alert · trộn camelCase/snake_case.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
mecare/
├── README.md
├── docker-compose.yml              # orchestrate toàn stack self-host
├── .env.example                    # biến chung (KHÔNG commit .env thật)
├── .gitignore                      # ignore tenants/*.env, secrets, data volumes
│
├── tenants/                        # config per-nhà thuốc (KHÔNG commit)
│   ├── tructam.env                 # Zalo session, persona, quota, giờ làm việc
│   └── _template.env
│
├── baserow/                        # CRM/DB = nguồn sự thật
│   ├── schema/
│   │   ├── 01-pharmacies.json      # Pharmacies
│   │   ├── 02-customers.json       # Customers (care_group, is_complaint_active...)
│   │   ├── 03-medications.json     # Medications/Purchases
│   │   ├── 04-care-schedule.json   # CareSchedule (lịch due)
│   │   ├── 05-messages.json        # Messages (audit-first, FR-10)
│   │   ├── 06-escalation-cases.json# EscalationCases (mã ca)
│   │   ├── 07-quota-counter.json   # QuotaCounter
│   │   ├── 08-message-templates.json  # MessageTemplates (kịch bản chủ động)
│   │   ├── 09-faq-entries.json     # FaqEntries (FAQ reactive)
│   │   └── 10-customer-group-changes.json  # CustomerGroupChanges (audit log đổi nhóm — Story 3.2)
│   ├── seed/                       # data mẫu Trúc Tâm
│   └── views/                      # form + grid views (Story 3.1/3.2: counter-form, phone-lookup, customers-by-group, group-changes-log)
│
├── n8n/                            # SCHEDULER + relay watchdog + quota
│   └── workflows/
│       ├── MC-Schedule-DueReminders.json   # cron → query due → gửi (FR-4)
│       ├── MC-Quota-Enforce.json           # trần gói tháng (FR-5)
│       ├── MC-Relay-Watchdog.json          # timeout ca leo thang (FR-9)
│       ├── MC-Zalo-Send.json               # gọi zalo-bridge gửi tin chủ động
│       └── MC-Alert-Ops.json               # alert Tinsu (session/quota/treo)
│
├── openclaw/                       # AGENT + memory + channel Zalo
│   ├── config/
│   │   ├── gateway.yml             # channel openzalo, provider OpenRouter
│   │   ├── provider-openrouter.yml # DeepSeek V4 Flash, pin provider non-TQ
│   │   └── memory.yml              # SQLite + sqlite-vec, self-host
│   ├── plugins/
│   │   ├── openzalo/               # channel plugin (cần openzca PATH)
│   │   └── tools/                  # custom tools agent
│   │       ├── create_escalation_case
│   │       ├── lookup_customer
│   │       └── send_care_message
│   ├── kichban/                    # cache RAG phái sinh từ Baserow (1 file/nhóm)
│   │   ├── nhom-1-man-tinh.md
│   │   ├── nhom-2-otc.md
│   │   ├── nhom-3-ke-don.md
│   │   ├── nhom-4-tpcn.md
│   │   ├── nhom-5-phan-anh.md
│   │   └── nhom-6-khong-info.md
│   ├── guardrails/                 # prompt guardrail + validate y tế (R2)
│   └── prompts/                    # persona "Dược Sĩ Hải" per-tenant
│
├── zalo-bridge/                    # gửi/nhận Zalo + anti-ban + PII de-anon
│   ├── package.json                # TypeScript, wrap openzca CLI
│   ├── warmup.sh                   # warm-up tài khoản Zalo mới (documentation helper)
│   ├── src/
│   │   ├── index.ts                # HTTP server entry point + route registration
│   │   ├── send.ts                 # gửi tin (throttle, jitter, giờ HC — FR-12)
│   │   ├── opt-in-gate.ts          # cổng opt-in: chỉ gửi khách đã friended (FR-11)
│   │   ├── throttle.ts             # anti-ban: trần ngày, biến thể, warm-up (FR-12)
│   │   ├── risk-monitor.ts         # sliding-window rủi ro, auto-pause, alert (FR-12)
│   │   ├── messages-client.ts      # audit trail Baserow Messages (AR-7, NFR-4)
│   │   ├── openzca-client.ts       # HTTP wrapper gọi openzca per-tenant
│   │   ├── session-monitor.ts      # giám sát phiên openzca (FR-13)
│   │   ├── listen.ts               # [FUTURE] openzca listen --raw --supervised (nhận)
│   │   └── deanonymize.ts          # [FUTURE] token ẩn danh → tên/SĐT thật lúc gửi
│   └── tenants/                    # phiên openzca per-tenant (cô lập)
│
├── docs/
│   ├── architecture.md             # tài liệu này (bản gốc ở _bmad-output)
│   ├── runbook-onboarding.md       # quy trình setup tận tay (FR-16)
│   └── data-governance.md          # chính sách PII sức khỏe (§11.2)
│
└── scripts/
    └── backup.sh                   # backup Postgres + memory store
```

### Architectural Boundaries

- **API boundaries:** Baserow REST API (token per-tenant) = data layer duy nhất; n8n ↔ zalo-bridge qua HTTP nội bộ; OpenClaw ↔ zalo-bridge qua channel plugin; OpenClaw ↔ OpenRouter = egress DUY NHẤT ra cloud (qua PII-min).
- **Component boundaries:** OpenClaw = hội thoại reactive + memory; n8n = lịch + quota + watchdog (KHÔNG điều phối hội thoại); zalo-bridge = lớp Zalo + anti-ban + de-anon (điểm DUY NHẤT biết PII thật khi gửi cloud-bound data); Baserow = nguồn sự thật + UI.
- **Data boundaries:** Baserow authoritative; OpenClaw memory recall-only (rebuild được); cloud chỉ thấy `customer_ref` ẩn danh.
- **Tenant boundary:** phân vùng `pharmacy_id`; phiên Zalo + persona + quota cô lập per-tenant.

### Requirements → Structure Mapping

| FR | Sống ở |
|---|---|
| FR-1, FR-2 (nhập/phân nhóm) | `baserow/views/` form + `openclaw/plugins/tools/lookup_customer` |
| FR-3 (soạn tin) | Baserow `MessageTemplates` (approved) + n8n điền placeholder (proactive) / agent RAG `FaqEntries` (reactive) |
| FR-4 (lập lịch) | `n8n/workflows/MC-Schedule-DueReminders` + Baserow `CareSchedule` |
| FR-5 (rate/trần gói) | `n8n/MC-Quota-Enforce` + `zalo-bridge/throttle.ts` |
| FR-6 (phản hồi/opt-out) | OpenClaw agent + Baserow `Customers` |
| FR-7 (FAQ) | OpenClaw agent + RAG trên Baserow `FaqEntries` (approved) |
| FR-8 (trigger) | `openclaw/guardrails/` + agent |
| FR-9, FR-10 (relay/lưu) | `create_escalation_case` + `n8n/MC-Relay-Watchdog` + Baserow `EscalationCases`/`Messages` |
| FR-11, FR-12, FR-13 (Zalo an toàn) | `zalo-bridge/` toàn bộ |
| FR-14, FR-15 (CRM/dashboard) | `baserow/views/` |
| FR-16 (onboarding) | `tenants/` + `zalo-bridge/warmup.sh` + `docs/runbook-onboarding.md` |

### Integration / Data Flow

- **Proactive:** n8n cron → Baserow due query → quota check → template → zalo-bridge send → ghi `Messages`.
- **Reactive:** khách →Zalo→ listen → OpenClaw agent (RAG + guardrail) → reply qua bridge / tạo `EscalationCase`.
- **Relay:** trigger → `EscalationCase` (mã ca) → bridge gửi dược sĩ thật → phương án về (khớp mã ca) → agent reply khách → Baserow.
- **External integrations:** OpenRouter (DeepSeek, PII-min) · Zalo Web (openzca) · alert kênh Tinsu.

## Architecture Validation Results

### Coherence Validation ✅
- **Decision compatibility:** OpenClaw (agent+memory+channel) + n8n (scheduler) + Baserow (CRM) + zalo-bridge (openzca) + DeepSeek/OpenRouter — không xung đột. Vai trò tách bạch, không trùng (Hermes bỏ để tránh 2 agent runtime).
- **Pattern consistency:** snake_case JSON khớp Baserow field; mã ca làm idempotency key xuyên suốt relay; PII-min nhất quán với boundary "zalo-bridge = điểm duy nhất biết PII thật".
- **Structure alignment:** cây thư mục map đúng component boundary; mỗi FR có nơi sống rõ ràng.

### Requirements Coverage Validation
- **FR coverage:** ✅ 16/16 FR có nơi kiến trúc (xem bảng map §Project Structure). Không FR nào mồ côi.
- **NFR coverage:**
  - ✅ Anti-ban (R1): throttle bridge + trần gói n8n + warm-up + session monitor.
  - ✅ An toàn y tế (R2): guardrail hybrid + RAG + fail-safe leo thang.
  - ✅ Data governance: PII-min + self-host memory + pin provider non-TQ + mã hóa at-rest.
  - ⚠️ SLA relay timeout: cơ chế watchdog có, **ngưỡng phút chưa chốt** (Open Q7).
  - ✅ Fragility web (R4): session monitor + queue không mất tin.

### Implementation Readiness Validation
- **Decision completeness:** ✅ critical decisions có version (DeepSeek V4 Flash, n8n 2.0, Baserow 1.30.x, OpenClaw).
- **Structure completeness:** ✅ cây đầy đủ, boundary rõ.
- **Pattern completeness:** ✅ naming/format/communication/process đủ; ví dụ + anti-pattern có.

### Gap Analysis Results

**Critical gaps (chặn go-live, KHÔNG chặn bắt đầu code):**
- ~~**G1 — Kịch bản nguồn chưa duyệt + persona cũ "Ngọc"**~~ ✅ **ĐÓNG (Story 1.4, 2026-06-06):** Toàn bộ 746 dòng chuyển hóa sang persona "Dược Sĩ Hải" + mô hình relay. MessageTemplates (6 nhóm) + FaqEntries (9 scope) nạp vào Baserow seed với câu an toàn y tế nguyên văn. Duyệt live (`status=approved`) là bước vận hành còn lại — không chặn dev Epic 2.
- ~~**G2 — OpenClaw ép guardrail y tế CHƯA chứng minh.**~~ ✅ **ĐÓNG (Story 1.5, 2026-06-06):** Spike GO — `escape_rate=0.0%` (stub adapter), `false_escalation_rate=20%` (ngưỡng chấp nhận cho spike). Guardrail không để agent sáng tác ngoài kịch bản. Báo cáo: `docs/spike-guardrail-g2.md`. Live run với `OPENROUTER_API_KEY` là validation thêm.

**Important gaps:**
- **G3 — Ngưỡng Zalo thực** (tin/ngày, kết bạn/ngày) chưa có nguồn (Open Q2) → throttle cấu hình tạm, hiệu chỉnh khi vận hành.
- **G4 — SLA timeout relay (phút)** chưa chốt (Open Q7).
- **G5 — Bảng token/tin gốc** (Open Q1) → dù DeepSeek rất rẻ, vẫn cần xác nhận biên gói 1.000 tin & pricing.
- ~~**G6 — openzalo channel ↔ OpenClaw multi-tenant chưa kiểm.**~~ ✅ **ĐÓNG (Story 1.6, 2026-06-06):** Spike GO — `isolation_rate=1.00`, `cross_tenant_bleed_count=0`. **Phát hiện quan trọng:** openzca (zca-js@3.x) là single-session-by-design — 1 process = 1 SĐT Zalo. Multi-tenant yêu cầu **supervisor model**: 1 openzca process per tenant, zalo-bridge orchestrate spawn/restart, OpenClaw route theo `pharmacy_id`. Kiến trúc vẫn GO. Báo cáo: `docs/spike-multi-tenant-g6.md`. Per-process isolation thật triển khai ở Epic 2.

**Nice-to-have:** knowledge-graph memory; backup/restore tự động; CI export n8n workflow.

### Validation Issues Addressed
- ✅ 2 critical gap (G1, G2) đã đóng (Epic 1, Story 1.4 + 1.5). G6 (important) đã đóng (Story 1.6) với phát hiện supervisor model. G3/G4/G5 còn mở — có giải pháp tạm, chốt khi vận hành.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** ✅ READY — 16/16 checklist `[x]`. Critical gaps G1 + G2 đã đóng (Epic 1). G6 đã đóng với supervisor model finding. G3/G4/G5 còn mở nhưng không chặn Epic 2. *[Updated 2026-06-06 sau Epic 1 retrospective]*
**Confidence Level:** Medium-High.
**Key Strengths:** vai trò component tách bạch; PII boundary 1 điểm; mã ca idempotency chặn race; guardrail hybrid fail-safe; self-host PII.
**Areas for Future Enhancement:** knowledge-graph memory; lộ trình dự phòng Zalo OA; tự động hóa onboarding khi >10 tenant.

### Implementation Handoff

**AI Agent Guidelines:**
- Tuân thủ quyết định + pattern + boundary trong tài liệu này.
- Mã ca = idempotency key; JSON snake_case; PII ẩn danh ra cloud; audit-first ghi `Messages`; fail-safe leo thang.

**First Implementation Priority:** dựng Docker Compose stack + Baserow schema + zalo-bridge 1 tenant (Trúc Tâm).

**Trước go-live phải đóng:** ✅ G1 đóng (Story 1.4) · ✅ G2 đóng (Story 1.5) · ✅ G6 đóng (Story 1.6). Còn lại: duyệt kịch bản live (`status=approved`, bước vận hành Story 1.4) + live run guardrail với `OPENROUTER_API_KEY`.
