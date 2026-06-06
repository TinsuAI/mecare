---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/prd.md
  - _bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/addendum.md
  - _bmad-output/planning-artifacts/architecture.md
---

# MeCare - Epic Breakdown

## Overview

Tài liệu này cung cấp bản phân rã epic và story đầy đủ cho MeCare, chuyển hóa các yêu cầu từ PRD, PRD Addendum và Architecture thành các story khả thi để Developer agent thực thi. (Không có UX Design Spec — dashboard/CRM dùng Baserow UI, không build frontend riêng ở v1.)

## Requirements Inventory

### Functional Requirements

**Nhóm 4.1 — Thu thập & phân nhóm khách tại quầy**
- **FR-1:** Nhập liệu khách tại quầy — nhân viên tạo hồ sơ khách mới (tên, SĐT, thuốc/sản phẩm đã mua, tình trạng/ghi chú, nhóm chăm sóc); tạo hồ sơ tối thiểu ≤20s; cảnh báo SĐT trùng + cho cập nhật hồ sơ cũ; trường ghi chú tự do, không bắt buộc. Realizes UJ-4.
- **FR-2:** Phân nhóm khách vào đúng 1 trong 6 Nhóm chăm sóc — có thể gợi ý nhóm từ loại thuốc; mỗi khách thuộc đúng 1 nhóm tại 1 thời điểm, đổi nhóm ghi log; logic gợi ý (kê đơn→N3, mãn tính→N1 override, TPCN→N4, OTC→N2, không đủ info→N6 với 5 tình huống). Realizes UJ-1, UJ-4.

**Nhóm 4.2 — Chăm sóc chủ động theo nhóm**
- **FR-3:** Soạn tin chăm sóc theo kịch bản nhóm — tự soạn tin dựa trên nhóm + hồ sơ + mẫu kịch bản đã duyệt; điền đúng placeholder; thiếu dữ liệu bắt buộc thì không gửi; giọng persona thống nhất; không tự sáng tác tư vấn y tế ngoài kịch bản. Realizes UJ-1, UJ-2.
- **FR-4:** Lập lịch & gửi đúng nhịp theo nhóm — gửi đúng cadence từng nhóm (nhắc thuốc sáng/tối, follow-up theo mốc ngày, refill/tái khám trước hạn); chỉ gửi trong giờ hành chính; Nhóm 1 hỏi thăm sau 1–2 tiếng nếu chưa xác nhận. Realizes UJ-1, UJ-2.
- **FR-5:** Áp trần rate limit từng nhóm và trần gói — không vượt rate limit nhóm/khách, không vượt trần gói 1.000 tin/tháng/nhà thuốc; vượt → hoãn/bỏ + ghi log; chạm trần gói → dừng tin chủ động (không chặn Nhóm 5) + cảnh báo; đếm theo chu kỳ tháng/nhà thuốc, hiển thị dashboard.
- **FR-6:** Tôn trọng phản hồi & quyền từ chối của khách — khách phản hồi (đánh số 1/2/3 hoặc tự do); hệ thống ghi nhận, điều chỉnh luồng, dừng nhắc khi khách yêu cầu/không còn phù hợp; Nhóm 6 không chủ động nhắn thêm trừ khi khách phản hồi. Realizes UJ-2.

**Nhóm 4.3 — Trả lời thắc mắc & leo thang dược sĩ (human-in-the-loop)**
- **FR-7:** Trả lời tự động câu hỏi thường gặp theo kịch bản — trả lời tức thì trong phạm vi kịch bản (cách dùng thuốc, dụng cụ, TPCN); thời gian phản hồi mục tiêu <5 phút trong giờ; TPCN luôn kèm câu bắt buộc nguyên văn; không chẩn đoán. Realizes UJ-2.
- **FR-8:** Phát hiện trigger leo thang — nhận diện điều kiện cần dược sĩ và dừng tự trả lời (phản ứng bất thường, chỉ số vượt ngưỡng, cờ đỏ OTC sốt >38.5°C >2 ngày, đổi thuốc đơn, tương tác/chống chỉ định, khiếu nại nghiêm trọng, catch-all "không chắc"); cấp cứu → gọi 115 ngay (vượt cả leo thang). Realizes UJ-1, UJ-3.
- **FR-9:** Relay leo thang tới Dược sĩ (thật) và phản hồi khách — thông báo ca sang Zalo dược sĩ thật (mã ca duy nhất, định danh khách, nhóm, trigger trích nguyên văn); nhận phương án, khớp đúng mã ca, AI nhắn lại khách giữ nguyên nội dung chuyên môn; khách nhận tin chờ + hướng dẫn an toàn tạm thời; timeout/fallback không treo ca; cấp cứu phát 115 song song. Realizes UJ-1, UJ-3.
- **FR-10:** Lưu toàn bộ luồng hội thoại & ca leo thang vào CRM — mọi tin (chủ động/trả lời/leo thang/phương án dược sĩ) lưu gắn hồ sơ khách; mỗi ca leo thang có bản ghi đầy đủ (thời điểm, trigger, nội dung khách, phương án, tin gửi lại); chủ nhà thuốc xem lại lịch sử + danh sách ca. Realizes UJ-3.

**Nhóm 4.4 — Lớp gửi/nhận Zalo Cá Nhân an toàn**
- **FR-11:** Chỉ nhắn khách đã opt-in kết bạn — chỉ gửi cho khách chủ động kết bạn tại quầy; không add lạnh/scrape/nhắn người lạ; hồ sơ ghi trạng thái kết bạn.
- **FR-12:** Nhịp gửi giống người & throttle chống khóa — jitter thời gian, trần gửi/ngày, trần kết bạn/ngày, chỉ giờ hành chính, warm-up; biến thể nội dung tin; theo dõi tín hiệu rủi ro (tỉ lệ chặn/báo xấu/gửi lỗi) và tự giảm tải/tạm dừng khi vượt ngưỡng.
- **FR-13:** Giám sát phiên & cảnh báo khi automation hỏng — phát hiện mất phiên / gửi lỗi ≥3 lần liên tiếp / Zalo đổi UI → cảnh báo vận hành; tin chưa gửi được không mất âm thầm (queue hoặc báo lỗi rõ).

