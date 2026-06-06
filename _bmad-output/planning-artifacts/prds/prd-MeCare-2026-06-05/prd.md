---
title: "PRD — MeCare"
status: final
created: 2026-06-05
updated: 2026-06-06
---

# PRD: MeCare
*Tên gọi đang dùng — chốt lại nếu cần.*

## 0. Mục Đích Tài Liệu

PRD này dành cho PM (Tinsu), các bên liên quan, và những người thực thi downstream (UX, architecture, dev, vận hành). Tài liệu mô tả **năng lực sản phẩm** (capabilities) ở mức yêu cầu chức năng (FR), không mô tả cách hiện thực kỹ thuật — chi tiết kỹ thuật (n8n, Hermes agent, openzalo/openzca, bảng token, sơ đồ luồng) nằm ở `addendum.md` cùng thư mục. Cấu trúc: từ vựng được neo trong **Glossary** (§3) và dùng nhất quán; các tính năng (§4) gom nhóm, FR đánh số toàn cục để downstream tham chiếu ổn định; giả định được gắn tag `[ASSUMPTION]` tại chỗ và liệt kê lại ở §9.

Tài liệu xây trên **Product Brief MeCare** (`briefs/brief-MeCare-2026-06-05/brief.md` + `addendum.md`) và **kịch bản chăm sóc 6 nhóm** (`kichban-chamsoc-khachhang.md`) — PRD không lặp lại toàn văn các nguồn này mà trích yêu cầu.

---

## 1. Tầm Nhìn

MeCare là phần mềm SaaS giúp **nhà thuốc bán lẻ tại Việt Nam tự động chăm sóc khách hàng qua Zalo Cá Nhân của chính nhà thuốc** — nhắc uống thuốc, hỏi thăm sau bán, nhắc tái khám/mua lại, trả lời thắc mắc — bằng AI, mà không cần thuê thêm nhân sự. Trải nghiệm với khách vẫn là "nhắn tin với nhà thuốc quen qua Zalo": không app mới, không đăng ký. Phần AI và CRM ẩn phía sau.

Vấn đề cốt lõi MeCare giải: nhà thuốc bán lẻ gần như **không chăm sóc khách sau khi bán**. Khách mua xong là mất dấu — quên uống thuốc, không tái khám, không quay lại. Chủ nhà thuốc biết đó là doanh thu rơi mất nhưng không có thời gian, nhân sự hay công cụ để theo. MeCare biến việc chăm sóc thủ công bất khả thi (gọi từng người) thành quy trình tự động chạy nền, theo đúng kịch bản chăm sóc đã duyệt cho từng nhóm khách, với giọng văn của nhà thuốc.

Nếu thành công, MeCare trở thành **lớp chăm sóc khách hàng mặc định cho nhà thuốc bán lẻ Việt Nam** — biến mỗi quầy thuốc lẻ thành dịch vụ chăm sóc sức khỏe chủ động, giữ chân khách bằng quan hệ thay vì chỉ bằng giá. Từ một quầy (Nhà Thuốc Trúc Tâm — khách pilot) tới mạng lưới nhiều nhà thuốc, dữ liệu chăm sóc tích lũy thành lợi thế.

**Định vị & thông điệp (giữ cho UX/sales, không để rớt khi xuống FR):** Chủ nhà thuốc hằng ngày chứng kiến cảnh **mất khách sau bán** và **khách trôi sang nhà thuốc khác**, nhưng coi đó là "chuyện không sửa được" — đòn bẩy tâm lý trung tâm của thông điệp bán hàng là biến nỗi cam chịu đó thành hành động khả thi. MeCare định vị **trọn gói cho nhà thuốc nhỏ**: setup tận tay + giá theo gói tháng vừa túi tiền — onboarding thủ công ở v1 vừa là *giới hạn vận hành* (xem §4.6, Non-Goals) vừa là *điểm bán* "không bắt chủ nhà thuốc tự cấu hình". `[ASSUMPTION: Lợi thế cạnh tranh nằm ở tốc độ thực thi + hiểu nghiệp vụ dược địa phương, không phải công nghệ độc quyền — moat dài hạn cần xác nhận, xem §8 Q4.]`

---

## 2. Đối Tượng Phục Vụ

### 2.1 Jobs To Be Done

**Chủ nhà thuốc (người mua & người dùng chính):**
- *Chức năng:* Giữ khách quay lại mua, tăng doanh thu lặp lại — mà không phải gọi/nhắn từng người.
- *Chức năng:* Không bỏ sót khách cần chăm (mãn tính quên thuốc, đơn sắp hết, khiếu nại chưa trả lời).
- *Cảm xúc:* Cảm giác "nhà thuốc của mình chuyên nghiệp hơn", chăm khách tử tế mà không kiệt sức.
- *Xã hội:* Khách thấy được quan tâm → tin tưởng, giới thiệu người quen.
- *Bối cảnh:* Không rành công nghệ, ngân sách nhạy cảm, không có thời gian cấu hình.

**Dược sĩ phụ trách chuyên môn (ở pilot Trúc Tâm là Dược Sĩ Hải — vừa là chủ vừa là dược sĩ):**
- *Chức năng:* Chỉ phải đích thân xử lý đúng những ca thật sự cần chuyên môn (leo thang), phần còn lại để AI lo.
- *Cảm xúc:* Yên tâm rằng AI không tư vấn y tế vượt ranh giới an toàn.

**Nhân viên bán thuốc tại quầy (người dùng phụ):**
- *Chức năng:* Ghi nhanh thông tin khách lúc bán mà không làm chậm việc bán hàng.

### 2.2 Không phải đối tượng (v1)

- **Chuỗi nhà thuốc nhiều chi nhánh** — v1 phục vụ nhà thuốc đơn lẻ độc lập; quản lý chuỗi là cơ hội về sau.
- **Nhà thuốc muốn tự cài đặt (self-serve)** — v1 onboarding thủ công tận tay; chưa phục vụ khách tự cấu hình.
- **Khách hàng cuối tải app riêng** — không có app cho người tiêu dùng; mọi tương tác qua Zalo.

### 2.3 Hành Trình Người Dùng Chính (User Journeys)

> Mỗi UJ là một cảnh có nhân vật cụ thể. FR tham chiếu bằng ID ("realizes UJ-X"). Persona ngữ cảnh nằm inline.

