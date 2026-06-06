---
title: "Đối Chiếu Kịch Bản ↔ PRD — MeCare"
source: kichban-chamsoc-khachhang.md (746 dòng)
prd: prd.md + addendum.md
reviewer: reconcile pass
date: 2026-06-06
status: review
---

# Đối Chiếu Kịch Bản Chăm Sóc ↔ PRD (FR-3/4/5/8/9 + §11 Guardrails)

> **Nguồn:** `kichban-chamsoc-khachhang.md` — kịch bản Zalo cá nhân Nhà thuốc Trúc Tâm, 6 nhóm khách, quy tắc vận hành, trigger leo thang, rate limit, mẫu tin.
> **PRD:** `prd.md` (FR + guardrails) + `addendum.md` (relay, token, throttle).
> **Mục tiêu:** kiểm tra FR-3 (soạn tin), FR-4 (cadence), FR-5 (rate limit), FR-8 (trigger leo thang), FR-9 (relay), §11 (guardrails) có phản ánh trung thành quy tắc vận hành, ngưỡng số, trigger, lằn ranh y tế trong kịch bản không.

---

## 1. Phần PRD ĐÃ phản ánh đúng (đối chứng nhanh)

| Quy tắc kịch bản | Dòng nguồn | FR/PRD tương ứng | Trạng thái |
|---|---|---|---|
| 6 nhóm + nhịp nhắn + trigger tổng quan | 19–26 | §4.2 bảng nhóm, FR-2/FR-3/FR-4 | OK |
| Rate limit Nhóm 1: 3 tin/ngày (sáng+tối+1 chăm sóc) | 737 | FR-5 / §4.2 bảng | OK |
| Rate limit Nhóm 2: 3 tin/7 ngày | 738 | FR-5 / §4.2 | OK |
| Rate limit Nhóm 3: lịch đơn + 1 tin/tuần | 739 | FR-5 / §4.2 | OK |
| Rate limit Nhóm 4: 2 tin/tuần + 1 gợi ý/tháng | 740 | FR-5 / §4.2 | OK |
| Rate limit Nhóm 6: 1–2 tin sau mua, không nhắn thêm | 742 | FR-5, FR-6 | OK |
| Refill trước 5 ngày, tái khám trước 3 ngày, đo chỉ số 2 tuần/lần | 99,116,132,169 | FR-4 Consequences | OK |
| Nhắn hỏi thăm nếu chưa xác nhận sau 1–2 tiếng (Nhóm 1) | 81 | FR-4 Consequences | OK |
| Chỉ gửi trong giờ hành chính; ngoài giờ → đầu sáng hôm sau | 717,721 | FR-4, FR-10 NFR SLA | OK |
| Ngưỡng HA mục tiêu <130/80; đường huyết đói 4.4–7.2, sau ăn 2h <10 | 125,142–143 | FR-8 Consequences | OK |
| Trigger leo thang: phản ứng có hại (dù nhẹ), đổi thuốc, tương tác/chống chỉ định, khiếu nại nghiêm trọng, khách muốn chuyên gia, AI không chắc | 725–731 | FR-8 (đủ 7 trigger) | OK |
| Cấp cứu (khó thở, sưng mặt/lưỡi, mẩn lan nhanh) → gọi 115, song song relay | 565 | FR-8 Out of Scope, FR-9, §11.1 | OK |
| Đổi thuốc thay thế chỉ khi khách đồng ý + dược sĩ kiểm tra tương đương | 407–409 | §5 Non-Goals, §11.1, FR-8 | OK |
| Đơn bác sĩ giá trị 5 ngày; thuốc kê đơn không bán thêm tự do | 322,385 | §11.1 | OK |
| TPCN luôn nêu "không phải thuốc điều trị bệnh" | 434 | FR-7, §11.1 | OK |
| Relay AI-mediated: AI luôn là người nói; dược sĩ off-stage; tin chờ "để em hỏi dược sĩ" | toàn nhóm 5 + bảng | FR-9, addendum §2 | OK |
| Quyền từ chối thông tin sức khỏe; không lưu/chia sẻ ra ngoài | 631–640 | §11.2, FR-6 | OK |
| Tone: xưng "em", "anh/chị", "Dạ", "ạ/nhé", lựa chọn 1/2/3, emoji 💊😊🙏, ⚠️/115 | nhiều | §10 Aesthetic & Tone | OK (đa phần) |