**Nhóm 4.5 — CRM & Dashboard (Baserow)**
- **FR-14:** Hồ sơ khách & danh sách theo nhóm — xem hồ sơ từng khách (thông tin, nhóm, thuốc, lịch sử) + lọc khách theo Nhóm chăm sóc; mở hồ sơ thấy lịch sử hội thoại (FR-10) + lịch nhắc sắp tới.
- **FR-15:** Dashboard chỉ số cơ bản — hiển thị: số tin đã gửi trong tháng vs trần gói; số ca leo thang; số khách theo nhóm. (Chỉ số "hiệu quả" ở mức dữ liệu v1 cho phép.)

**Nhóm 4.6 — Onboarding & setup thủ công**
- **FR-16:** Quy trình setup tận tay cho một nhà thuốc — kết nối Tài khoản Zalo chăm sóc, nạp/duyệt kịch bản 6 nhóm, khởi tạo CRM, cấu hình Zalo dược sĩ thật cho relay, warm-up; kịch bản duyệt nội dung trước; relay kiểm thử 2 chiều trước go-live; warm-up chạy giai đoạn tải thấp trước khi mở tải đầy.

### NonFunctional Requirements

- **NFR-1 (Anti-ban Zalo — R1, rủi ro cao nhất):** Nhịp gửi giống người (jitter, trần tin/ngày, chỉ giờ hành chính), warm-up tài khoản mới, biến thể nội dung tin, auto-throttle theo tín hiệu rủi ro (tỉ lệ chặn/báo xấu/gửi lỗi). Trần gói 1.000 tin/tháng là van an toàn. (FR-5, FR-11, FR-12, FR-13)
- **NFR-2 (An toàn y tế — R2):** AI chỉ nói trong kịch bản đã duyệt; không chẩn đoán, không tự đổi liều/thuốc; quy tắc bù liều bắt buộc (không uống gấp đôi); trigger leo thang chặt + catch-all "không chắc → dược sĩ"; cấp cứu → khuyến cáo 115 song song, không phụ thuộc relay. (FR-3, FR-7, FR-8, FR-9, §11.1)
- **NFR-3 (SLA phản hồi/relay):** Câu hỏi thường <5 phút trong giờ; báo phản ứng có hại → leo thang ngay; khiếu nại chất lượng → tiếp nhận ngay, xử lý trong ngày; ngoài giờ → ghi nhận, phản hồi đầu giờ sáng hôm sau; timeout không để ca treo im lặng (ngưỡng phút chốt khi vận hành — Open Q7).
- **NFR-4 (Fragility web automation — R4):** Phụ thuộc DOM/giao diện web Zalo; giám sát phiên + cảnh báo; tin không mất âm thầm (queue hoặc báo lỗi rõ). (FR-13)
- **NFR-5 (Data governance / PII):** Dữ liệu sức khỏe lưu Baserow self-host; PII-minimization — prompt ra cloud dùng mã khách ẩn danh (`customer_ref` token), de-anonymize chỉ ở tầng local (zalo-bridge); pin provider non-TQ trên OpenRouter; mã hóa at-rest; không lưu/chia sẻ thông tin sức khỏe ra bên ngoài. (§11.2)
- **NFR-6 (Multi-tenancy isolation):** Mỗi nhà thuốc 1 phiên Zalo + persona riêng + counter/quota riêng; phân vùng `pharmacy_id` mọi bảng; 1 phiên hỏng không kéo tenant khác.
- **NFR-7 (Privacy & xử lý khiếu nại):** Khách có quyền từ chối cung cấp thông tin sức khỏe (Nhóm 6), vẫn phục vụ; khiếu nại chất lượng (Nhóm 5) thu thập ảnh sản phẩm + hộp/lọ (lô, HSD) + mô tả, cam kết đổi/hoàn/báo NSX; khuyến mãi chỉ gửi khách từng mua sản phẩm liên quan.

### Additional Requirements

(Từ Architecture — yêu cầu kỹ thuật/hạ tầng ảnh hưởng epic & story)

- **AR-1 (Foundation stack — neo cứng):** Stack OpenClaw-trung tâm: OpenClaw (agent + memory + channel) + n8n 2.0 (scheduler + quota + watchdog) + Baserow 1.30.x (CRM/DB nguồn sự thật + UI) + zalo-bridge (openzca/openzalo, web automation) + DeepSeek V4 Flash qua OpenRouter. **Hermes agent bỏ** như runtime riêng.
- **AR-2 (Initialization / Story đầu tiên):** Dựng Docker Compose stack self-host 1 VPS: `openclaw` + `n8n` + `postgres` (chung engine, schema riêng) + `baserow` + `zalo-bridge` + memory store (SQLite + sqlite-vec trong OpenClaw). Đây là foundation story bắt buộc trước mọi FR.
- **AR-3 (Baserow schema = nguồn sự thật):** Entities lõi: `Pharmacies`, `Customers` (care_group 1..6, `is_complaint_active` cờ Nhóm 5 cắt ngang KHÔNG ghi đè care_group), `Medications/Purchases`, `CareSchedule`, `Messages` (audit-first, FR-10), `EscalationCases` (mã ca), `QuotaCounter`. Naming: Table PascalCase số nhiều, field snake_case, FK `<entity>_id`.
- **AR-4 (Mã ca = correlation/idempotency key):** Format cố định `ESC-<pharmacy_slug>-<YYYYMMDD>-<seq>`, duy nhất toàn hệ, dùng làm idempotency key mọi nơi (Baserow, relay, log) — chống race condition/map nhầm ca đồng thời.
- **AR-5 (Guardrail Hybrid — R2):** Proactive = template cứng (n8n điền từ kịch bản, agent không sinh tự do); reactive FAQ = agent + RAG kịch bản đã duyệt + prompt guardrail + auto-leo-thang khi không chắc. RAG nguồn = `openclaw/kichban/` (1 file/nhóm).
- **AR-6 (Anti-ban throttle placement):** Throttle đặt ở zalo-bridge (jitter, trần ngày, biến thể, warm-up, giờ HC); n8n enforce trần gói tháng — quota check 2 tầng trước khi gửi.
- **AR-7 (Audit-first + retry):** Mọi tin gửi/nhận ghi `Messages` Baserow TRƯỚC khi xử tiếp; gửi Zalo lỗi → retry backoff jitter, tối đa 3 → phát `session.lost` alert, tin vào queue không drop; trạng thái relay `open → waiting_pharmacist → resolved` + watchdog n8n quá SLA.
- **AR-8 (Observability solo):** Alert kênh riêng (Zalo/Telegram Tinsu) cho: phiên hỏng, ca treo quá SLA, chạm trần gói.
- **AR-9 (Project structure):** Repo layout: `docker-compose.yml` · `tenants/<slug>.env` (không commit) · `baserow/schema|seed|views` · `n8n/workflows` (`MC-<domain>-<action>`) · `openclaw/config|plugins|kichban|guardrails|prompts` · `zalo-bridge/src` · `docs/` (runbook-onboarding, data-governance) · `scripts/` (warmup, backup).