- **UJ-1. Cô Lan (tiểu đường, bận trông cháu) được nhắc uống thuốc và được cứu kịp khi đường huyết vọt cao.**
  - **Persona + bối cảnh:** Cô Lan, 58 tuổi, tiểu đường type 2, hay quên liều buổi tối vì bận. Đã kết bạn Zalo "Dược Sĩ Hải – Nhà Thuốc Trúc Tâm" lúc mua thuốc tháng trước.
  - **Entry state:** Đã là khách Nhóm 1 (mãn tính) trong CRM; đã opt-in kết bạn Zalo.
  - **Path:** (1) 7h tối cô nhận tin Zalo "Dạ, em nhắc cô uống thuốc tối ạ 💊". (2) Cô không trả lời; sau 1–2 tiếng nhận tin hỏi thăm nhẹ. (3) Tuần sau, đến lịch nhắc đo đường huyết 2 tuần/lần, cô nhắn lại chỉ số 13.5 mmol/L. (4) Hệ thống nhận ra vượt ngưỡng an toàn → dừng tự trả lời.
  - **Climax:** AI nhắn cô "Dạ để em hỏi dược sĩ rồi báo lại cô ngay ạ", đồng thời báo sang Zalo thật của Dược Sĩ Hải. Hải gửi phương án về, AI nhắn lại cô hướng xử lý + lời khuyên đi khám. Cô biết mình được theo dõi thật.
  - **Resolution:** Ca được ghi vào CRM; cô tiếp tục được nhắc, lần tái khám tới được nhắc trước 3 ngày.
  - **Edge case:** Nếu cô báo chỉ số kèm dấu hiệu nguy hiểm (khó thở…), AI ưu tiên khuyến cáo gọi 115 ngay, không chờ dược sĩ.

- **UJ-2. Anh Tú (cảm cúm, mua thuốc OTC) được hỏi thăm đúng lúc và không bị làm phiền quá mức.**
  - **Persona + bối cảnh:** Anh Tú, 31 tuổi, ghé mua thuốc ho/sốt, dùng ngắn ngày. Nhóm 2 (OTC).
  - **Entry state:** Mới mua, nhân viên đã ghi nhận + kết bạn Zalo.
  - **Path:** (1) Ngay sau mua nhận tin hướng dẫn dùng thuốc. (2) Sau 2–3 ngày nhận 1 tin hỏi thăm có lựa chọn đánh số (1 đỡ / 2 chưa đỡ / 3 nặng hơn). (3) Anh bấm "1 đỡ rồi". (4) Hệ thống ghi nhận, dừng — tối đa 3 tin trong 7 ngày, không spam.
  - **Climax:** Anh thấy nhà thuốc quan tâm vừa đủ, không phiền.
  - **Resolution:** Nếu anh chọn "3 nặng hơn" → leo thang dược sĩ + khuyến nghị gặp bác sĩ.

- **UJ-3. Dược Sĩ Hải xử lý một ca leo thang giữa lúc đang bán hàng — chỉ mất 30 giây.**
  - **Persona + bối cảnh:** Dược Sĩ Hải, chủ kiêm dược sĩ Trúc Tâm, vận hành gần như một mình, đang đông khách tại quầy.
  - **Entry state:** Zalo cá nhân thật của Hải, có cài app/được thông báo từ MeCare.
  - **Path:** (1) Hải nhận tin trên Zalo thật: "⚠️ Ca cần dược sĩ — khách Nguyễn Thị Lan, đường huyết 13.5, nội dung: [trích]". (2) Hải gõ nhanh phương án trả lời gửi lại. (3) MeCare nhận, AI nhắn lại khách bằng giọng "Dược Sĩ Hải". (4) Hải mở dashboard cuối ngày xem các ca leo thang + chỉ số.
  - **Climax:** Khách được trả lời chuẩn chuyên môn trong vài phút mà Hải không phải rời quầy hay tự soạn tin dài dòng.
  - **Resolution:** Toàn bộ hội thoại + phương án lưu trên Baserow; Hải dùng để theo dõi và quản lý chất lượng trả lời.

- **UJ-4. Chị Hương (nhân viên quầy) ghi nhận khách mới trong 20 giây mà không làm chậm việc bán.**
  - **Persona + bối cảnh:** Chị Hương, nhân viên bán thuốc Trúc Tâm, lúc cao điểm đông khách.
  - **Entry state:** Khách đồng ý kết bạn Zalo tại quầy.
  - **Path:** (1) Nhân viên mở form CRM nhanh, nhập SĐT/tên, thuốc mua, tình trạng. (2) Chọn nhóm (hoặc để hệ thống gợi ý nhóm từ loại thuốc). (3) Lưu — khách vào đúng nhịp chăm sóc.
  - **Edge case:** Khách từ chối cho thông tin / mua hộ / đang vội → ghi vào **Nhóm 6**, chỉ gửi hướng dẫn dùng thuốc tối giản, không gây áp lực.

---

## 3. Glossary

> Downstream và toàn PRD dùng đúng các từ này, không dùng từ đồng nghĩa.

