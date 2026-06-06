---
title: "Product Brief — MeCare"
status: draft
created: 2026-06-05
updated: 2026-06-05
---

# Product Brief: MeCare

## Tóm Tắt Điều Hành

MeCare là phần mềm SaaS giúp **nhà thuốc bán lẻ tại Việt Nam tự động chăm sóc khách hàng qua Zalo** — nhắc uống thuốc, theo dõi sau bán, nhắc tái khám/mua lại, và trả lời thắc mắc — bằng AI, mà không cần thuê thêm nhân sự. Hệ thống chạy trên **Zalo Cá Nhân của chính nhà thuốc** (kênh khách hàng Việt đã quen và tin tưởng), kết hợp một **CRM nhẹ dựng trên Baserow** để lưu hồ sơ khách, phân nhóm và đo lường hiệu quả.

Vấn đề cốt lõi: nhà thuốc bán lẻ gần như **không chăm sóc khách sau khi bán**. Khách mua thuốc xong là mất dấu — quên uống thuốc, không tái khám, không quay lại. Chủ nhà thuốc biết đó là tiền rơi mất, nhưng không có thời gian, nhân sự hay công cụ để theo. MeCare biến việc chăm sóc thủ công bất khả thi (gọi từng người) thành quy trình tự động chạy nền.

Tại sao là bây giờ: Zalo đã là kênh giao tiếp mặc định giữa nhà thuốc và khách ở Việt Nam, và AI hội thoại nay đủ rẻ, đủ tốt để soạn tin tư vấn sức khỏe theo từng ca. Sản phẩm đã có khách hàng đầu tiên (**Nhà Thuốc Trúc Tâm**) làm pilot, kịch bản chăm sóc cho 6 nhóm khách hàng đã được xây xong, và mục tiêu là **launch v1 trong 1 tuần**.

## Vấn Đề

Nhà thuốc bán lẻ sống bằng khách quen, nhưng vận hành như thể mỗi lần bán là một giao dịch một lần:

- **Mất khách sau bán.** Bán xong là hết liên lạc. Không ai nhắc bệnh nhân mãn tính uống thuốc đúng, không ai hỏi thăm sau 2-3 ngày xem thuốc có hiệu quả, không ai nhắc hết thuốc thì quay lại. Tỉ lệ tuân thủ điều trị thấp, tỉ lệ quay lại thấp.
- **Không có cách chăm sóc ở quy mô.** Một quầy thuốc có hàng trăm tới hàng nghìn khách. Chủ nhà thuốc không thể gọi hỏi thăm từng người — nên không ai làm cả. Năng lực chăm sóc thực tế giới hạn ở vài chục khách "thân".
- **Không có dữ liệu khách.** Phần lớn nhà thuốc không lưu hồ sơ ai mua gì, bệnh gì, dị ứng gì. Mỗi lần khách quay lại là bắt đầu lại từ đầu, mất cơ hội tư vấn an toàn và bán đúng.
- **Phản hồi/khiếu nại rơi rụng.** Khách gặp tác dụng phụ hoặc thắc mắc thường không biết hỏi ai, hoặc nhắn Zalo nhưng nhà thuốc trả lời chậm/bỏ sót.

Cái giá của hiện trạng: doanh thu lặp lại thất thoát, rủi ro an toàn thuốc (tác dụng phụ phát hiện muộn), và khách trôi sang nhà thuốc khác. Chủ nhà thuốc cảm nhận điều này hằng ngày nhưng coi đó là "chuyện không sửa được".

## Giải Pháp

MeCare cài lên Zalo Cá Nhân của nhà thuốc một trợ lý chăm sóc khách tự động:

1. **Thu thập tại quầy.** Lúc bán, nhân viên xin SĐT/kết bạn Zalo và ghi nhanh thông tin khách (thuốc mua, tình trạng) vào CRM.
2. **Phân nhóm tự động.** Khách được xếp vào 1 trong 6 nhóm chăm sóc (bệnh mãn tính, OTC ngắn ngày, thuốc kê đơn, TPCN, phản ánh/khiếu nại, và nhóm không ghi được thông tin), mỗi nhóm có nhịp nhắn và mức ưu tiên riêng.
3. **Chăm sóc chủ động bằng AI.** Hệ thống tự soạn và gửi tin đúng thời điểm — nhắc uống thuốc hằng ngày, hỏi thăm sau 2-3 ngày, nhắc hết thuốc/tái khám — theo đúng kịch bản đã duyệt cho từng nhóm, với giọng văn của nhà thuốc, không máy móc.
4. **Trả lời và leo thang.** AI trả lời thắc mắc thường gặp tức thì; khi gặp dấu hiệu cần dược sĩ (tác dụng phụ bất thường, khiếu nại chất lượng, chỉ số bất thường) thì chuyển cho người thật xử lý ngay.
5. **CRM + Dashboard (Baserow).** Chủ nhà thuốc thấy hồ sơ từng khách, nhóm nào cần chăm, và các chỉ số hiệu quả (tuân thủ, quay lại, thời gian phản hồi).

Trải nghiệm với khách vẫn là "nhắn tin với nhà thuốc quen qua Zalo" — không app mới, không đăng ký. Phần AI và CRM ẩn phía sau.

> Kiến trúc kỹ thuật (n8n điều phối, Hermes agent cho phần tác vụ AI, Baserow làm CRM/DB) — chi tiết trong addendum, sẽ được làm rõ ở PRD/architecture.

## Điều Làm MeCare Khác Biệt

- **Chạy trên Zalo Cá Nhân, không phải Zalo OA.** Khách nhắn với nhà thuốc họ quen, không phải một "Official Account" lạnh lùng — tỉ lệ đọc và tin tưởng cao hơn hẳn. (Đánh đổi: rủi ro vận hành tài khoản cá nhân — xem mục Rủi Ro.)
- **Đóng gói theo nghiệp vụ dược, không phải chatbot chung chung.** Kịch bản 6 nhóm khách, ngưỡng leo thang cho dược sĩ, và giọng tư vấn an toàn thuốc — những thứ một chatbot tổng quát không có sẵn.
- **Trọn gói cho nhà thuốc nhỏ.** Setup tận tay + giá theo gói tháng vừa túi tiền nhà thuốc lẻ — không bắt chủ nhà thuốc tự cấu hình.
- **[ASSUMPTION] Lợi thế thật sự là tốc độ thực thi và hiểu nghiệp vụ dược địa phương, không phải công nghệ độc quyền.** Hệ thống dựng từ công cụ mở (n8n, Baserow, Hermes). Cần xác nhận: moat dài hạn nằm ở đâu (dữ liệu kịch bản, mạng lưới khách, hay quan hệ?).

## Đối Tượng Phục Vụ

**Người mua & người dùng chính: Chủ nhà thuốc bán lẻ độc lập.**
- Sở hữu 1 quầy/nhà thuốc, tự quyết định mua, ngân sách nhạy cảm.
- Đau đáu chuyện giữ khách và doanh thu lặp lại, nhưng không rành công nghệ và không có thời gian.
- Thành công với họ = thêm khách quay lại, ít tốn công, và cảm giác "nhà thuốc của mình chuyên nghiệp hơn".

**Người dùng phụ:** nhân viên bán thuốc (người nhập liệu tại quầy) và dược sĩ (người nhận ca leo thang).

**[ASSUMPTION]** Phân khúc đầu tập trung nhà thuốc đơn lẻ; chuỗi nhà thuốc là cơ hội về sau, chưa phải v1.

## Tiêu Chí Thành Công

**Tín hiệu thành công với khách hàng (nhà thuốc):**
- Nhà thuốc duy trì dùng sau pilot (giữ chân, không churn sau tháng đầu).
- Chỉ số chăm sóc cải thiện rõ — mục tiêu nêu trong sales kit: tuân thủ uống thuốc 45%→80%, tỉ lệ quay lại mua 35%→65%, thời gian phản hồi 45 phút→<5 phút, doanh thu lặp lại +30%. *([ASSUMPTION] đây là mục tiêu/kỳ vọng marketing, chưa phải số đo thực tế — cần ghi rõ ở PRD đâu là cam kết, đâu là tham vọng.)*

**Mục tiêu kinh doanh (v1 / pilot):**
- Đưa Trúc Tâm lên production chạy thật trong 1 tuần.
- **Mục tiêu 10 nhà thuốc trả phí** trong giai đoạn đầu (1-3 tháng).

**Ràng buộc vận hành:** tài khoản Zalo Cá Nhân không bị khoá khi chạy ở mức tải gói (≤1000 tin/tháng).