**Critical gaps (chặn go-live, KHÔNG chặn bắt đầu code) — cần thành story/điều kiện:**
- **G1:** Kịch bản nguồn `kichban-chamsoc-khachhang.md` chưa duyệt + persona cũ "Ngọc" (27 dòng) + mô hình 2-vai cũ → sửa sang "Dược Sĩ Hải" + mô hình relay + duyệt trước go-live (Open Q3).
- **G2:** Spike chứng minh guardrail y tế OpenClaw ("agent không sáng tác ngoài kịch bản") trước khi tin tải thật (R2).
- **G6:** Spike kiểm openzalo channel ↔ OpenClaw multi-tenant (nhiều phiên Zalo/tenant) — plugin có thể thiết kế cho 1 account.

### UX Design Requirements

*Không có — dự án không có UX Design Spec ở v1. CRM/Dashboard/form nhập liệu dùng Baserow UI/views/form-view trực tiếp (xem FR-1, FR-14, FR-15). Thẩm mỹ persona & tone tin nhắn khách neo ở PRD §10, áp dụng trong story soạn tin (FR-3).*

### FR Coverage Map

- **FR-1:** Epic 3 — Nhập liệu khách tại quầy (tạo hồ sơ ≤20s, cảnh báo SĐT trùng).
- **FR-2:** Epic 3 — Phân nhóm khách vào đúng 1/6 Nhóm chăm sóc + logic gợi ý.
- **FR-3:** Epic 4 — Soạn tin chăm sóc theo kịch bản nhóm (template cứng).
- **FR-4:** Epic 4 — Lập lịch & gửi đúng cadence từng nhóm.
- **FR-5:** Epic 4 — Áp trần rate limit nhóm + trần gói 1.000 tin/tháng.
- **FR-6:** Epic 4 — Tôn trọng phản hồi & quyền từ chối khách.
- **FR-7:** Epic 5 — Trả lời tự động FAQ trong phạm vi kịch bản.
- **FR-8:** Epic 5 — Phát hiện trigger leo thang (cờ đỏ, catch-all "không chắc").
- **FR-9:** Epic 5 — Relay leo thang tới dược sĩ thật + phản hồi khách (mã ca).
- **FR-10:** Epic 5 — Lưu toàn bộ luồng hội thoại & ca leo thang vào CRM (audit).
- **FR-11:** Epic 2 — Chỉ nhắn khách đã opt-in kết bạn.
- **FR-12:** Epic 2 — Nhịp gửi giống người & throttle chống khóa.
- **FR-13:** Epic 2 — Giám sát phiên & cảnh báo khi automation hỏng.
- **FR-14:** Epic 6 — Hồ sơ khách & danh sách lọc theo nhóm.
- **FR-15:** Epic 6 — Dashboard chỉ số cơ bản.
- **FR-16:** Epic 7 — Quy trình setup tận tay cho một nhà thuốc.

*Cả 16 FR đều được map. Không sót.*

## Epic List

### Epic 1: Nền tảng & Khử rủi ro (Foundation)
Dựng stack self-host chạy được trên 1 VPS và chứng minh các rủi ro chí mạng trước khi xây tính năng tải thật. Sau epic này, hệ thống đứng vững (các service liên thông) và 2 spike rủi ro lớn đã có kết luận go/no-go.
*Enabling epic bắt buộc theo Architecture (AR-2) — không có user-value trực tiếp nhưng mọi epic sau phụ thuộc.*
**FRs covered:** (không trực tiếp — nền tảng)
**AR/NFR/Gap covered:** AR-1, AR-2, AR-3, AR-4, AR-9; NFR-5, NFR-6 (nền); G1 (sửa kịch bản sang "Dược Sĩ Hải" + mô hình relay + duyệt), G2 (spike guardrail y tế), G6 (spike multi-tenant Zalo ↔ OpenClaw).

### Epic 2: Lớp Zalo Cá Nhân an toàn (anti-ban — R1)
Gửi/nhận tin Zalo Cá Nhân mà không bị khóa tài khoản: chỉ nhắn khách đã opt-in, nhịp gửi giống người (jitter, trần ngày, warm-up, biến thể nội dung, giờ hành chính), tự giảm tải theo tín hiệu rủi ro, giám sát phiên và queue tin không mất âm thầm. Standalone: gửi được 1 tin test an toàn 2 chiều qua zalo-bridge.
*Tách riêng vì R1 là rủi ro lớn nhất — ranh giới rủi ro rõ, cần warm-up + kiểm thử trước khi xây messaging thật.*
**FRs covered:** FR-11, FR-12, FR-13
**AR/NFR covered:** AR-6 (throttle ở zalo-bridge), AR-7 (audit-first + retry/queue); NFR-1, NFR-4.

### Epic 3: Thu thập & phân nhóm khách tại quầy
Nhân viên nhà thuốc tạo hồ sơ khách mới tại quầy trong ≤20s (cảnh báo SĐT trùng, cho cập nhật hồ sơ cũ) và phân khách vào đúng 1 trong 6 Nhóm chăm sóc, có gợi ý nhóm theo loại thuốc. Sau epic này nhà thuốc có cơ sở dữ liệu khách phân nhóm sạch.
**FRs covered:** FR-1, FR-2 (Realizes UJ-4, UJ-1)