- **MeCare** — Phần mềm SaaS chăm sóc khách hàng cho nhà thuốc, chủ thể của PRD này.
- **Nhà thuốc** — Khách hàng trả phí của MeCare (cơ sở bán lẻ dược độc lập). Pilot: **Nhà Thuốc Trúc Tâm**.
- **Khách hàng** — Người tiêu dùng cuối mua thuốc tại nhà thuốc và được chăm sóc qua Zalo. (Không gọi "bệnh nhân" trừ ngữ cảnh lâm sàng.)
- **Dược Sĩ Hải** — Tên persona front-line mà MeCare dùng để nhắn khách qua Zalo (ở pilot Trúc Tâm). Đây là **danh nghĩa do AI vận hành**; khách không biết đây là hệ thống. Persona tự xưng "em". Mỗi nhà thuốc có thể có tên persona riêng tương ứng.
- **Dược sĩ (thật)** — Con người có chuyên môn (ở Trúc Tâm chính là Hải) nhận **ca leo thang** qua Zalo cá nhân riêng và cung cấp phương án trả lời. Off-stage với khách.
- **Tài khoản Zalo chăm sóc** — Tài khoản Zalo Cá Nhân mang danh nghĩa persona (Dược Sĩ Hải), do MeCare tự động vận hành, là kênh nói chuyện với Khách hàng.
- **Zalo dược sĩ thật** — Tài khoản Zalo Cá Nhân riêng của dược sĩ con người, dùng để nhận thông báo leo thang và gửi phương án trả lời về MeCare.
- **Nhóm chăm sóc** — 1 trong 6 phân loại khách (Nhóm 1–6), mỗi nhóm có nhịp nhắn, rate limit và trigger leo thang riêng. (Định nghĩa từng nhóm ở §4.2.)
- **Leo thang** — Hành động hệ thống dừng tự trả lời và chuyển ca cho Dược sĩ (thật) qua relay khi gặp **trigger leo thang**.
- **Trigger leo thang** — Điều kiện buộc leo thang (phản ứng có hại, chỉ số vượt ngưỡng, đổi thuốc, khiếu nại nghiêm trọng, AI không chắc chắn…).
- **CRM** — Hệ quản lý hồ sơ khách, phân nhóm, lịch sử hội thoại và chỉ số, dựng trên **Baserow**.
- **Dashboard** — Màn hình chỉ số trong CRM cho chủ nhà thuốc.
- **Kịch bản chăm sóc** — Bộ mẫu tin nhắn + quy tắc đã duyệt cho 6 nhóm (nguồn: `kichban-chamsoc-khachhang.md`).
- **Tin chăm sóc** — Một tin nhắn Zalo do hệ thống gửi cho khách. Đơn vị tính của trần gói (≤1.000 tin/tháng).
- **Trần gói** — Giới hạn 1.000 tin chăm sóc/tháng/nhà thuốc; vừa là điểm giá vừa là van an toàn chống khóa tài khoản.
- **Hermes agent** — Tác vụ AI soạn tin/hội thoại theo kịch bản (chi tiết ở addendum).

---

## 4. Tính Năng

### 4.1 Thu thập & phân nhóm khách tại quầy

**Mô tả:** Lúc bán, nhân viên xin SĐT/kết bạn Zalo và ghi nhanh thông tin khách (thuốc mua, tình trạng) vào CRM, rồi khách được xếp vào 1 trong 6 **Nhóm chăm sóc**. Phân nhóm quyết định nhịp nhắn, rate limit và trigger leo thang về sau. Realizes UJ-4. Trải nghiệm nhập liệu phải **nhanh, không cản việc bán hàng**.

**Functional Requirements:**

#### FR-1: Nhập liệu khách tại quầy
Nhân viên có thể tạo hồ sơ khách mới trong CRM với: tên, SĐT, thuốc/sản phẩm đã mua, tình trạng/ghi chú, nhóm chăm sóc. Realizes UJ-4.

**Consequences (testable):**
- Tạo hồ sơ tối thiểu (tên + SĐT + nhóm) hoàn tất trong ≤ 20 giây thao tác.
- SĐT trùng được cảnh báo và cho phép cập nhật hồ sơ cũ thay vì tạo trùng.
- Trường tình trạng/ghi chú là tự do, không bắt buộc.

#### FR-2: Phân nhóm khách vào 1 trong 6 Nhóm chăm sóc
Hệ thống cho phép gán khách vào đúng một Nhóm chăm sóc (Nhóm 1–6); có thể gợi ý nhóm từ loại thuốc đã mua. Realizes UJ-1, UJ-4.

**Consequences (testable):**
- Mỗi khách thuộc đúng một nhóm tại một thời điểm; đổi nhóm được ghi log.
- Khách mua thuốc cần đơn → gợi ý Nhóm 3; mãn tính (tiểu đường/cao huyết áp) → Nhóm 1 (override Nhóm 2/3); TPCN/dụng cụ → Nhóm 4; OTC ngắn ngày → Nhóm 2.
- Khi không thu thập được thông tin triệu chứng/bệnh → Nhóm 6, gồm 5 tình huống: (1) khách từ chối chia sẻ, (2) mua hộ người khác, (3) khách đang vội, (4) người cao tuổi/khó giao tiếp, (5) khách lần đầu — cộng trường hợp nhân viên quên nhập liệu.

**Notes:** `[NOTE FOR PM]` Nhóm 5 (phản ánh/sau bán) là **trạng thái cắt ngang** — một khách Nhóm 1–4 có thể tạm vào luồng Nhóm 5 khi chủ động nhắn lại; cần quyết ở UX/architecture xem mô hình là "đổi nhóm" hay "gắn cờ trạng thái". `[ASSUMPTION]` v1 xử lý Nhóm 5 như trạng thái/luồng ưu tiên, không xóa nhóm gốc của khách.

---

### 4.2 Chăm sóc chủ động theo nhóm

**Mô tả:** Hệ thống tự soạn và gửi **tin chăm sóc** đúng thời điểm theo **kịch bản đã duyệt** cho từng nhóm, với giọng persona "Dược Sĩ Hải" (xưng "em"), tuân thủ **rate limit** từng nhóm. Đây là phần lõi tạo giá trị. Realizes UJ-1, UJ-2.

Sáu Nhóm chăm sóc và đặc tính (nguồn: kịch bản):

| Nhóm | Tên | Nhịp nhắn chủ động | Rate limit |
|------|-----|---------------------|-----------|
| 1 | Bệnh mãn tính (tiểu đường, cao huyết áp) | Nhắc thuốc sáng/tối; nhắc đo chỉ số 2 tuần/lần; nhắc refill trước 5 ngày; nhắc tái khám trước 3 ngày | Tối đa **3 tin/ngày** |
| 2 | Thuốc không kê đơn (OTC) | 1 follow-up sau 2–3 ngày | Tối đa **3 tin/7 ngày** |
| 3 | Thuốc theo đơn bác sĩ | Nhắc lịch theo đơn + 1 follow-up sau 5–7 ngày | Theo lịch đơn + tối đa **1 tin chăm sóc/tuần** |
| 4 | TPCN & dụng cụ y tế | Follow-up sau 7 ngày; nhắc mua lại; gợi ý sản phẩm 1 lần/tháng | Tối đa **2 tin/tuần**; 1 gợi ý sản phẩm/tháng |
| 5 | Hỏi thăm/phản ánh sau bán | Khách chủ động; 1 tin hỏi thăm chủ động/đơn | **Không giới hạn** khi xử lý sự cố |
| 6 | Không ghi được thông tin | Tối giản, không gây áp lực | Tối đa **1–2 tin** ngay sau mua |

**Functional Requirements:**

#### FR-3: Soạn tin chăm sóc theo kịch bản nhóm
Hệ thống có thể tự soạn tin chăm sóc cho một khách dựa trên Nhóm chăm sóc, dữ liệu hồ sơ (tên, thuốc, ngày mua…) và mẫu trong kịch bản đã duyệt. Realizes UJ-1, UJ-2.

