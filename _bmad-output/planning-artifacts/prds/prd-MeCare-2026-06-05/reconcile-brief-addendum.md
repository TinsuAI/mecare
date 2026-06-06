# Đối Chiếu: brief/addendum.md → prd.md + prd/addendum.md

**Nguồn (SOURCE):** `briefs/brief-MeCare-2026-06-05/addendum.md`
**Đích:** `prds/prd-MeCare-2026-06-05/prd.md` + `prds/prd-MeCare-2026-06-05/addendum.md`
**Ngày:** 2026-06-06

## Tóm tắt

Phần lớn nội dung brief-addendum đã được PRD tiếp nhận tốt:
- **Tech stack** (n8n, Hermes agent, Baserow, openzalo/openzca, Zalo Cá Nhân không phải OA) → PRD addendum §1, đầy đủ.
- **Phân tích rủi ro Zalo** (ngưỡng hành vi, kết bạn, spam, ToS, 5 chiến lược giảm thiểu) → PRD R1 (§12), FR-11/12/13, PRD addendum §4, §11.3. Đầy đủ.
- **Bảng token/khách-tháng** (~300–500 hoặc ~30–50 khách) → PRD addendum §3, bảng khớp nguyên văn; flag [CẦN TINSU XÁC NHẬN] giữ nguyên (Open Q1).
- **6 nhóm vận hành** → PRD §4.2 (bảng nhịp + rate limit) + Glossary. Đầy đủ, còn được bổ sung rate limit cụ thể.
- **Câu hỏi mở** → PRD §8 (6 câu, gồm cả handoff cập nhật kịch bản).

Dưới đây là các điểm bị **rơi (dropped)** hoặc **biến dạng (distorted)** so với nguồn.

---

## Các gap cụ thể

### GAP-1 — Lằn ranh chuyên môn của 6 nhóm bị lược (ngưỡng leo thang theo từng nhóm) [MED]

- **Nguồn:** Mỗi nhóm trong brief-addendum nêu **ngưỡng leo thang riêng** (Nhóm 2: "hết liệu trình không đỡ hoặc nặng hơn"; Nhóm 3: "phản ứng lạ hoặc xin đổi thuốc"; Nhóm 4: "khi cần tư vấn sâu"; Nhóm 5: "mọi phản ứng có hại kể cả nhẹ + khiếu nại chất lượng"). Đây là bảng vận hành gắn trigger với từng nhóm.
- **PRD:** FR-8 gộp tất cả trigger thành **một danh sách chung, không gắn theo nhóm**. Bảng §4.2 chỉ có nhịp nhắn + rate limit, không có cột "ngưỡng leo thang theo nhóm". Nhóm 5 "phản hồi ngay lập tức, ưu tiên cao nhất" có giữ tinh thần (SLA) nhưng không neo per-group trigger.
- **Hệ quả:** Downstream (dev/test) mất ánh xạ nhóm→trigger; dễ test leo thang chung chung, bỏ sót đặc thù từng nhóm. Nguồn gốc đầy đủ vẫn ở `kichban-chamsoc-khachhang.md`, nên mức MED chứ không HIGH.

### GAP-2 — Tình huống Nhóm 6 bị nén từ 5 ca xuống mô tả tóm tắt [MED]

- **Nguồn:** Nhóm 6 liệt kê **5 tình huống cụ thể**: (1) từ chối chia sẻ, (2) mua hộ, (3) khách vội, (4) người già khó giao tiếp, (5) khách lần đầu — kèm cách tiếp cận "không gây áp lực, cung cấp tối thiểu thông tin an toàn, mở cửa chia sẻ tự nguyện lần sau".
- **PRD:** FR-2 Consequences nhắc 4–5 lý do vào Nhóm 6 ("từ chối, mua hộ, vội, khó giao tiếp, hoặc quên nhập") nhưng **gộp "người già" + "khách lần đầu"**, và FR-6/§4.2 chỉ mô tả hành vi "tối giản". Sắc thái 5 ca và mục tiêu "mở cửa chia sẻ lần sau" bị làm mờ.
- **Hệ quả:** UX form nhập liệu + kịch bản Nhóm 6 có thể thiếu nhánh "người già khó giao tiếp" và "khách lần đầu" như hai ngữ cảnh riêng. MED.