---

## 2. GAP / SAI LỆCH (2–5 điểm cụ thể, có severity)

### GAP-1 — [CAO] FR-8 bỏ sót bộ ngưỡng & cờ-đỏ leo-thang riêng của Nhóm 2 (OTC)
Kịch bản 2.4 (dòng **293–298**) quy định rõ AI phải khuyến nghị gặp bác sĩ sớm khi khách OTC có **một trong các dấu hiệu cụ thể**:
- **Sốt trên 38.5°C kéo dài hơn 2 ngày**
- **Khó thở hoặc đau tức ngực**
- **Nôn ói nhiều lần hoặc tiêu chảy liên tục không dứt**

Cộng thêm tiêu chí "không đỡ sau đủ số ngày dùng / triệu chứng nặng hơn" (dòng 22, 286–291).

FR-8 chỉ liệt kê các trigger tổng quát (phản ứng có hại, chỉ số vượt ngưỡng, đổi thuốc, tương tác, khiếu nại, không chắc). **Không có** ngưỡng số 38.5°C / "kéo dài >2 ngày", cũng không có nhánh "OTC không cải thiện sau đủ ngày → khuyến nghị bác sĩ". FR-7 chỉ nói chung "triệu chứng không cải thiện/nặng hơn → khuyến nghị gặp bác sĩ và/hoặc leo thang" — mất ngưỡng định lượng và danh sách cờ-đỏ.
**Hệ quả:** downstream không có spec để code ngưỡng 38.5°C/2 ngày → AI có thể bỏ qua tình huống cần đẩy đi khám. Đây là lằn ranh an toàn y tế có số đo cụ thể.
**Đề xuất:** bổ sung vào FR-8 Consequences một nhánh "trigger lâm sàng theo nhóm" liệt kê: sốt >38.5°C kéo dài >2 ngày, khó thở/đau ngực, nôn/tiêu chảy liên tục, OTC không đỡ sau đủ ngày dùng.

---

### GAP-2 — [CAO] Thiếu quy tắc "missed dose" (bỏ liều) — quy tắc y tế bắt buộc trong tin
Kịch bản 1.4 (dòng **88–92**) chứa một quy tắc tư vấn y tế cứng mà AI PHẢI nói khi khách quên liều:
- Quên **trong 1–2 tiếng** → vẫn uống bình thường.
- Đã **qua lâu** → bỏ liều đó, uống liều kế đúng giờ.
- **TUYỆT ĐỐI không uống gấp đôi để bù liều** ("có thể gây phản ứng không mong muốn").

Đây vừa là nội dung soạn tin (FR-3) vừa là lằn ranh an toàn (§11.1). PRD **không nhắc** quy tắc bù liều ở bất kỳ FR nào, cũng không có trong §11.1. FR-4 chỉ nói "gửi tin hỏi thăm sau 1–2 tiếng" nhưng không nói nội dung tư vấn bù liều.
**Hệ quả:** một trong những lời khuyên an toàn quan trọng nhất cho Nhóm 1 (mãn tính) bị bỏ khỏi yêu cầu — rủi ro AI tự diễn giải sai về cách bù liều.
**Đề xuất:** thêm vào §11.1 (an toàn y tế) và/hoặc FR-3 Consequences: "Hướng dẫn bù liều theo kịch bản 1.4 — không gấp đôi liều".

---

### GAP-3 — [TRUNG BÌNH] FR cho khiếu nại chất lượng (Nhóm 5.4) thiếu quy trình & cam kết cụ thể
Kịch bản 5.4 (dòng **574–588**) quy định quy trình tiếp nhận khiếu nại chất lượng:
- Yêu cầu khách gửi **ảnh sản phẩm + hộp/lọ (nhãn có số lô, hạn sử dụng)** + mô tả vấn đề.
- Cam kết: phản hồi ngay khi đủ thông tin; **xử lý theo quy trình — đổi hàng / hoàn tiền / báo nhà sản xuất**; **giữ bí mật thông tin**.

