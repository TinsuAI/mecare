---
title: "Đối Chiếu Brief ↔ PRD — MeCare"
status: draft
created: 2026-06-06
source: briefs/brief-MeCare-2026-06-05/brief.md
target: prds/prd-MeCare-2026-06-05/prd.md + addendum.md
---

# Đối Chiếu Brief → PRD+Addendum: Những Gì Bị Rơi Hoặc Bị Biến Dạng

Mục tiêu: soi xem **brief** (nguồn) có ý nào — nhất là ý định **định vị, giọng điệu, cảm xúc, kinh doanh** — bị cấu trúc FR của PRD làm rơi rụng hoặc bóp méo. PRD viết rất chắc ở phần năng lực chức năng (FR), nhưng đúng như lo ngại, một số **ý định mềm** đã loãng đi.

Dưới đây là 5 gap cụ thể, xếp theo mức độ nghiêm trọng.

---

## Gap 1 — Định vị "Trọn gói cho nhà thuốc nhỏ" bị hạ cấp thành thao tác setup nội bộ
**Mức: CAO**

- **Brief nói gì:** Trong mục "Điều Làm MeCare Khác Biệt", brief nêu rõ một **lợi thế cạnh tranh**: *"Trọn gói cho nhà thuốc nhỏ — Setup tận tay + giá theo gói tháng vừa túi tiền nhà thuốc lẻ — không bắt chủ nhà thuốc tự cấu hình."* Đây là một **luận điểm định vị bán hàng**: MeCare thắng vì gỡ bỏ gánh nặng kỹ thuật cho người không rành công nghệ.
- **PRD phủ ở đâu:** PRD chỉ giữ phần *cơ chế* (FR-16 "setup tận tay") và liệt "self-serve" vào Non-Goals. Nhưng PRD trình bày setup thủ công như một **giới hạn tạm thời của v1** ("chưa cần khi ≤10 nhà thuốc"), KHÔNG phải như một **điểm mạnh bán hàng**. Sắc thái đảo ngược: brief coi "làm hộ" là giá trị; PRD coi đó là nợ kỹ thuật phải tự động hóa sau.
- **Vì sao quan trọng:** Downstream (UX, sales copy, landing) có thể vô tình giấu hoặc xin lỗi cho việc setup thủ công, thay vì biến nó thành lời hứa "anh/chị không phải đụng tay gì cả". Mất một wedge định vị cho phân khúc không-rành-công-nghệ.

---

## Gap 2 — Con số giá (399k/tháng, setup 3 triệu) bị đẩy hết vào addendum và gắn cờ "chưa chốt"
**Mức: CAO**

- **Brief nói gì:** Brief có hẳn mục "Mô Hình Kinh Doanh" với số rõ ràng ở thân tài liệu: **399.000đ/tháng, trần 1.000 tin/tháng, phí setup một lần 3.000.000đ.** Đây là quyết định kinh doanh đã có, đặt ngang hàng với tầm nhìn và phạm vi.
- **PRD phủ ở đâu:** Thân PRD gần như **không có giá**. Con số bị đẩy hết sang addendum §3, và ở đó lại bị bao quanh bởi cảnh báo *"cần Tinsu xác nhận số gốc — Open Q1"*, bảng token suy luận, Risk R5. PRD §11.3 chỉ nhắc "trần gói 1.000 tin" như van an toàn, không nêu giá tiền.
- **Vì sao quan trọng:** Brief trình bày giá như **đã quyết**; PRD trình bày như **đang ngỏ**. Đó là biến dạng ý định kinh doanh: phần *cấu trúc giá* (399k + 3tr setup) đã chốt và độc lập với việc *bảng token chưa xác nhận*. Trộn hai thứ làm đọc giả PRD tưởng cả mô hình giá còn lỏng. Nên tách: "cấu trúc giá đã chốt" vs "biên token cần xác nhận".

---

## Gap 3 — Khung cảm xúc "chuyện không sửa được" / nỗi cam chịu của chủ nhà thuốc bị bay mất
**Mức: TRUNG BÌNH**

