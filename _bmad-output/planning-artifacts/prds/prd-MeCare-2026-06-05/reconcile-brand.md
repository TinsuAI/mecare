---
title: "Đối Chiếu BRAND ↔ PRD §10"
nguồn: /home/tinxu-luna/mecare/website/BRAND.md
prd: /home/tinxu-luna/mecare/_bmad-output/planning-artifacts/prds/prd-MeCare-2026-06-05/prd.md (§10 Thẩm Mỹ & Giọng Điệu)
ngày: 2026-06-06
---

# Đối Chiếu: BRAND.md ↔ PRD §10 (Thẩm Mỹ & Giọng Điệu)

Mục tiêu: xác minh PRD §10 phản ánh trung thực voice/tone/aesthetic trong BRAND.md. Bỏ qua thay đổi persona Ngọc → Dược Sĩ Hải (đã đúng chủ ý ở PRD); thay vào đó ghi nhận BRAND.md cần được cập nhật.

## 1. Phần PRD §10 đã bắt đúng

- Màu chính: teal `#0E9E8E`, amber `#F59E0B`, nền `#F7F9FB`, chữ `#1A2332` — khớp BRAND §1.
- Typography: Plus Jakarta Sans (heading) + Inter (body), nhấn mạnh hỗ trợ dấu tiếng Việt — khớp BRAND §2.
- Icon Phosphor thay ảnh stock; con số nổi bật; nhiều whitespace — khớp BRAND §8.
- Giọng thương hiệu: ấm áp nhưng chuyên nghiệp, để con số tự nói, tránh jargon, mỗi phần có CTA — khớp BRAND §9 Tone Principles.
- Từ vựng cốt lõi: nhà thuốc / khách hàng / tư vấn / chăm sóc; tránh "bệnh nhân" ngoài lâm sàng; tránh tiếng Anh — khớp một phần BRAND §9.
- Anti-references: không corporate lạnh lùng, không ảnh stock người thật, không sales pitch khoe khoang — khớp tinh thần BRAND §8 + §9.

## 2. Gaps phát hiện (PRD §10 thiếu so với BRAND.md)

### GAP-1 — Bảng từ vựng do/don't thiếu nhiều cặp [Severity: HIGH]
BRAND §9 quy định 9 cặp "Use This / Not This". PRD §10 chỉ nêu 4 từ thuần Việt (nhà thuốc/khách hàng/tư vấn/chăm sóc). Bị bỏ sót các quy tắc bắt buộc:
- "tin nhắn Zalo" — KHÔNG dùng "message / chat"
- "tự động" — KHÔNG dùng "automated"
- "tiết kiệm thời gian" — KHÔNG dùng "save time"
- "tăng doanh thu" — KHÔNG dùng "increase revenue"
- "chăm sóc khách hàng" — KHÔNG dùng "customer service"
- "nhà thuốc" — KHÔNG dùng "doanh nghiệp / cơ sở kinh doanh"
Đây là quy tắc copy ràng buộc; downstream (UX/dev/marketing) cần bảng đầy đủ để tránh lẫn tiếng Anh.

### GAP-2 — Thiếu màu Primary Dark `#0B7D70` và quy ước hover/active [Severity: MEDIUM]
BRAND §1 định nghĩa Primary Dark `#0B7D70` cho hover/active states (và là điểm đầu của hero gradient). PRD §10 chỉ liệt kê primary/accent/bg/text, bỏ màu tương tác này — gây thiếu chuẩn khi dev dựng nút/CTA.

### GAP-3 — Thiếu spec gradient & shadow thương hiệu [Severity: MEDIUM]
BRAND §8 (Hero Gradient `linear-gradient(135deg, #0B7D70 0%, #0E9E8E 50%, #1BB8A8 100%)`) và BRAND §5 (`--shadow-primary: 0 4px 20px rgba(14,158,142,0.25)`) là yếu tố nhận diện chủ đạo của landing/CTA. PRD §10 chỉ nói "bo góc mềm" mà không nhắc gradient hero hay shadow brand — mất một phần chữ ký thị giác. (Lưu ý: màu `#1BB8A8` trong gradient không xuất hiện ở đâu khác trong PRD.)

### GAP-4 — Anti-reference "tránh hình ảnh corporate/Western" diễn đạt chưa đủ [Severity: LOW]
BRAND §8 yêu cầu rõ "Avoid overly corporate/Western imagery" và "friendly, warm illustrations (abstract, geometric) over real photos". PRD §10 có "không ảnh stock người thật" nhưng thiếu vế "tránh hình ảnh kiểu Tây/corporate" và "ưu tiên minh hoạ hình học trừu tượng ấm áp" — nên bổ sung để đầy đủ.

### GAP-5 — Thiếu các pattern copy mẫu (hero/feature/CTA/stat) [Severity: LOW]
BRAND §9 cung cấp 4 pattern copy chuẩn (Hero headline, Feature description, CTA primary/secondary, Stat display). PRD §10 không tham chiếu các pattern này, khiến người viết copy mất khung mẫu. Có thể chấp nhận nếu §10 cố ý ở mức tóm tắt, nhưng nên thêm liên kết tới BRAND §9.

## 3. BRAND.md có cần cập nhật không? — CÓ

BRAND.md vẫn dùng persona CŨ "Ngọc" ở:
- §Overview: "Product: Ngọc — AI Zalo Assistant…"
- §9 Vocabulary Rules: hàng "Ngọc | trợ lý AI, hệ thống"
- §9 Sample Copy: "Ngọc tự động nhắc lịch tái khám…"

PRD đã chốt persona "Dược Sĩ Hải". Đây KHÔNG phải gap của PRD; cần cập nhật BRAND.md đổi "Ngọc" → "Dược Sĩ Hải" cho đồng bộ nguồn sự thật. [Severity: HIGH đối với BRAND.md]

## 4. Tổng hợp severity

| ID | Nội dung | Severity |
|---|---|---|
| GAP-1 | Bảng từ vựng do/don't thiếu 6 cặp | HIGH |
| GAP-2 | Thiếu Primary Dark `#0B7D70` (hover/active) | MEDIUM |
| GAP-3 | Thiếu gradient hero + shadow-primary | MEDIUM |
| GAP-4 | Anti-reference corporate/Western chưa đủ | LOW |
| GAP-5 | Thiếu tham chiếu pattern copy mẫu | LOW |
| BRAND | BRAND.md còn dùng "Ngọc", cần đổi → "Dược Sĩ Hải" | HIGH (ở BRAND.md) |