PRD chỉ ghi mức SLA "khiếu nại chất lượng — tiếp nhận ngay, xử lý trong ngày" (FR-10 NFR, dòng 242) và "thông tin khiếu nại giữ bí mật" (§11.2). **Mất hoàn toàn** yêu cầu thu thập bằng chứng (ảnh số lô/HSD) và 3 hướng xử lý (đổi/hoàn/báo NSX). Không FR nào mô tả luồng khiếu nại như một capability.
**Hệ quả:** luồng xử lý khiếu nại — một kịch bản đầy đủ trong nguồn — bị thu lại thành một dòng SLA; downstream thiếu spec để dựng.
**Đề xuất:** bổ sung Consequences cho FR-7/FR-9 (hoặc FR mới về xử lý khiếu nại): thu thập ảnh số lô/HSD + mô tả; định tuyến 3 hướng đổi/hoàn/báo NSX; theo dõi sau xử lý (kịch bản 5.5) + tin phục hồi quan hệ 7–14 ngày (kịch bản 5.6).

---

### GAP-4 — [TRUNG BÌNH] FR-9 thiếu phân biệt SLA relay "vài phút" cho phản ứng có hại vs ca thường
Kịch bản 5.3 (dòng **558**) hứa với khách: phản ứng có hại → "dược sĩ sẽ nhắn lại **trong vài phút** thôi", và Nhóm 5 ở bảng tổng quan là "**ưu tiên cao nhất, bỏ việc khác để reply**" (dòng 25). Đồng thời kịch bản 5.3 có hướng dẫn tạm thời trong lúc chờ: **tạm ngưng dùng thuốc, uống nhiều nước, nghỉ ngơi** (dòng 561–563) — và bản 1.8 cho chỉ số cao: **ngồi nghỉ, uống thuốc đúng giờ, không tự điều chỉnh liều** (dòng 159–162).

FR-9 chỉ có tin chờ chung "Dạ để em hỏi dược sĩ…" và lưu luồng. **Thiếu:** (a) phân loại ưu tiên ca phản ứng có hại là "vài phút / cao nhất" so với ca thường; (b) **bộ hướng dẫn trấn an tạm thời trong lúc chờ** theo loại trigger (ngưng thuốc / ngồi nghỉ / không tự chỉnh liều). FR-9 nói "AI trấn an khách rằng đang hỏi dược sĩ" nhưng không yêu cầu phát các hướng dẫn an toàn cụ thể này.
**Hệ quả:** mất các chỉ dẫn an toàn "trong lúc chờ" — vốn là phần giảm rủi ro thực sự khi khách đang gặp sự cố.
**Đề xuất:** thêm vào FR-9 Consequences: kèm hướng dẫn an toàn tạm thời theo trigger (phản ứng có hại → tạm ngưng thuốc; chỉ số cao → ngồi nghỉ, không tự chỉnh liều); và phân tầng ưu tiên ca Nhóm 5 phản ứng có hại.

---

### GAP-5 — [THẤP–TRUNG BÌNH] FR-4/FR-5 chưa cố định một số ngưỡng cadence chi tiết
Một số mốc cụ thể trong kịch bản chưa được "khóa số" trong FR:
- Nhóm 4 TPCN: "nên dùng liên tục ít nhất **[SỐ TUẦN] tuần**" + hỏi thăm đúng **7 ngày** (dòng 432, 461) — FR-4 chỉ nói "follow-up sau 7 ngày" (OK) nhưng mốc nhắc-mua-lại "**khi sắp hết**" không có ngưỡng ngày như Nhóm 1 (5 ngày).
- Nhóm 5.1: tin hỏi thăm chủ động "**trong vòng vài tiếng sau mua**" (dòng 529) — không xuất hiện trong FR-4 cadence (PRD chỉ ghi "1 tin hỏi thăm chủ động/đơn").
- Nhóm 5.6: tin **phục hồi quan hệ 7–14 ngày** sau giải quyết (dòng 609) — không có trong cadence PRD.
- Gợi ý sản phẩm "1 lần/tháng, **không liên tiếp nhiều lần**" (dòng 186, 495) — FR-5 có "1 gợi ý/tháng" nhưng mất ràng buộc "không gửi liên tiếp".
**Hệ quả:** nhỏ, nhưng downstream sẽ phải đoán các mốc này.
**Đề xuất:** bổ sung các mốc vào FR-4 cadence table (hỏi thăm sau bán "vài tiếng"; phục hồi quan hệ 7–14 ngày; gợi ý sản phẩm không liên tiếp).

---

## 3. Chi tiết TONE / phong cách PRD CÓ THỂ under-specify