- **Brief nói gì:** Brief đóng đinh một **insight cảm xúc** mạnh: *"Chủ nhà thuốc cảm nhận điều này hằng ngày nhưng coi đó là 'chuyện không sửa được'."* Và: mất khách là *"tiền rơi mất"* mà chủ biết nhưng bất lực. Đây là đòn bẩy tâm lý trung tâm — MeCare bán cho người đã **đầu hàng** vấn đề.
- **PRD phủ ở đâu:** PRD §1 và JTBD (§2.1) diễn lại vấn đề ở dạng *lý tính* ("không có thời gian, nhân sự hay công cụ"; "doanh thu rơi mất"). Sắc thái **cam chịu/bất lực** — thứ tạo ra "aha" trong sales — không còn. JTBD có dòng cảm xúc "chăm khách tử tế mà không kiệt sức" nhưng đó là trạng thái *mong muốn*, không phải nỗi đau cam chịu hiện tại.
- **Vì sao quan trọng:** Đây chính là loại "qualitative idea" mà cấu trúc FR dễ nuốt mất. Marketing/landing/onboarding nên giữ được câu chuyện "anh/chị tưởng không sửa được — nhưng có cách". Mất nó, copy dễ rơi vào liệt kê tính năng khô khan.

---

## Gap 4 — Luận điểm cạnh tranh "khách trôi sang nhà thuốc khác" bị làm nhạt
**Mức: TRUNG BÌNH**

- **Brief nói gì:** Brief nêu cái giá hiện trạng gồm ba phần, trong đó có **"khách trôi sang nhà thuốc khác"** — tức MeCare không chỉ chống thất thoát doanh thu, mà còn là vũ khí **giữ khách khỏi đối thủ**. Tầm nhìn brief cũng nhấn "giữ chân khách bằng quan hệ thay vì chỉ bằng giá" (đối lập với cạnh tranh giá).
- **PRD phủ ở đâu:** PRD §1 giữ được vế "giữ chân bằng quan hệ thay vì giá" (tốt). Nhưng vế **mất khách vào tay nhà thuốc khác** (cạnh tranh trực diện) biến mất khỏi phần vấn đề — PRD chỉ nói "không quay lại", trung lập, không có đối thủ. Ý định "đây là phòng thủ thị phần" bị loãng.
- **Vì sao quan trọng:** Với chủ nhà thuốc, nỗi sợ mất khách vào tay quầy bên cạnh là động lực mua mạnh hơn nỗi sợ "doanh thu lặp lại trừu tượng". Sales/positioning nên giữ. Mức trung bình vì tầm nhìn vẫn còn vế "quan hệ vs giá".

---

## Gap 5 — Câu hỏi moat dài hạn: từ "ẩn số chiến lược của founder" thành một dòng phụ lục
**Mức: THẤP**

- **Brief nói gì:** Brief đặt thẳng một câu hỏi chiến lược có gắn `[ASSUMPTION]`: *"Lợi thế thật sự là tốc độ thực thi và hiểu nghiệp vụ dược địa phương, không phải công nghệ độc quyền... Cần xác nhận: moat dài hạn nằm ở đâu (dữ liệu kịch bản, mạng lưới khách, hay quan hệ?)."* Đây là một dấu hỏi định hướng sản phẩm của founder.
- **PRD phủ ở đâu:** PRD CÓ chuyển tải — §9 Assumptions Index ghi "lợi thế ở tốc độ + hiểu nghiệp vụ dược" và §8 Open Q4 hỏi "Moat dài hạn nằm ở đâu". Nội dung được giữ, nhưng **trọng số** bị hạ: từ một tuyên bố định vị (trong mục Khác Biệt của brief) xuống thành một câu hỏi mở thứ tự 4 và một dòng index. Không sai, chỉ mất độ nổi bật.
- **Vì sao quan trọng:** Thấp vì thông tin không mất, chỉ giảm tầm nhìn. Lưu ý cho ai đọc PRD: đừng coi moat là chuyện phụ — brief đặt nó ngang hàng với các yếu tố khác biệt khác.

---

## Tổng Kết

PRD bảo toàn rất tốt phần **năng lực chức năng, rủi ro Zalo, an toàn y tế, mô hình relay, giọng persona** (§10 thậm chí còn phong phú hơn brief). Phần bị bào mòn đúng như dự đoán là **ý định mềm**: định vị bán hàng (Gap 1, 4), quyết định kinh doanh đã chốt (Gap 2), và móc nối cảm xúc (Gap 3). Khuyến nghị: bổ sung một mục ngắn "Định vị & Thông điệp" vào PRD (hoặc giữ riêng cho marketing) để các gap 1–4 không bị mất khi đi xuống UX/landing/sales.