**Consequences (testable):**
- Tin được điền đúng placeholder từ hồ sơ (`[TÊN]`, `[TÊN THUỐC]`, `[NGÀY TÁI KHÁM]`…); thiếu dữ liệu bắt buộc thì không gửi tin cần dữ liệu đó.
- Tin dùng giọng persona thống nhất (xưng "em", gọi "anh/chị [TÊN]", mở "Dạ,…") — xem §Aesthetic & Tone (§10).
- Hệ thống **không tự sáng tác tư vấn y tế ngoài kịch bản đã duyệt** (xem FR-9, §11 Guardrails).

**Out of Scope:**
- Tự sinh kịch bản mới cho nhóm chưa được duyệt nội dung.

#### FR-4: Lập lịch & gửi đúng nhịp theo nhóm
Hệ thống gửi tin chăm sóc đúng cadence của từng nhóm (nhắc thuốc sáng/tối, follow-up theo mốc ngày, nhắc refill/tái khám trước hạn). Realizes UJ-1, UJ-2.

**Consequences (testable):**
- Nhóm 1: nhắc đo chỉ số đúng chu kỳ 2 tuần; nhắc refill gửi trước 5 ngày; nhắc tái khám trước 3 ngày.
- Nhóm 2: follow-up gửi trong khoảng 2–3 ngày sau mua.
- Chỉ gửi trong **giờ hành chính** (giờ làm việc nhà thuốc), không gửi ngoài giờ (xem NFR throttle).
- Nếu khách chưa xác nhận uống thuốc, gửi tin hỏi thăm sau 1–2 tiếng (Nhóm 1).

#### FR-5: Áp trần rate limit từng nhóm và trần gói
Hệ thống không vượt rate limit của nhóm cho mỗi khách, và không vượt **trần gói** 1.000 tin chăm sóc/tháng/nhà thuốc.

**Consequences (testable):**
- Vượt rate limit nhóm → tin bị hoãn/bỏ, ghi log lý do.
- Khi tổng tin tháng chạm trần gói → dừng gửi tin chủ động (không chặn tin xử lý sự cố Nhóm 5) và cảnh báo chủ nhà thuốc.
- Đếm tin theo chu kỳ tháng/nhà thuốc, hiển thị số đã dùng trên dashboard.

**Feature-specific NFRs:**
- **Chống khóa tài khoản:** nhịp gửi giống người (có jitter thời gian, trần gửi/ngày, chỉ trong giờ) — xem §11 và FR-7.

#### FR-6: Tôn trọng phản hồi & quyền từ chối của khách
Khách có thể phản hồi (đánh số 1/2/3 hoặc nhắn tự do); hệ thống ghi nhận, điều chỉnh luồng và dừng nhắc khi khách yêu cầu/không còn phù hợp. Realizes UJ-2.

**Consequences (testable):**
- Khách báo "đã đỡ/đã xong liệu trình" → dừng nhịp follow-up tương ứng.
- Khách yêu cầu ngừng nhận tin → hệ thống ngừng tin chủ động cho khách đó.
- Nhóm 6: không chủ động nhắn thêm trừ khi khách phản hồi.

---

### 4.3 Trả lời thắc mắc & leo thang dược sĩ (human-in-the-loop)

**Mô tả:** AI (qua Tài khoản Zalo chăm sóc "Dược Sĩ Hải") trả lời thắc mắc thường gặp tức thì theo kịch bản. Khi gặp **trigger leo thang**, AI **không tự trả lời** mà chuyển ca cho **Dược sĩ (thật)** qua relay: AI nhắn thông báo sang **Zalo dược sĩ thật** → dược sĩ gửi phương án trả lời về → **AI nhắn lại khách** bằng giọng persona. Toàn bộ lưu trên CRM. Realizes UJ-1, UJ-3. Đây là cơ chế kiểm soát rủi ro y tế cốt lõi.

**Functional Requirements:**

#### FR-7: Trả lời tự động câu hỏi thường gặp theo kịch bản
AI có thể trả lời tức thì các câu hỏi thường gặp (cách dùng thuốc, hướng dẫn dụng cụ, thông tin TPCN…) trong phạm vi kịch bản đã duyệt. Realizes UJ-2.

**Consequences (testable):**
- Câu hỏi trong phạm vi kịch bản → trả lời trong giờ làm việc, **thời gian phản hồi mục tiêu < 5 phút**; ngoài giờ → ghi nhận, phản hồi đầu giờ sáng hôm sau.
- Trả lời TPCN luôn kèm **câu bắt buộc nguyên văn**: "thực phẩm bảo vệ sức khỏe, không phải thuốc điều trị bệnh".
- AI **không chẩn đoán bệnh**; khi triệu chứng không cải thiện/nặng hơn → khuyến nghị gặp bác sĩ và/hoặc leo thang.

#### FR-8: Phát hiện trigger leo thang
Hệ thống nhận diện các điều kiện cần dược sĩ và dừng tự trả lời. Realizes UJ-1, UJ-3.

**Consequences (testable):** Leo thang khi gặp bất kỳ trigger:
- Khách báo **phản ứng bất thường sau dùng thuốc (dù nhẹ)**.
- **Chỉ số vượt ngưỡng an toàn** — vd huyết áp mục tiêu < 130/80 mmHg; đường huyết đói 4.4–7.2, sau ăn 2h < 10 mmol/L; vượt xa → leo thang.
- **Cờ đỏ Nhóm 2 (OTC):** sốt **> 38.5°C kéo dài > 2 ngày**; khó thở/đau tức ngực; nôn ói nhiều lần; tiêu chảy liên tục không dứt → leo thang/khuyến nghị gặp bác sĩ.
- Hết liệu trình OTC mà **không đỡ hoặc nặng hơn** (Nhóm 2) → leo thang.
- Yêu cầu **đổi sang thuốc thay thế** cho đơn bác sĩ (Nhóm 3).
- Câu hỏi **tương tác thuốc / chống chỉ định**.
- **Khiếu nại chất lượng nghiêm trọng** (Nhóm 5).
- Khách muốn chuyên gia giải thích trực tiếp.
- **Bất kỳ tình huống nào AI không chắc chắn** (catch-all).