## Phạm Vi

**Trong v1:**
- Tự động hoá nhắn tin chăm sóc qua Zalo Cá Nhân (6 nhóm khách, theo kịch bản đã có).
- AI trả lời thắc mắc thường gặp + cơ chế leo thang cho dược sĩ.
- CRM trên Baserow: hồ sơ khách, phân nhóm, nhập liệu tại quầy.
- Dashboard chỉ số cơ bản.
- Onboarding/setup tận tay cho nhà thuốc đầu tiên.

**Ngoài phạm vi v1 (ghi rõ để chốt biên):**
- Self-serve onboarding (nhà thuốc tự cài) — v1 setup thủ công.
- Tích hợp Zalo OA / đa kênh (SMS, email).
- Quản lý chuỗi nhiều chi nhánh.
- Tích hợp phần mềm bán thuốc/POS, đồng bộ tồn kho.
- Thanh toán/billing tự động.
- **[ASSUMPTION]** App di động riêng — không có; mọi tương tác qua Zalo + CRM web.

## Rủi Ro & Giả Định Then Chốt

**Rủi ro #1 — Tự động hoá Zalo Cá Nhân vi phạm điều khoản & nguy cơ khoá tài khoản.** Đây là rủi ro nền tảng, cần phân tích kỹ ở PRD:
- Zalo Cá Nhân **không thiết kế cho nhắn tự động/hàng loạt**. Hành vi bot có thể bị Zalo gắn cờ spam → **khoá tài khoản**, mất toàn bộ kênh khách của nhà thuốc.
- Cách thực thi: automation trên **bản web của Zalo** qua plugin openzalo/openzca (mã nguồn mở) — kênh không chính thức, điểm rủi ro lớn nhất.
- Ràng buộc đã biết/cần xác minh: phải kết bạn trước mới nhắn được; giới hạn số tin/kết bạn mỗi ngày; phụ thuộc vào việc Zalo không đổi giao diện web khiến automation hỏng.
- **Giảm thiểu (đề xuất):** opt-in thật — khách chủ động kết bạn tại quầy; nhịp gửi giống người, có khoảng nghỉ; trần tải ≤1000 tin/tháng (gói giá vừa khít vai trò "van an toàn"); warm-up tài khoản; lộ trình dự phòng (nhiều tài khoản / chuyển sang Zalo OA nếu cần). *Chi tiết & nguồn trong addendum.*

**Rủi ro #2 — Trách nhiệm nội dung y tế.** AI nhắn về thuốc → sai sót có hậu quả sức khoẻ. Cần ngưỡng leo thang chặt, không để AI tự tư vấn ngoài kịch bản đã duyệt.

**Rủi ro #3 — Solo founder, vận hành thủ công.** Tinsu build và chạy một mình. Setup tận tay không scale; cần xác định ngưỡng số nhà thuốc mà mô hình thủ công còn chịu được trước khi phải tự động hoá onboarding.

**Rủi ro #4 — Timeline 1 tuần.** Rất gấp cho cả sản phẩm + go-live khách thật. **[ASSUMPTION]** 1 tuần = đưa pilot Trúc Tâm chạy thật, chưa phải sản phẩm đa khách hoàn chỉnh.

## Mô Hình Kinh Doanh

- **Giá:** 399.000đ/tháng, trần 1.000 tin nhắn/tháng. Phí setup một lần 3.000.000đ.
- Mô hình neo theo chi phí token thực tế mỗi tin (phân tích ở session trước — xem addendum).
- **[ASSUMPTION]** Gói cao hơn (nhiều tin hơn) là hướng mở rộng doanh thu về sau; v1 một gói duy nhất.

## Tầm Nhìn

Nếu thành công, MeCare trở thành **lớp chăm sóc khách hàng mặc định cho nhà thuốc bán lẻ Việt Nam** — biến mỗi quầy thuốc lẻ thành một dịch vụ chăm sóc sức khoẻ chủ động, giữ chân khách bằng quan hệ thay vì chỉ bằng giá. Từ một quầy (Trúc Tâm) tới mạng lưới nhiều nhà thuốc, dữ liệu chăm sóc tích luỹ thành lợi thế: kịch bản tốt hơn, cảnh báo an toàn thuốc sớm hơn, và mở sang đa kênh/chuỗi khi nền tảng vận hành đủ vững.
