# Addendum — MeCare (chi tiết cho PRD/Architecture)

Tài liệu này giữ phần chi tiết kỹ thuật không thuộc thân brief nhưng cần cho các bước downstream (PRD, architecture).

## Kiến Trúc Kỹ Thuật (cần làm rõ ở PRD/architecture)

- **Điều phối:** n8n workflows.
- **Tác vụ AI:** Hermes agent — https://github.com/nousresearch/hermes-agent (Nous Research). Dùng cho soạn tin / hội thoại theo kịch bản.
- **CRM/DB:** Baserow (hồ sơ khách, phân nhóm, dashboard).
- **Kênh:** Zalo Cá Nhân của nhà thuốc (không phải Zalo OA).
- **Lớp gửi/nhận Zalo:** automation trên **bản web của Zalo** qua plugin openzalo:
  - https://github.com/darkamenosa/openzca
  - https://github.com/darkamenosa/openzalo

**Hệ quả kỹ thuật cần lưu ở PRD:**
- Phụ thuộc DOM/giao diện web Zalo — Zalo đổi UI có thể làm hỏng automation.
- Cần phiên đăng nhập web Zalo ổn định cho mỗi nhà thuốc.
- Là kênh không chính thức, nên có rủi ro vi phạm ToS và khoá tài khoản (xem phần dưới).

## Phân Tích Rủi Ro Zalo Cá Nhân (mở rộng)

Trần 1.000 tin/tháng vừa là điểm giá, vừa là van an toàn, vì:
- Tài khoản cá nhân Zalo có ngưỡng hành vi; vượt ngưỡng sẽ bị tạm khoá hoặc khoá vĩnh viễn.
- Chỉ nhắn ổn định được với người đã kết bạn; nhắn người lạ hàng loạt dễ bị gắn cờ spam.
- Gửi qua công cụ tự động vi phạm ToS Zalo, kéo theo rủi ro pháp lý và vận hành.

Chiến lược giảm thiểu cần đưa vào PRD:
1. Opt-in tại quầy (khách tự kết bạn) — không scrape, không add lạnh.
2. Nhịp gửi giống người: thêm jitter thời gian, đặt trần mỗi ngày, chỉ gửi trong giờ hành chính.
3. Trần tải gói (≤1.000 tin/tháng) giữ lưu lượng dưới ngưỡng rủi ro.
4. Warm-up tài khoản mới trước khi chạy tải thật.
5. Lộ trình dự phòng: dùng đa tài khoản, hoặc migrate phần khối lượng lớn sang Zalo OA nếu Zalo siết.
6. **[ASSUMPTION]** Cần kiểm chứng số liệu ngưỡng thực tế của Zalo (tin/ngày, kết bạn/ngày) — chưa có nguồn xác thực.

## Mô Hình Giá & Token (từ session trước — cần Tinsu xác nhận số)

- Giá: 399.000đ/tháng, trần 1.000 tin/tháng; phí setup 3.000.000đ một lần.
- Phương pháp định giá: tính token tiêu thụ mỗi tin nhà thuốc gửi khách, suy ra biên lợi nhuận, rồi định gói.

**Ước tính số khách phục vụ mỗi tháng (khung suy luận từ trần 1.000 tin):**

Số khách phục vụ được phụ thuộc vào tần suất nhắn trung bình mỗi khách/tháng, vốn khác nhau theo nhóm:

| Nhóm | Nhịp nhắn chủ động | ~Tin/khách/tháng |
|------|---------------------|------------------|
| 1 — Mãn tính | Nhắc hằng ngày + sự kiện | ~20-30 (cao nhất) |
| 2 — OTC | 1 follow-up sau 2-3 ngày | ~1-2 |
| 3 — Kê đơn | Nhắc lịch + 1 follow-up | ~5-10 |
| 4 — TPCN | Follow-up 7 ngày + nhắc mua lại | ~2-3 |
| 5 — Phản ánh | Khách chủ động (phản ứng) | biến thiên |
| 6 — Không ghi info | Tối thiểu | ~0-1 |