Mỗi nhóm có trigger riêng (Nhóm 1: chỉ số bất thường/bỏ liều nhiều ngày/triệu chứng lạ; Nhóm 3: phản ứng lạ/xin đổi thuốc; Nhóm 4: cần tư vấn chuyên sâu; Nhóm 5: mọi phản ứng có hại kể cả nhẹ/khiếu nại; Nhóm 6: nhắn lại có triệu chứng bất thường) — chi tiết per-group trong kịch bản đã duyệt.

**Out of Scope:**
- Dấu hiệu **cấp cứu** (khó thở, sưng mặt/lưỡi, mẩn đỏ lan nhanh) → vượt cả leo thang: khuyến cáo **gọi 115 ngay**, không chờ dược sĩ (xem FR-9).

#### FR-9: Relay leo thang tới Dược sĩ (thật) và phản hồi khách
Khi leo thang, hệ thống thông báo ca sang **Zalo dược sĩ thật**, nhận phương án trả lời, và để AI nhắn lại khách bằng giọng persona; trong lúc chờ, AI trấn an khách và cung cấp **hướng dẫn an toàn tạm thời**. Realizes UJ-1, UJ-3.

**Consequences (testable):**
- Tin thông báo sang dược sĩ gồm: **mã ca duy nhất**, tên/định danh khách, nhóm, nội dung/trigger trích dẫn nguyên văn.
- Mỗi ca leo thang có **mã ca**; phương án dược sĩ gửi về được khớp đúng mã ca khi chuyển lại khách (không map nhầm giữa các ca đồng thời).
- Khách nhận tin chờ ("Dạ để em hỏi dược sĩ rồi báo lại anh/chị ngay ạ") ngay khi leo thang, kèm **hướng dẫn an toàn trong lúc chờ** theo kịch bản (vd: tạm chưa tự chỉnh liều, ngồi nghỉ, không uống gấp đôi bù liều).
- **Timeout/fallback:** nếu dược sĩ chưa phản hồi trong ngưỡng SLA (trong giờ làm việc), hệ thống nhắc lại dược sĩ và **không để ca treo im lặng**; ngoài giờ → ghi nhận + báo khách sẽ phản hồi đầu giờ sáng, và nếu là dấu hiệu nguy hiểm thì khuyến cáo khách tới cơ sở y tế/gọi 115 ngay thay vì chờ.
- Phương án dược sĩ gửi về được AI chuyển lại khách **giữ đúng nội dung chuyên môn** (liều/tên thuốc/hướng xử lý không bị thay đổi), chỉ điều chỉnh giọng persona; AI **không tự diễn giải lại liều thuốc**.
- Phản ứng có hại = **ưu tiên cao nhất**, leo thang ngay; khiếu nại chất lượng tiếp nhận ngay, xử lý trong ngày.
- Với trigger **cấp cứu**, hệ thống phát khuyến cáo gọi 115 ngay, song song/không phụ thuộc relay.

**Out of Scope:** *(ngưỡng SLA timeout cụ thể bằng phút — xem §8, cần chốt cùng giờ làm việc nhà thuốc)*

#### FR-10: Lưu toàn bộ luồng hội thoại & ca leo thang vào CRM
Mọi tin (chủ động, trả lời, leo thang, phương án dược sĩ) được lưu vào CRM gắn với hồ sơ khách. Realizes UJ-3.

**Consequences (testable):**
- Mỗi ca leo thang có bản ghi: thời điểm, trigger, nội dung khách, phương án dược sĩ, tin đã gửi lại.
- Chủ nhà thuốc xem lại được lịch sử hội thoại theo khách và danh sách ca leo thang.

**Feature-specific NFRs:**
- **SLA phản hồi:** câu hỏi thường — tức thì trong giờ; báo phản ứng có hại — leo thang ngay; khiếu nại chất lượng — tiếp nhận ngay, xử lý trong ngày; ngoài giờ — ghi nhận, phản hồi đầu giờ sáng hôm sau.

---

### 4.4 Lớp gửi/nhận Zalo Cá Nhân an toàn

**Mô tả:** MeCare gửi và nhận tin qua **Tài khoản Zalo chăm sóc** (Zalo Cá Nhân mang danh persona), tự động hóa trên nền tảng không chính thức. Vì đây là **rủi ro nền tảng lớn nhất** (vi phạm ToS Zalo → khóa tài khoản → mất toàn bộ kênh khách), lớp này phải có cơ chế an toàn. Chi tiết kỹ thuật (openzalo/openzca, phiên web) ở addendum.

**Functional Requirements:**

#### FR-11: Chỉ nhắn khách đã opt-in kết bạn
Hệ thống chỉ gửi tin cho khách đã **chủ động kết bạn** với Tài khoản Zalo chăm sóc tại quầy; không add lạnh, không scrape, không nhắn người lạ hàng loạt.

**Consequences (testable):**
- Khách chưa kết bạn → không nằm trong danh sách gửi tin chủ động.
- Hồ sơ ghi nhận trạng thái kết bạn Zalo.

#### FR-12: Nhịp gửi giống người & throttle chống khóa
Hệ thống gửi với nhịp giống người: jitter thời gian giữa các tin, trần gửi/ngày, chỉ trong giờ hành chính; hỗ trợ warm-up tài khoản mới.

**Consequences (testable):**
- Không gửi loạt tin liên tiếp tức thì; có khoảng nghỉ ngẫu nhiên giữa các tin.
- Có cấu hình trần tin/ngày và **trần kết bạn/ngày** (dưới ngưỡng rủi ro Zalo) `[ASSUMPTION: ngưỡng số cụ thể chưa kiểm chứng — xem §8]`.
- **Biến thể nội dung tin** (không gửi y hệt template hàng loạt) để giảm cờ spam theo độ giống mẫu.
- Theo dõi tín hiệu rủi ro tài khoản (tỉ lệ khách chặn/báo xấu, tin gửi lỗi) và **tự giảm tải/tạm dừng** khi vượt ngưỡng cảnh báo.
- Không gửi ngoài giờ làm việc.

#### FR-13: Giám sát phiên & cảnh báo khi automation hỏng
Hệ thống phát hiện khi phiên Zalo mất kết nối hoặc automation lỗi (vd Zalo đổi giao diện web) và cảnh báo vận hành.

**Consequences (testable):**
- Mất phiên đăng nhập / **gửi thất bại ≥3 lần liên tiếp** `[ASSUMPTION: ngưỡng cụ thể chốt khi vận hành]` → cảnh báo cho người vận hành (Tinsu/chủ nhà thuốc).
- Tin chưa gửi được không bị mất âm thầm; được xếp hàng hoặc báo lỗi rõ ràng.