PRD §10 đã nêu đúng các yếu tố chính (xưng "em", "anh/chị [TÊN]", mở "Dạ,", kết "ạ/nhé", lựa chọn 1/2/3, ⚠️/115, emoji 💊😊🙏). Vài sắc thái trong kịch bản chưa được neo rõ:

1. **Bộ lựa chọn đánh số có sắc thái cảm xúc khác nhau** — không chỉ 1/2/3 trơn. Kịch bản dùng emoji gắn theo lựa chọn để dò tâm trạng: "1. Đã khỏi 🙂 / 2. Có đỡ nhưng chưa khỏi / 3. Chưa đỡ hoặc nặng hơn 😟" (dòng 263–265); "1. Ổn rồi 😊 / 2. Còn vấn đề / 3. Muốn góp ý" (dòng 600–602). §10 chỉ nói "lựa chọn đánh số (1/2/3)" — under-specify việc lựa chọn 3 nên ánh xạ thẳng vào nhánh xử lý (1→dừng, 3→leo thang) và mang emoji cảm xúc.

2. **Biến thể cách xưng hô theo ngữ cảnh** — kịch bản dùng "anh/chị [TÊN] **kính mến**" (khiếu nại, dòng 575) và "anh/chị [TÊN] **thân mến**" (phục hồi quan hệ, dòng 612) — trang trọng/ấm hơn ở ca nhạy cảm. §10 chỉ có mẫu "anh/chị [TÊN]" mặc định.

3. **Persona xưng tên trong tin** — nhiều tin tự xưng "em **Ngọc**" giữa câu (vd dòng 57, 72, 84…). Sau đổi persona → phải đồng bộ "em **Hải/Dược Sĩ Hải**"; PRD §10 nói xưng "em" nhưng **không nêu** việc xưng kèm tên persona giữa câu. (Addendum §5 có bắt 27 dòng "Ngọc" cần đổi — đã ghi nhận, nhưng quy tắc tone "xưng tên persona giữa tin" nên đưa vào §10.)

4. **Câu chốt y tế đặc thù phải nguyên văn** — vd "thực phẩm bảo vệ sức khỏe, không phải thuốc điều trị bệnh" (FR-7 có) và "không uống gấp đôi để bù liều" (chưa có — xem GAP-2). Nên liệt kê thành "câu bắt buộc" (mandatory phrases) trong §10/§11 để AI không diễn giải lại.

5. **Khẩu hiệu trấn an "em luôn ở đây ạ" / "em lo cho anh/chị"** — mô-típ lặp tạo cảm giác đồng hành, đúng tinh thần "người quen đáng tin cậy, không phải robot" (§10 có nêu tinh thần này nhưng không nêu các cụm cố định).

---

## 4. Tổng hợp severity

| Gap | Vấn đề | Severity | Vị trí cần sửa |
|---|---|---|---|
| GAP-1 | Mất ngưỡng OTC: sốt >38.5°C/>2 ngày + cờ đỏ khó thở/nôn/tiêu chảy | **Cao** | FR-8 |
| GAP-2 | Mất quy tắc bù liều "không gấp đôi" | **Cao** | §11.1 + FR-3 |
| GAP-3 | Luồng khiếu nại (ảnh số lô/HSD, đổi/hoàn/báo NSX) bị rút thành 1 dòng SLA | Trung bình | FR-7/FR-9 |
| GAP-4 | Thiếu SLA "vài phút"/ưu tiên cao nhất + hướng dẫn an toàn "trong lúc chờ" | Trung bình | FR-9 |
| GAP-5 | Một số mốc cadence chưa khóa số (hỏi thăm vài tiếng, phục hồi 7–14 ngày, gợi ý không liên tiếp) | Thấp–TB | FR-4/FR-5 |

**Nhận xét chung:** PRD bám sát phần khung (6 nhóm, rate limit, ngưỡng chỉ số HA/đường huyết, 7 trigger leo thang, mô hình relay, cấp cứu 115, đổi thuốc cần đồng ý, đơn 5 ngày) — rất tốt. Khoảng trống nằm ở **các ngưỡng lâm sàng cấp-nhóm (OTC) và quy tắc y tế nội-tin (bù liều, hướng dẫn trong lúc chờ)** vốn là lằn ranh an toàn có số đo, dễ bị mất khi PRD tóm lược ở mức capability. Khuyến nghị nâng GAP-1 và GAP-2 vào §11.1 trước go-live.