### Epic 4: Chăm sóc chủ động theo nhóm
Khách nhận tin chăm sóc đúng kịch bản, đúng nhịp theo nhóm (nhắc thuốc, follow-up, refill/tái khám), trong giới hạn rate-limit nhóm + trần gói 1.000 tin/tháng, và hệ thống tôn trọng phản hồi/quyền từ chối của khách.
*Build trên Epic 2 (lớp gửi) + Epic 3 (hồ sơ/nhóm).*
**FRs covered:** FR-3, FR-4, FR-5, FR-6 (Realizes UJ-1, UJ-2)
**AR/NFR covered:** AR-5 (proactive = template cứng do n8n điền); NFR-2 (phần proactive).

### Epic 5: Trả lời thắc mắc & Leo thang Dược Sĩ
Khách hỏi được trả lời tức thì trong phạm vi kịch bản đã duyệt; khi gặp trigger an toàn (cờ đỏ, đổi thuốc đơn, tương tác, khiếu nại nặng, catch-all "không chắc") hệ thống dừng tự trả lời và relay ca sang dược sĩ thật qua mã ca duy nhất, rồi nhắn lại khách giữ nguyên nội dung chuyên môn; toàn bộ luồng lưu CRM (audit-first). Cấp cứu → khuyến cáo 115 song song. Đây là core differentiator (human-in-the-loop).
*Build trên Epic 2 + Epic 3.*
**FRs covered:** FR-7, FR-8, FR-9, FR-10 (Realizes UJ-1, UJ-2, UJ-3)
**AR/NFR covered:** AR-5 (reactive = agent + RAG kịch bản + guardrail), AR-8 (alert solo); NFR-2, NFR-3.

### Epic 6: CRM & Dashboard (Baserow)
Chủ nhà thuốc xem hồ sơ từng khách (thông tin, nhóm, thuốc, lịch sử hội thoại, lịch nhắc sắp tới), lọc khách theo Nhóm chăm sóc, và xem dashboard chỉ số cơ bản (số tin đã gửi vs trần gói, số ca leo thang, số khách theo nhóm).
*Đọc dữ liệu các epic trước; dùng trực tiếp Baserow UI/views.*
**FRs covered:** FR-14, FR-15

### Epic 7: Onboarding & go-live một nhà thuốc
Quy trình setup tận tay đưa một nhà thuốc lên sản xuất: kết nối Tài khoản Zalo chăm sóc, nạp/duyệt kịch bản 6 nhóm, khởi tạo CRM, cấu hình Zalo dược sĩ thật cho relay (kiểm thử 2 chiều trước go-live), warm-up giai đoạn tải thấp trước khi mở tải đầy.
*Chốt cuối — kết hợp năng lực mọi epic trước thành quy trình go-live lặp lại được.*
**FRs covered:** FR-16
**NFR covered:** NFR-7 (privacy & xử lý khiếu nại trong onboarding/cấu hình).

### Dependency Flow
- **Epic 1** → nền cho tất cả (stack, schema, mã ca, kịch bản đã duyệt, spike go/no-go).
- **Epic 2** và **Epic 3** độc lập sau Epic 1.
- **Epic 4** và **Epic 5** cần Epic 2 (gửi/nhận an toàn) + Epic 3 (hồ sơ/nhóm).
- **Epic 6** đọc dữ liệu các epic trước.
- **Epic 7** chốt go-live, kết hợp mọi epic.

---

## Epic 1: Nền tảng & Khử rủi ro (Foundation)

**Mục tiêu:** Dựng stack self-host chạy được trên 1 VPS và chứng minh các rủi ro chí mạng trước khi xây tính năng tải thật.
**AR/NFR/Gap:** AR-1, AR-2, AR-3, AR-4, AR-9; NFR-5, NFR-6; G1, G2, G6.

### Story 1.1: Scaffold repo & Docker Compose stack self-host

As a kỹ sư vận hành MeCare,
I want một repo có cấu trúc chuẩn và một Docker Compose stack chạy được toàn bộ service nền tảng trên 1 VPS,
So that mọi epic sau có môi trường chung để build và chạy.

**Acceptance Criteria:**

**Given** repo trống
**When** áp dụng layout chuẩn theo AR-9
**Then** repo có `docker-compose.yml`, `tenants/<slug>.env` (gitignore, không commit), `baserow/{schema,seed,views}`, `n8n/workflows`, `openclaw/{config,plugins,kichban,guardrails,prompts}`, `zalo-bridge/src`, `docs/`, `scripts/`
**And** `.gitignore` chặn mọi file `tenants/*.env` và secrets

**Given** stack chưa chạy
**When** `docker compose up`
**Then** các service lên: `openclaw`, `n8n` (2.0), `postgres` (schema riêng cho n8n/baserow), `baserow` (1.30.x), `zalo-bridge`, memory store (SQLite + sqlite-vec trong OpenClaw)
**And** healthcheck mỗi service pass; OpenClaw kết nối DeepSeek V4 Flash qua OpenRouter (provider non-TQ được pin)

**Given** stack đang chạy
**When** restart VPS
**Then** mọi service tự lên lại, dữ liệu Baserow/Postgres persist qua volume

### Story 1.2: Khởi tạo Baserow schema nguồn sự thật

As a kỹ sư MeCare,
I want các bảng lõi trong Baserow theo chuẩn naming và phân vùng tenant,
So that mọi tính năng sau ghi/đọc trên một schema nhất quán, cách ly theo nhà thuốc.

**Acceptance Criteria:**

**Given** Baserow đã chạy (Story 1.1)
**When** áp dụng schema theo AR-3
**Then** tạo bảng: `Pharmacies`, `Customers`, `Medications`/`Purchases`, `CareSchedule`, `Messages`, `EscalationCases`, `QuotaCounter`
**And** naming: Table PascalCase số nhiều, field snake_case, FK `<entity>_id`

**Given** bảng `Customers`
**When** kiểm tra field
**Then** có `care_group` (1..6), `is_complaint_active` (cờ Nhóm 5 cắt ngang, KHÔNG ghi đè `care_group`), `friend_status` (opt-in kết bạn)