### GAP-3 — Tài sản "website/index.html — sales kit 11 section" và BRAND.md bị giảm vai trò [LOW]

- **Nguồn:** Liệt kê tài sản đã có gồm `website/index.html` (sales kit 11 section, đã build) và `website/BRAND.md`.
- **PRD:** PRD addendum §6 có giữ danh mục tài sản, nhưng **bỏ chi tiết "11 section"** và **không tham chiếu lại file `videos/` đúng tên 3 showcase** (ZaloChat, PharmacyDashboard, MeCareShowcase) như nguồn. BRAND.md được trích vào §10 (tốt), nhưng sales kit 11 section không được dùng làm nguồn cho landing/marketing trong PRD.
- **Hệ quả:** Nhẹ — chỉ mất con trỏ tới tài sản marketing có sẵn. LOW.

### GAP-4 — Open question "moat dài hạn" bị hạ xuống assumption, gần như đã tự trả lời [LOW]

- **Nguồn:** Câu hỏi mở #1 "Moat dài hạn nằm ở đâu?" là **câu hỏi còn bỏ ngỏ**.
- **PRD:** Vẫn giữ ở §8 Q4, nhưng §9 (Assumptions) đã thêm dòng "Lợi thế cạnh tranh nằm ở tốc độ thực thi + hiểu nghiệp vụ dược, không phải công nghệ độc quyền" — tức **PRD đã ngầm trả lời** câu hỏi vốn để mở. Đây là biến dạng nhẹ (mở → giả định), cần Tinsu xác nhận có đồng ý chốt moat theo hướng đó không.
- **Hệ quả:** LOW — nhưng nên gắn cờ để tránh chốt moat sớm mà chưa thảo luận.

### GAP-5 — Mục tiêu "10 nhà thuốc trong 1–3 tháng" + "Zalo = automation web" đã chốt ở review, nhưng câu hỏi mở liên quan vẫn để ngỏ song song [LOW]

- **Nguồn:** Dòng cuối brief-addendum: "_Đã chốt ở review: mục tiêu 10 nhà thuốc trả phí (1–3 tháng); lớp Zalo = automation web qua openzalo/openzca._"
- **PRD:** Đã đưa thành SM-2 (10 nhà thuốc) và PRD addendum §1 (openzalo/openzca) — **chốt đúng**. Tuy nhiên §8 Q5 vẫn hỏi "ngưỡng chính xác số nhà thuốc onboarding thủ công chịu được (giả định ~10)" — không mâu thuẫn, nhưng cần phân biệt rõ "10 = mục tiêu doanh số đã chốt" vs "~10 = ngưỡng kỹ thuật onboarding chưa chốt". Nguồn không tách hai con số này; PRD tách nhưng dùng cùng số 10 dễ gây nhầm.
- **Hệ quả:** LOW — rủi ro hiểu nhầm hai loại "10".

---

## Kết luận

Không có gap **HIGH**: mọi nội dung trọng yếu (tech stack, rủi ro Zalo, token sizing, 6 nhóm, open questions) đều được mang sang. Hai gap **MED** đáng xử lý trước go-live là chi tiết per-group trigger (GAP-1) và 5 ca Nhóm 6 (GAP-2) — cả hai đều an toàn vì bản gốc đầy đủ vẫn nằm trong `kichban-chamsoc-khachhang.md` (mà PRD §8 Q3 đã đánh dấu cần cập nhật). Các gap LOW chủ yếu là tham chiếu tài sản và sắc thái câu hỏi mở.