Nếu phần lớn khách thuộc nhóm nhẹ (OTC/TPCN, ~2-3 tin/tháng), 1.000 tin phục vụ được **~300-500 khách/tháng**. Nếu nhiều khách mãn tính (nhịp nhắn cao), con số tụt mạnh xuống **~30-50 khách/tháng**.

> **[CẦN TINSU XÁC NHẬN]** Bảng token/tin chính xác và con số khách/tháng đã chốt được phân tích ở session S25 (Jun 1, 7:04 PM), nhưng **không được lưu thành observation truy xuất được** trong memory. Khung trên chỉ là suy luận từ kịch bản 6 nhóm; cần Tinsu cung cấp lại số gốc (hoặc tái phân tích) để đưa con số chính xác vào PRD. Đây là input quan trọng cho cả pricing lẫn việc quản lý kỳ vọng về dung lượng gói.

## 6 Nhóm Khách Hàng (nguồn: kichban-chamsoc-khachhang.md)

Bảng vận hành đầy đủ (đặc điểm, nhịp nhắn chủ động, mức ưu tiên phản hồi, ngưỡng leo thang cho dược sĩ) đã có sẵn trong `kichban-chamsoc-khachhang.md`. Tóm tắt từng nhóm:

1. **NHÓM 1 — Bệnh mãn tính:** dùng thuốc dài ngày, nguy cơ quên liều; nhắn hằng ngày + theo sự kiện (hết thuốc, tái khám, chỉ số); leo thang khi chỉ số bất thường/quên nhiều ngày/triệu chứng lạ.
2. **NHÓM 2 — OTC ngắn ngày:** tự điều trị ngắn; 1 follow-up sau 2-3 ngày; leo thang khi hết liệu trình không đỡ hoặc nặng hơn.
3. **NHÓM 3 — Thuốc kê đơn:** tuân thủ nghiêm ngặt; nhắc lịch + 1 follow-up sau 5-7 ngày; leo thang khi phản ứng lạ hoặc xin đổi thuốc.
4. **NHÓM 4 — TPCN:** không cần giám sát chặt; follow-up 7 ngày + nhắc mua lại; leo thang khi cần tư vấn sâu.
5. **NHÓM 5 — Phản ánh/khiếu nại:** khách chủ động liên hệ; **phản hồi ngay lập tức, ưu tiên cao nhất**; leo thang mọi phản ứng có hại (kể cả nhẹ) hoặc khiếu nại chất lượng.
6. **NHÓM 6 — Không ghi được thông tin:** 5 tình huống (từ chối chia sẻ, mua hộ, khách vội, người già khó giao tiếp, khách lần đầu) — cách tiếp cận không gây áp lực, cung cấp tối thiểu thông tin an toàn, mở cửa chia sẻ tự nguyện lần sau.

## Tài Sản Đã Có

- `website/index.html` — sales kit 11 section (đã build).
- `website/BRAND.md` — brand guideline.
- `kichban-chamsoc-khachhang.md` — kịch bản chăm sóc 6 nhóm.
- `videos/` — showcase Remotion (ZaloChat, PharmacyDashboard, MeCareShowcase).
- Khách pilot: Nhà Thuốc Trúc Tâm.

## Câu Hỏi Mở (cần trả lời trước/trong PRD)

1. Moat dài hạn nằm ở đâu (dữ liệu kịch bản, mạng lưới, quan hệ)?
2. Các KPI trong sales kit (45%→80%...) là cam kết hay tham vọng marketing?
3. Ngưỡng số nhà thuốc mà setup thủ công (solo) còn chịu được trước khi phải tự động hoá onboarding?
4. Có gói giá thứ 2 (nhiều tin hơn) trong roadmap gần không?
5. Bảng token/tin chính xác (xem [CẦN TINSU XÁC NHẬN] phần Mô Hình Giá) — số gốc để đưa vào PRD.

_Đã chốt ở review: mục tiêu 10 nhà thuốc trả phí (1-3 tháng); lớp Zalo = automation web qua openzalo/openzca._