**Given** mọi bảng nghiệp vụ
**When** kiểm tra phân vùng
**Then** mỗi bảng có `pharmacy_id`; truy vấn mặc định lọc theo `pharmacy_id` (NFR-6 isolation)

**Given** field dữ liệu sức khỏe
**When** lưu at-rest
**Then** mã hóa at-rest bật; không có PII sức khỏe lọt ra ngoài Baserow self-host (NFR-5)

### Story 1.3: Sinh mã ca chuẩn làm idempotency key

As a kỹ sư MeCare,
I want một bộ sinh mã ca duy nhất toàn hệ theo format cố định,
So that mọi luồng relay/log/Baserow dùng chung 1 correlation key, chống race condition và map nhầm ca.

**Acceptance Criteria:**

**Given** một nhà thuốc và một ngày
**When** sinh mã ca mới
**Then** format `ESC-<pharmacy_slug>-<YYYYMMDD>-<seq>`, `seq` tăng đơn điệu trong ngày/nhà thuốc

**Given** hai yêu cầu tạo ca đồng thời cùng nhà thuốc
**When** sinh mã
**Then** không trùng `seq` (atomic), mỗi ca mã duy nhất (AR-4)

**Given** một mã ca đã tồn tại
**When** ghi lặp với cùng mã (retry)
**Then** idempotent — không tạo bản ghi trùng

### Story 1.4: Sửa & duyệt kịch bản "Dược Sĩ Hải" (G1)

As a chủ sản phẩm MeCare,
I want bộ kịch bản chăm sóc 6 nhóm được viết lại theo persona "Dược Sĩ Hải" và mô hình relay, rồi duyệt nội dung,
So that AI có nguồn kịch bản đã phê duyệt, không dùng persona cũ "Ngọc" hay mô hình 2-vai cũ.

**Acceptance Criteria:**

**Given** file nguồn `kichban-chamsoc-khachhang.md` (persona cũ "Ngọc", mô hình 2-vai)
**When** chuyển hóa sang `openclaw/kichban/` (1 file/nhóm)
**Then** mọi persona là "Dược Sĩ Hải"; mô tả luồng theo mô hình relay dược sĩ thật (không 2-vai cũ)

**Given** kịch bản từng nhóm
**When** rà nội dung an toàn y tế
**Then** TPCN kèm câu bắt buộc nguyên văn; OTC sốt có ngưỡng cờ đỏ >38.5°C >2 ngày; quy tắc bù liều "không uống gấp đôi" hiện diện

**Given** kịch bản đã viết lại
**When** chủ sản phẩm rà duyệt
**Then** đánh dấu trạng thái "đã duyệt" trước khi dùng cho tải thật (điều kiện chặn go-live, không chặn bắt đầu code — Open Q3)

### Story 1.5: Spike guardrail y tế OpenClaw (G2)

As a kỹ sư MeCare,
I want bằng chứng rằng agent OpenClaw không sáng tác tư vấn ngoài kịch bản đã duyệt,
So that ra quyết định go/no-go cho luồng reactive trước khi cho khách thật tương tác (R2).

**Acceptance Criteria:**

**Given** agent OpenClaw + RAG kịch bản đã duyệt + prompt guardrail
**When** chạy bộ câu hỏi thử (gồm câu ngoài phạm vi, câu dụ chẩn đoán, câu đòi đổi liều)
**Then** agent trả lời trong phạm vi kịch bản hoặc tự leo thang "không chắc → dược sĩ"; KHÔNG chẩn đoán, KHÔNG tự đổi liều/thuốc

**Given** kết quả spike
**When** tổng hợp
**Then** có báo cáo go/no-go + tỉ lệ thoát guardrail; nếu fail → ghi nhận biện pháp khắc phục trước khi mở Epic 5

### Story 1.6: Spike multi-tenant Zalo ↔ OpenClaw (G6)

As a kỹ sư MeCare,
I want kiểm chứng openzalo channel chạy nhiều phiên Zalo (nhiều tenant) trên một OpenClaw,
So that xác nhận kiến trúc multi-tenancy khả thi trước khi onboard nhiều nhà thuốc.

**Acceptance Criteria:**

**Given** OpenClaw + plugin openzalo (openzca CLI)
**When** khởi ≥2 phiên Zalo độc lập (2 tenant)
**Then** mỗi phiên định danh riêng, không lẫn tin giữa tenant; phân vùng theo `pharmacy_id`

**Given** 1 phiên hỏng
**When** quan sát tenant khác
**Then** tenant khác không bị kéo theo (NFR-6 isolation)

**Given** kết quả spike
**When** tổng hợp
**Then** có báo cáo go/no-go; nếu plugin chỉ thiết kế cho 1 account → ghi phương án (nhiều instance/tách tiến trình) trước khi mở rộng

---

## Epic 2: Lớp Zalo Cá Nhân an toàn (anti-ban — R1)

**Mục tiêu:** Gửi/nhận Zalo không bị khóa tài khoản; tin không mất âm thầm.
**FR:** FR-11, FR-12, FR-13 · **AR:** AR-6, AR-7 · **NFR:** NFR-1, NFR-4.

### Story 2.1: Cổng opt-in — chỉ nhắn khách đã kết bạn

As a hệ thống MeCare,
I want chỉ gửi tin cho khách đã chủ động kết bạn tại quầy,
So that không add lạnh/scrape/nhắn người lạ — giảm rủi ro bị báo xấu/khóa.

**Acceptance Criteria:**

**Given** một khách có `friend_status` chưa kết bạn
**When** hệ thống định gửi tin
**Then** chặn gửi, ghi log lý do; không có hành vi add lạnh/scrape

**Given** khách đã kết bạn tại quầy
**When** cập nhật hồ sơ
**Then** `friend_status` = đã kết bạn, đủ điều kiện nhận tin

### Story 2.2: Nhịp gửi giống người & warm-up tại zalo-bridge

As a hệ thống MeCare,
I want zalo-bridge gửi với jitter thời gian, trần gửi/ngày, trần kết bạn/ngày, chỉ giờ hành chính, có warm-up và biến thể nội dung,
So that hành vi giống người thật, tránh bị Zalo phát hiện automation (R1).

**Acceptance Criteria:**