**Notes:** `[NOTE FOR PM]` Lộ trình dự phòng (đa tài khoản, hoặc migrate khối lượng lớn sang Zalo OA nếu Zalo siết) là **non-goal v1** nhưng cần kiến trúc không chặn đường — ghi cho architecture.

---

### 4.5 CRM & Dashboard (Baserow)

**Mô tả:** Chủ nhà thuốc thấy hồ sơ từng khách, nhóm nào cần chăm, lịch sử hội thoại, và các chỉ số hiệu quả. Realizes UJ-3.

**Functional Requirements:**

#### FR-14: Hồ sơ khách & danh sách theo nhóm
Chủ nhà thuốc xem được hồ sơ từng khách (thông tin, nhóm, thuốc, lịch sử) và lọc khách theo Nhóm chăm sóc.

**Consequences (testable):**
- Lọc ra danh sách khách theo từng nhóm.
- Mở hồ sơ thấy lịch sử hội thoại (FR-10) và lịch nhắc sắp tới.

#### FR-15: Dashboard chỉ số cơ bản
Dashboard hiển thị các chỉ số vận hành cơ bản cho chủ nhà thuốc.

**Consequences (testable):**
- Hiển thị: số tin đã gửi trong tháng vs trần gói; số ca leo thang; số khách theo nhóm.
- `[ASSUMPTION]` Các chỉ số "hiệu quả" (tuân thủ, quay lại, thời gian phản hồi) hiển thị ở mức khả thi với dữ liệu v1; KPI 45%→80%… là **tham vọng marketing**, không phải số đo cam kết (xem §7).

---

### 4.6 Onboarding & setup thủ công

**Mô tả:** v1, MeCare onboarding **tận tay** từng nhà thuốc: cài Tài khoản Zalo chăm sóc, nạp kịch bản, dựng CRM, warm-up tài khoản. Không self-serve. Phù hợp ngưỡng ~10 nhà thuốc đầu.

**Functional Requirements:**

#### FR-16: Quy trình setup tận tay cho một nhà thuốc
MeCare (người vận hành) có thể đưa một nhà thuốc mới lên production: kết nối Tài khoản Zalo chăm sóc, nạp/duyệt kịch bản 6 nhóm, khởi tạo CRM, cấu hình Zalo dược sĩ thật cho relay, warm-up.

**Consequences (testable):**
- Một nhà thuốc mới hoàn tất setup và gửi được tin chăm sóc thật cho khách opt-in.
- Kịch bản được **duyệt nội dung** trước khi đưa vào hệ thống (kịch bản hiện là bản nháp chờ duyệt).
- Relay leo thang được kiểm thử (tin tới Zalo dược sĩ thật và quay lại) trước go-live.
- **Warm-up tài khoản** Zalo chăm sóc chạy tối thiểu một giai đoạn tải thấp trước khi mở tải gói đầy đủ `[ASSUMPTION: thời lượng/cường độ warm-up cụ thể chốt khi vận hành — xem §8]`.

**Notes:** `[NOTE FOR PM]` Ngưỡng ~10 nhà thuốc là giới hạn mô hình thủ công solo (Tinsu) còn chịu được trước khi cần tự động hóa onboarding — xem §8 và Non-Goals.

---

## 5. Non-Goals (Tường minh)

- MeCare **không** là app di động cho khách hàng cuối — mọi tương tác qua Zalo + CRM web.
- MeCare **không** dùng Zalo OA (Official Account) ở v1 — chạy trên Zalo Cá Nhân để giữ cảm giác "nhà thuốc quen".
- MeCare **không** tích hợp đa kênh (SMS, email) ở v1.
- MeCare **không** quản lý chuỗi nhiều chi nhánh ở v1.
- MeCare **không** tích hợp POS/phần mềm bán thuốc/đồng bộ tồn kho ở v1.
- MeCare **không** có billing/thanh toán tự động ở v1 (thu phí thủ công).
- MeCare **không** self-serve onboarding ở v1.
- AI **không** chẩn đoán bệnh và **không** tư vấn y tế ngoài kịch bản đã duyệt — luôn leo thang dược sĩ khi vượt ranh giới.
- MeCare **không** tự đổi liều/đổi thuốc cho khách — chỉ dược sĩ quyết, và đổi thuốc thay thế chỉ khi khách đồng ý.

---

## 6. Phạm Vi MVP

### 6.1 Trong phạm vi
- Tự động hóa nhắn tin chăm sóc qua Tài khoản Zalo chăm sóc, 6 nhóm khách, theo kịch bản đã duyệt (FR-3..FR-6).
- AI trả lời câu hỏi thường gặp + cơ chế leo thang relay tới dược sĩ thật (FR-7..FR-10).
- Lớp gửi/nhận Zalo an toàn: opt-in, throttle, giám sát phiên (FR-11..FR-13).
- CRM trên Baserow: hồ sơ, phân nhóm, nhập liệu tại quầy, dashboard cơ bản (FR-1, FR-2, FR-14, FR-15).
- Onboarding tận tay cho nhà thuốc đầu tiên (Trúc Tâm) và tới ~10 nhà thuốc (FR-16).

### 6.2 Ngoài phạm vi MVP
- Self-serve onboarding — v1 thủ công (lý do: chưa cần khi ≤10 nhà thuốc).
- Zalo OA / đa kênh (SMS, email) — `[NOTE FOR PM]` để dành làm lộ trình dự phòng nếu Zalo siết.
- Quản lý chuỗi nhiều chi nhánh.
- Tích hợp POS/tồn kho.
- Billing/thanh toán tự động.
- Gói giá thứ 2 (nhiều tin hơn) — roadmap doanh thu về sau, v1 một gói duy nhất.
- App di động riêng cho khách.

---

## 7. Tiêu Chí Thành Công

**Primary**
- **SM-1:** Giữ chân nhà thuốc — nhà thuốc pilot (Trúc Tâm) tiếp tục dùng sau tháng đầu, không churn. Validates FR-3..FR-10, FR-16.
- **SM-2:** Đạt **10 nhà thuốc trả phí** trong 1–3 tháng đầu. Validates toàn sản phẩm + FR-16.
- **SM-3:** Tài khoản Zalo chăm sóc **không bị khóa** khi chạy ở mức tải gói (≤1.000 tin/tháng). Validates FR-5, FR-11, FR-12, FR-13.

**Secondary**
- **SM-4:** Ca leo thang được dược sĩ phản hồi và chuyển lại khách trong khung SLA (trong giờ làm việc). Validates FR-8, FR-9, FR-10.
- **SM-5:** Tỉ lệ tin gửi thành công (không lỗi phiên/throttle chặn nhầm). Validates FR-12, FR-13.
- **SM-6 (tham vọng marketing, KHÔNG cam kết đo lường):** cải thiện tuân thủ uống thuốc 45%→80%, quay lại mua 35%→65%, thời gian phản hồi 45 phút→<5 phút, doanh thu lặp lại +30%. Đây là **kỳ vọng/định hướng sales kit**, không phải cam kết hợp đồng. Validates định hướng FR-3, FR-4, FR-7.

**Counter-metrics (không tối ưu)**
- **SM-C1:** Số tin gửi/khách — KHÔNG tối ưu tăng. Nhắn nhiều hơn ≠ chăm tốt hơn; vượt rate limit gây phiền khách và tăng rủi ro khóa Zalo. Counterbalances SM-6.
- **SM-C2:** Tỉ lệ AI tự trả lời ca lẽ ra phải leo thang — KHÔNG tối ưu để "tự động nhiều hơn". Thà leo thang thừa còn hơn bỏ sót ca y tế. Counterbalances SM-4 và mong muốn giảm tải dược sĩ.

---

## 8. Câu Hỏi Mở

1. **Bảng token/tin chính xác & dung lượng gói:** số gốc (phân tích session S25, Jun 1) chưa lưu được — cần Tinsu cung cấp lại để chốt số khách/tháng phục vụ được (khung hiện tại ~30–500 khách/tháng tùy cơ cấu nhóm). Ảnh hưởng cả định giá lẫn kỳ vọng dung lượng.
2. **Ngưỡng hành vi thực của Zalo** (tin/ngày, kết bạn/ngày) — chưa có nguồn xác thực; cần để cấu hình throttle FR-12 đúng.
3. **Cập nhật file kịch bản nguồn** (`kichban-chamsoc-khachhang.md`): còn 27 dòng nhắc persona cũ "Ngọc" + nhiều chỗ "kết nối dược sĩ" viết theo mô hình 2 vai cũ. Cần sửa toàn bộ sang persona "Dược Sĩ Hải" + mô hình relay trước go-live (handoff cho bước cập nhật kịch bản).
4. **Moat dài hạn** nằm ở đâu (dữ liệu kịch bản, mạng lưới khách, quan hệ)? — ảnh hưởng định hướng sản phẩm sau v1.
5. **Ngưỡng chính xác** số nhà thuốc mà onboarding thủ công solo còn chịu được trước khi phải tự động hóa (giả định ~10).
6. **Mô hình Nhóm 5 cắt ngang** trong CRM: "đổi nhóm" hay "gắn cờ trạng thái"? (xem FR-2 Notes).
7. **Ngưỡng SLA timeout relay (bằng phút)** + giờ làm việc chuẩn của nhà thuốc — để FR-9 không treo ca; chốt khi vận hành.
8. **Rủi ro pháp lý persona tên người thật** (R6): có cần minh bạch hoá / ý kiến pháp lý trước khi mở rộng nhiều nhà thuốc?

---

## 9. Chỉ Mục Giả Định (Assumptions Index)

- §2.1/§4.6 — Phân khúc đầu là nhà thuốc đơn lẻ; chuỗi là cơ hội sau.
- §4.1 (FR-2) — v1 xử lý Nhóm 5 như trạng thái/luồng ưu tiên, không xóa nhóm gốc.
- §4.4 (FR-12) — Ngưỡng số tin/ngày + kết bạn/ngày của Zalo chưa kiểm chứng; throttle cấu hình tạm.
- §4.4 (FR-13) — Ngưỡng gửi lỗi liên tiếp (~3) chốt khi vận hành.
- §4.3 (FR-9) — Ngưỡng SLA timeout relay (phút) chốt khi vận hành.
- §4.6 (FR-16) — Thời lượng/cường độ warm-up tài khoản chốt khi vận hành.
- §4.5 (FR-15) — Chỉ số "hiệu quả" hiển thị ở mức dữ liệu v1 cho phép.
- §7 (SM-6) — KPI 45%→80%… là tham vọng marketing, không cam kết đo lường.
- §6.2 — Gói giá thứ 2 là roadmap về sau; v1 một gói.
- §4.6/§8 — Ngưỡng ~10 nhà thuốc cho mô hình thủ công solo.
- §1 — Lợi thế cạnh tranh nằm ở tốc độ thực thi + hiểu nghiệp vụ dược, không phải công nghệ độc quyền (cần xác nhận moat — §8 Q4).

---

## 10. Thẩm Mỹ & Giọng Điệu (Aesthetic & Tone)

Áp cho mọi văn bản sản phẩm tạo ra (tin nhắn khách, UI CRM, landing).

**Giọng persona nhắn khách (Dược Sĩ Hải):**
- Xưng **"em"**, gọi khách **"anh/chị [TÊN]"**; văn phong lịch sự, kết câu "ạ"/"nhé"; mở đầu thường "Dạ,…".
- Đồng hành như **người quen đáng tin cậy — không phải robot nhắc lịch**.
- Cho khách **lựa chọn đánh số (1/2/3)** trong tin hỏi thăm để dễ phản hồi; mỗi lựa chọn ánh xạ thẳng vào nhánh xử lý (vd 1 "đã đỡ"→dừng follow-up; 3 "nặng hơn"→leo thang).
- Cảnh báo y tế dùng ⚠️; tình huống khẩn nêu rõ **115**. Emoji thân thiện vừa phải (💊 😊 🙏 🎂).

**Bảng từ vựng (NÊN / TRÁNH):**

| NÊN dùng | TRÁNH |
|----------|-------|
| nhà thuốc | doanh nghiệp, cơ sở kinh doanh |
| khách hàng | bệnh nhân (trừ ngữ cảnh lâm sàng) |
| tư vấn | hỗ trợ y tế |
| chăm sóc khách hàng | customer service |
| tin nhắn Zalo | message, chat |
| tự động | automated |
| tiết kiệm thời gian / tăng doanh thu | save time / increase revenue |

**Giọng thương hiệu MeCare (marketing/UI):** ấm áp nhưng chuyên nghiệp, để con số tự nói, tránh jargon, mỗi phần có CTA rõ.