**Given** hàng đợi tin cần gửi
**When** zalo-bridge phát tin
**Then** chèn jitter ngẫu nhiên giữa các tin; không vượt trần gửi/ngày và trần kết bạn/ngày; chỉ gửi trong giờ hành chính (AR-6)

**Given** tài khoản Zalo mới
**When** bắt đầu vận hành
**Then** chạy warm-up tải thấp tăng dần trước khi mở tải đầy

**Given** một nội dung kịch bản
**When** gửi cho nhiều khách
**Then** áp biến thể nội dung (không gửi y hệt hàng loạt)

### Story 2.3: Auto-throttle theo tín hiệu rủi ro

As a hệ thống MeCare,
I want theo dõi tỉ lệ chặn/báo xấu/gửi lỗi và tự giảm tải hoặc tạm dừng khi vượt ngưỡng,
So that phản ứng sớm trước nguy cơ khóa tài khoản.

**Acceptance Criteria:**

**Given** luồng gửi đang chạy
**When** tỉ lệ chặn/báo xấu/gửi lỗi vượt ngưỡng cấu hình
**Then** tự giảm tải hoặc tạm dừng gửi; phát alert kênh vận hành (AR-8)

**Given** tín hiệu rủi ro trở lại bình thường
**When** đủ điều kiện
**Then** cho phép nối lại gửi (thủ công hoặc tự động theo cấu hình)

### Story 2.4: Audit-first + retry/queue khi gửi

As a hệ thống MeCare,
I want mọi tin được ghi `Messages` Baserow TRƯỚC khi gửi, có retry backoff và queue khi lỗi,
So that không tin nào mất âm thầm (NFR-4) và có audit đầy đủ (AR-7).

**Acceptance Criteria:**

**Given** một tin chuẩn bị gửi
**When** xử lý
**Then** ghi bản ghi `Messages` (trạng thái pending) TRƯỚC khi gọi zalo-bridge

**Given** gửi Zalo lỗi
**When** retry
**Then** backoff có jitter, tối đa 3 lần; sau 3 lần phát `session.lost` alert và đưa tin vào queue, KHÔNG drop

**Given** tin gửi thành công
**When** hoàn tất
**Then** cập nhật trạng thái `Messages` = sent (idempotent theo id tin)

### Story 2.5: Giám sát phiên & cảnh báo automation hỏng

As a kỹ sư vận hành,
I want hệ thống phát hiện mất phiên / gửi lỗi liên tiếp / Zalo đổi UI và cảnh báo,
So that xử lý kịp trước khi luồng chăm sóc gãy âm thầm (FR-13, NFR-4).

**Acceptance Criteria:**

**Given** zalo-bridge mất phiên đăng nhập
**When** phát hiện
**Then** phát alert kênh riêng (Zalo/Telegram Tinsu); dừng gửi an toàn (AR-8)

**Given** gửi lỗi ≥3 lần liên tiếp hoặc DOM/UI Zalo đổi
**When** phát hiện
**Then** phát alert mô tả rõ nguyên nhân; tin chưa gửi nằm trong queue (không mất)

---

## Epic 3: Thu thập & phân nhóm khách tại quầy

**Mục tiêu:** Nhà thuốc có CSDL khách phân nhóm sạch, nhập nhanh tại quầy.
**FR:** FR-1, FR-2 (UJ-4, UJ-1).

### Story 3.1: Tạo hồ sơ khách tại quầy ≤20s

As a nhân viên nhà thuốc,
I want tạo hồ sơ khách mới thật nhanh ngay tại quầy,
So that không làm chậm việc bán hàng mà vẫn thu được dữ liệu chăm sóc.

**Acceptance Criteria:**

**Given** form nhập liệu Baserow tại quầy
**When** nhập tên, SĐT, thuốc/sản phẩm đã mua, tình trạng/ghi chú, nhóm chăm sóc
**Then** tạo hồ sơ tối thiểu trong ≤20s; trường ghi chú tự do, không bắt buộc

**Given** SĐT đã tồn tại trong tenant
**When** nhập trùng
**Then** cảnh báo SĐT trùng và cho cập nhật hồ sơ cũ thay vì tạo mới

**Given** hồ sơ tạo xong
**When** lưu
**Then** gắn `pharmacy_id` đúng tenant; `friend_status` ghi nhận trạng thái kết bạn

### Story 3.2: Phân khách vào đúng 1/6 Nhóm chăm sóc + log đổi nhóm

As a nhân viên nhà thuốc,
I want phân mỗi khách vào đúng một Nhóm chăm sóc với gợi ý theo loại thuốc,
So that khách nhận đúng luồng chăm sóc và phân loại nhất quán.

**Acceptance Criteria:**

**Given** khách có thông tin thuốc/sản phẩm
**When** phân nhóm
**Then** gợi ý nhóm theo logic (kê đơn→N3, mãn tính→N1 override, TPCN→N4, OTC→N2, không đủ info→N6 với 5 tình huống)

**Given** một khách tại một thời điểm
**When** kiểm tra
**Then** thuộc đúng 1 nhóm (`care_group` 1..6); cờ `is_complaint_active` (Nhóm 5) cắt ngang KHÔNG ghi đè `care_group`

**Given** đổi nhóm khách
**When** lưu thay đổi
**Then** ghi log lịch sử đổi nhóm (thời điểm, từ→đến)

---

## Epic 4: Chăm sóc chủ động theo nhóm

**Mục tiêu:** Khách nhận tin chăm sóc đúng kịch bản, đúng nhịp, trong giới hạn an toàn.
**FR:** FR-3, FR-4, FR-5, FR-6 · **AR:** AR-5 · **NFR:** NFR-2 (proactive).

### Story 4.1: Soạn tin chủ động từ template kịch bản

As a hệ thống MeCare,
I want tự soạn tin chăm sóc bằng template cứng theo nhóm + hồ sơ khách,
So that nội dung đúng kịch bản đã duyệt, giọng persona thống nhất, không sáng tác tư vấn y tế.

**Acceptance Criteria:**

**Given** khách thuộc một nhóm và có mẫu kịch bản đã duyệt
**When** n8n soạn tin
**Then** điền đúng placeholder từ hồ sơ; giọng persona "Dược Sĩ Hải" thống nhất; agent KHÔNG sinh tự do (AR-5 template cứng)

**Given** thiếu dữ liệu bắt buộc cho placeholder
**When** soạn tin
**Then** KHÔNG gửi; ghi log thiếu dữ liệu

**Given** nội dung là TPCN
**When** soạn tin
**Then** kèm câu bắt buộc nguyên văn; không chẩn đoán (NFR-2)

### Story 4.2: Lập lịch & gửi đúng cadence từng nhóm

As a hệ thống MeCare,
I want gửi tin đúng nhịp của từng nhóm,
So that mỗi khách nhận chăm sóc đúng thời điểm có ý nghĩa.

**Acceptance Criteria:**

**Given** cadence cấu hình từng nhóm
**When** n8n scheduler chạy
**Then** gửi đúng nhịp (nhắc thuốc sáng/tối, follow-up theo mốc ngày, refill/tái khám trước hạn); chỉ trong giờ hành chính

**Given** khách Nhóm 1 chưa xác nhận uống thuốc
**When** sau 1–2 tiếng
**Then** gửi tin hỏi thăm follow-up

### Story 4.3: Áp rate-limit nhóm + trần gói 1.000 tin/tháng

As a hệ thống MeCare,
I want chặn vượt rate-limit nhóm/khách và trần gói tháng,
So that vừa an toàn anti-ban vừa đúng cam kết gói dịch vụ.

**Acceptance Criteria:**

**Given** một tin chủ động chuẩn bị gửi
**When** kiểm tra quota 2 tầng (AR-6)
**Then** zalo-bridge enforce rate-limit nhóm/khách; n8n enforce trần gói 1.000 tin/tháng/nhà thuốc trước khi gửi

**Given** vượt rate-limit nhóm/khách
**When** định gửi
**Then** hoãn hoặc bỏ tin + ghi log

**Given** chạm trần gói tháng
**When** định gửi tin chủ động
**Then** dừng tin chủ động (KHÔNG chặn Nhóm 5 khiếu nại) + phát cảnh báo; `QuotaCounter` đếm theo chu kỳ tháng/nhà thuốc, hiển thị dashboard

### Story 4.4: Tôn trọng phản hồi & quyền từ chối của khách

As a khách hàng,
I want hệ thống ghi nhận phản hồi của tôi và dừng nhắc khi tôi yêu cầu,
So that tôi không bị làm phiền ngoài ý muốn.

**Acceptance Criteria:**

**Given** khách phản hồi (đánh số 1/2/3 hoặc tự do)
**When** hệ thống nhận
**Then** ghi nhận và điều chỉnh luồng tương ứng

**Given** khách yêu cầu dừng / không còn phù hợp
**When** xử lý
**Then** dừng nhắc cho khách đó

**Given** khách thuộc Nhóm 6
**When** chưa phản hồi
**Then** KHÔNG chủ động nhắn thêm trừ khi khách phản hồi

---

## Epic 5: Trả lời thắc mắc & Leo thang Dược Sĩ

**Mục tiêu:** Trả lời an toàn trong kịch bản + relay dược sĩ thật + audit đầy đủ (human-in-the-loop).
**FR:** FR-7, FR-8, FR-9, FR-10 · **AR:** AR-5, AR-8 · **NFR:** NFR-2, NFR-3.

### Story 5.1: Trả lời tự động FAQ trong phạm vi kịch bản

As a khách hàng,
I want được trả lời ngay các câu hỏi thường gặp,
So that tôi giải đáp nhanh mà không cần chờ dược sĩ.

**Acceptance Criteria:**

**Given** câu hỏi trong phạm vi kịch bản (cách dùng thuốc, dụng cụ, TPCN)
**When** agent + RAG kịch bản đã duyệt xử lý (AR-5)
**Then** trả lời tức thì, mục tiêu <5 phút trong giờ (NFR-3); không chẩn đoán

**Given** câu hỏi về TPCN
**When** trả lời
**Then** luôn kèm câu bắt buộc nguyên văn

### Story 5.2: Phát hiện trigger leo thang & cấp cứu

As a hệ thống MeCare,
I want nhận diện điều kiện cần dược sĩ và dừng tự trả lời,
So that ca an toàn được chuyển đúng người, không để AI xử lý sai (R2).

**Acceptance Criteria:**

**Given** nội dung khách
**When** quét trigger
**Then** nhận diện: phản ứng bất thường, chỉ số vượt ngưỡng, cờ đỏ OTC sốt >38.5°C >2 ngày, đổi thuốc đơn, tương tác/chống chỉ định, khiếu nại nghiêm trọng, catch-all "không chắc"

**Given** trigger kích hoạt
**When** xử lý
**Then** dừng tự trả lời, khởi tạo ca leo thang (sinh mã ca — Story 1.3)

**Given** dấu hiệu cấp cứu
**When** phát hiện
**Then** khuyến cáo gọi 115 NGAY (vượt cả leo thang, song song, không phụ thuộc relay)

### Story 5.3: Relay ca sang Dược Sĩ thật & phản hồi khách

As a khách hàng có ca cần dược sĩ,
I want ca của tôi được chuyển dược sĩ thật và nhận lại tư vấn chính xác,
So that tôi được hỗ trợ chuyên môn an toàn.

**Acceptance Criteria:**

**Given** ca leo thang mở
**When** relay sang Zalo dược sĩ thật
**Then** gửi mã ca duy nhất, định danh khách, nhóm, trigger trích nguyên văn

**Given** dược sĩ gửi phương án kèm mã ca
**When** hệ thống nhận
**Then** khớp đúng mã ca (idempotency AR-4); AI nhắn lại khách GIỮ NGUYÊN nội dung chuyên môn

**Given** ca đang chờ
**When** trong lúc chờ
**Then** khách nhận tin chờ + hướng dẫn an toàn tạm thời

**Given** dược sĩ không phản hồi quá ngưỡng (timeout)
**When** quá SLA
**Then** fallback không để ca treo im lặng (Open Q7); cấp cứu vẫn phát 115 song song

### Story 5.4: Lưu luồng hội thoại & ca leo thang vào CRM (audit-first)