**Thẩm mỹ (UI/landing):**
- Màu: teal-green `#0E9E8E` (primary), `#0B7D70` (primary-dark, hover/active), amber `#F59E0B` (accent), nền off-white `#F7F9FB`, chữ near-black `#1A2332`. Hero gradient `linear-gradient(135deg,#0B7D70,#0E9E8E,#1BB8A8)`; shadow primary `rgba(14,158,142,0.25)`.
- Typography: heading **Plus Jakarta Sans**, body **Inter** (hỗ trợ dấu tiếng Việt tốt).
- Icon (Phosphor) thay ảnh stock; con số nổi bật; nhiều whitespace; bo góc mềm.
- **Anti-references:** không corporate lạnh lùng, không ảnh stock người thật, không xanh dương thuần, không sales pitch khoe khoang, không tiếng Anh/jargon trong copy.

---

## 11. Ràng Buộc & Lằn Ranh An Toàn (Constraints & Guardrails)

### 11.1 An toàn y tế
- AI **không chẩn đoán**, **không tư vấn ngoài kịch bản đã duyệt**, **không tự đổi liều/đổi thuốc**.
- **Quy tắc bù liều bắt buộc:** bỏ liều quá lâu → bỏ qua liều đó, **không uống gấp đôi để bù** (cảnh báo phản ứng không mong muốn); luôn nhắc khách "không tự điều chỉnh liều".
- Đổi thuốc thay thế: chỉ khi khách đồng ý và do dược sĩ kiểm tra tương đương hoạt chất/liều/dạng bào chế (FR-8/FR-9) — "quy định bắt buộc".
- Thuốc kê đơn không bán thêm tự do — cần đơn bác sĩ mới; đơn bác sĩ có giá trị 5 ngày.
- TPCN phải nêu rõ "không phải thuốc điều trị bệnh".
- **Trong lúc chờ dược sĩ (relay):** AI cung cấp hướng dẫn an toàn tạm thời theo kịch bản (tạm chưa tự chỉnh liều/ngồi nghỉ/theo dõi), không tự ra phương án điều trị.
- Dấu hiệu cấp cứu → khuyến cáo gọi 115 ngay (FR-9), không chờ.
- Mọi tình huống AI không chắc → leo thang (FR-8 catch-all).

### 11.2 Quyền riêng tư & xử lý khiếu nại
- Khách có quyền **từ chối cung cấp thông tin sức khỏe** — không ép, vẫn phục vụ (Nhóm 6).
- Nhà thuốc **không lưu/chia sẻ thông tin sức khỏe ra bên ngoài**; thông tin khiếu nại được giữ bí mật.
- **Quy trình khiếu nại chất lượng (Nhóm 5):** thu thập **ảnh sản phẩm + hộp/lọ (số lô, hạn sử dụng) + mô tả vấn đề**; cam kết đổi hàng/hoàn tiền/báo nhà sản xuất; tiếp nhận ngay, xử lý trong ngày.
- Khuyến mãi chỉ gửi cho khách từng mua sản phẩm liên quan — không spam (FR-4 Nhóm 4).
- `[NOTE FOR PM]` Dữ liệu sức khỏe khách lưu trên Baserow — cần làm rõ chính sách lưu trữ/bảo mật ở architecture (data governance).

### 11.3 Chi phí & dung lượng
- **Trần gói 1.000 tin/tháng/nhà thuốc** vừa là điểm giá vừa là van an toàn rủi ro Zalo (FR-5).
- Định giá neo theo chi phí token thực mỗi tin (bảng chi tiết ở addendum, cần Tinsu xác nhận số gốc — §8).

---

## 12. Rủi Ro & Giảm Thiểu (Risk Register)

| # | Rủi ro | Mức | Giảm thiểu | FR liên quan |
|---|--------|-----|-----------|--------------|
| R1 | **Tự động hóa Zalo Cá Nhân vi phạm ToS → khóa tài khoản**, mất toàn bộ kênh khách | Cao nhất | Opt-in tại quầy; nhịp giống người + throttle; trần gói ≤1.000 tin/tháng; warm-up; giám sát phiên; lộ trình dự phòng (đa tài khoản / Zalo OA) | FR-5, FR-11, FR-12, FR-13 |
| R2 | **Trách nhiệm nội dung y tế** — AI nhắn sai về thuốc gây hậu quả sức khỏe | Cao | Chỉ nói trong kịch bản duyệt; trigger leo thang chặt; catch-all "không chắc → dược sĩ"; cấp cứu → 115 | FR-7, FR-8, FR-9, §11.1 |
| R3 | **Solo founder vận hành thủ công không scale** | Trung bình | Giới hạn ~10 nhà thuốc trước khi tự động hóa onboarding; setup chuẩn hóa | FR-16, §8 |
| R4 | **Phụ thuộc giao diện web Zalo** — Zalo đổi UI làm hỏng automation | Trung bình–cao | Giám sát phiên + cảnh báo; không mất tin âm thầm; lộ trình dự phòng | FR-13 |
| R5 | **Số token/dung lượng gói chưa chốt** — sai lệch định giá/kỳ vọng | Trung bình | Đánh dấu ở §8; xác nhận số gốc trước khi mở rộng nhiều nhà thuốc | §8 Q1 |
| R6 | **Persona mang tên người thật ("Dược Sĩ Hải") do AI vận hành** — rủi ro cảm nhận "mạo danh"/pháp lý nếu khách biết không phải người thật trả lời | Trung bình | Dược sĩ thật (Hải) là người chịu trách nhiệm chuyên môn sau relay; nội dung y tế luôn qua dược sĩ; cân nhắc minh bạch hoá ở mức phù hợp `[NOTE FOR PM]` cần ý kiến pháp lý trước khi mở rộng nhiều nhà thuốc | FR-9, §11 |

---

## 13. Tại Sao Là Bây Giờ (Why Now)

- **Zalo đã là kênh giao tiếp mặc định** giữa nhà thuốc và khách ở Việt Nam — tỉ lệ đọc/tin tưởng cao trên Zalo Cá Nhân.
- **AI hội thoại nay đủ rẻ, đủ tốt** để soạn tin tư vấn sức khỏe theo từng ca trong khung kịch bản.
- Đã có **khách pilot (Trúc Tâm)** và **kịch bản 6 nhóm** dựng xong → rút ngắn đường tới production.