As a chủ nhà thuốc,
I want mọi tin và ca leo thang được lưu đầy đủ,
So that tôi xem lại lịch sử và kiểm soát chất lượng chăm sóc.

**Acceptance Criteria:**

**Given** bất kỳ tin nào (chủ động/trả lời/leo thang/phương án dược sĩ)
**When** xử lý
**Then** lưu gắn hồ sơ khách trong `Messages` (audit-first, AR-7)

**Given** một ca leo thang
**When** ghi `EscalationCases`
**Then** bản ghi đầy đủ: thời điểm, trigger, nội dung khách, phương án, tin gửi lại; trạng thái `open → waiting_pharmacist → resolved`

**Given** ca quá SLA
**When** watchdog n8n quét
**Then** phát alert kênh riêng (AR-8); chủ nhà thuốc xem được lịch sử + danh sách ca

---

## Epic 6: CRM & Dashboard (Baserow)

**Mục tiêu:** Chủ nhà thuốc xem và quản lý dữ liệu khách + chỉ số vận hành.
**FR:** FR-14, FR-15.

### Story 6.1: Hồ sơ khách & danh sách lọc theo nhóm

As a chủ nhà thuốc,
I want xem hồ sơ từng khách và lọc khách theo Nhóm chăm sóc,
So that tôi nắm tình hình chăm sóc và tra cứu nhanh.

**Acceptance Criteria:**

**Given** Baserow views cho tenant
**When** mở danh sách khách
**Then** lọc được theo `care_group` (6 nhóm); chỉ thấy khách trong `pharmacy_id` của mình

**Given** mở hồ sơ một khách
**When** xem chi tiết
**Then** thấy thông tin, nhóm, thuốc, lịch sử hội thoại (từ `Messages`, FR-10) và lịch nhắc sắp tới (`CareSchedule`)

### Story 6.2: Dashboard chỉ số cơ bản

As a chủ nhà thuốc,
I want một dashboard chỉ số vận hành,
So that tôi theo dõi mức dùng gói và tải chăm sóc.

**Acceptance Criteria:**

**Given** dashboard Baserow
**When** mở
**Then** hiển thị: số tin đã gửi trong tháng vs trần gói (`QuotaCounter`); số ca leo thang; số khách theo nhóm

**Given** dữ liệu cập nhật
**When** có tin gửi / ca mới
**Then** chỉ số phản ánh đúng theo chu kỳ tháng/nhà thuốc

---

## Epic 7: Onboarding & go-live một nhà thuốc

**Mục tiêu:** Quy trình setup tận tay đưa một nhà thuốc lên sản xuất, lặp lại được.
**FR:** FR-16 · **NFR:** NFR-7.

### Story 7.1: Runbook setup tận tay cho một nhà thuốc

As a kỹ sư onboarding MeCare,
I want một runbook đầy đủ để cấu hình một nhà thuốc mới,
So that mỗi lần onboard nhất quán và đúng an toàn.

**Acceptance Criteria:**

**Given** một nhà thuốc mới
**When** chạy runbook (`docs/runbook-onboarding`)
**Then** kết nối Tài khoản Zalo chăm sóc; nạp/duyệt kịch bản 6 nhóm; khởi tạo CRM (tenant `pharmacy_id`, `tenants/<slug>.env`); cấu hình Zalo dược sĩ thật cho relay

**Given** kịch bản nạp vào
**When** trước khi mở tải thật
**Then** nội dung kịch bản đã được duyệt (liên kết Story 1.4)

### Story 7.2: Warm-up & kiểm thử 2 chiều trước go-live

As a kỹ sư onboarding MeCare,
I want chạy warm-up và kiểm thử relay 2 chiều trước khi mở tải đầy,
So that tài khoản an toàn và luồng leo thang hoạt động thật trước go-live.

**Acceptance Criteria:**

**Given** tài khoản Zalo nhà thuốc mới cấu hình
**When** trước go-live
**Then** chạy warm-up giai đoạn tải thấp trước khi mở tải đầy

**Given** cấu hình relay dược sĩ
**When** kiểm thử
**Then** gửi ca test 2 chiều (AI→dược sĩ→AI→khách) thành công, khớp mã ca, trước khi go-live

### Story 7.3: Privacy & quy trình khiếu nại trong vận hành

As a chủ nhà thuốc,
I want quy trình tôn trọng quyền từ chối và xử lý khiếu nại đúng,
So that tuân thủ privacy và xử lý sự cố sản phẩm chuyên nghiệp (NFR-7).

**Acceptance Criteria:**

**Given** khách từ chối cung cấp thông tin sức khỏe (Nhóm 6)
**When** phục vụ
**Then** vẫn phục vụ bình thường, không ép cung cấp

**Given** khiếu nại chất lượng (Nhóm 5)
**When** tiếp nhận
**Then** thu thập ảnh sản phẩm + hộp/lọ (lô, HSD) + mô tả; cam kết đổi/hoàn/báo NSX; tiếp nhận ngay, xử lý trong ngày (NFR-3)

**Given** gửi khuyến mãi
**When** chọn đối tượng
**Then** chỉ gửi khách từng mua sản phẩm liên quan

---

## Validation Notes (Step 4)

- **FR coverage:** 16/16 FR có story + AC. Không sót.
- **Architecture:** Không có starter template; AR-2 foundation = Story 1.1.
- **Deviation có chủ ý — Story 1.2 tạo toàn bộ bảng Baserow upfront:** Sai lệch khỏi nguyên tắc "tạo bảng khi story cần", nhưng giữ theo quyết định: Baserow là DB kiêm UI config-driven, AR-3 neo "schema = nguồn sự thật", data model là nền sản phẩm (không migration per-story). Đã xác nhận với Tinsu — giữ upfront.
- **Story quality:** mọi story sized 1 dev session, AC Given/When/Then, ref FR/AR/NFR, không forward-dependency.
- **Dependency:** E2/E3 độc lập sau E1; E4/E5 build trên E2+E3; E6 đọc dữ liệu; E7 chốt go-live. Cross-ref đều backward (5.2/5.3→1.3, 7.1→1.4).
- **Critical gaps go-live:** G1/G2/G6 đã thành story (1.4/1.5/1.6) — điều kiện chặn go-live, không chặn bắt đầu code.
