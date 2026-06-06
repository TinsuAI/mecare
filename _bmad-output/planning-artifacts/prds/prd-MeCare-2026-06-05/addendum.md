# Addendum — PRD MeCare (chi tiết kỹ thuật / downstream)

Giữ phần "how" và chi tiết không thuộc thân PRD nhưng cần cho architecture/UX/dev. PRD (`prd.md`) tham chiếu file này.

## 1. Kiến Trúc Kỹ Thuật (làm rõ ở architecture)

- **Điều phối:** n8n workflows.
- **Tác vụ AI:** Hermes agent — https://github.com/nousresearch/hermes-agent (Nous Research). Soạn tin / hội thoại theo kịch bản.
- **CRM/DB:** Baserow (hồ sơ khách, phân nhóm, lịch sử hội thoại, dashboard) — nguồn sự thật cho FR-10, FR-14, FR-15.
- **Kênh khách:** Zalo Cá Nhân mang danh persona ("Tài khoản Zalo chăm sóc").
- **Lớp gửi/nhận Zalo:** automation trên **bản web Zalo** qua plugin openzalo:
  - https://github.com/darkamenosa/openzca
  - https://github.com/darkamenosa/openzalo

**Hệ quả kỹ thuật:**
- Phụ thuộc DOM/giao diện web Zalo — Zalo đổi UI có thể làm hỏng automation (→ FR-13 giám sát phiên).
- Cần phiên đăng nhập web Zalo ổn định cho mỗi nhà thuốc.
- Kênh không chính thức → rủi ro ToS + khóa tài khoản (→ §12 R1 PRD).

## 2. Luồng Relay Leo Thang (chi tiết FR-9)

Mô hình **relay qua AI** (Tinsu chốt 2026-06-06), KHÔNG phải takeover trực tiếp:

```
Khách  ──tin──▶  Tài khoản Zalo chăm sóc (AI, "Dược Sĩ Hải")
                      │  phát hiện trigger leo thang (FR-8)
                      ▼
        AI nhắn khách: "Dạ để em hỏi dược sĩ rồi báo lại ngay ạ"
                      │
                      ├──thông báo ca──▶  Zalo Dược Sĩ Hải THẬT
                      │                   (kèm: định danh khách, nhóm, trigger, trích nội dung)
                      │
        Dược Sĩ Hải gõ phương án trả lời ──gửi về──▶ MeCare
                      │
                      ▼
        AI nhắn lại khách bằng giọng persona (nguyên ý phương án)
                      │
                      ▼
        Toàn bộ luồng (tin khách, trigger, phương án, tin gửi lại) ──▶ Baserow CRM (FR-10)
```

Điểm mấu chốt: **AI luôn là người nói chuyện với khách**; Dược Sĩ Hải thật chỉ đóng vai cố vấn hậu trường. Khách không thấy việc chuyển giao. Cấp cứu (115) phát song song, không phụ thuộc relay.

## 3. Mô Hình Giá & Token *(cần Tinsu xác nhận số gốc — Open Q1)*

- Giá: **399.000đ/tháng**, trần **1.000 tin/tháng**; phí setup **3.000.000đ** một lần.
- Phương pháp: tính token tiêu thụ mỗi tin → biên lợi nhuận → định gói.
- v1 **một gói duy nhất**; gói cao hơn = roadmap doanh thu sau.

**Khung suy luận số khách/tháng từ trần 1.000 tin** (chưa có số gốc S25):

| Nhóm | Nhịp nhắn chủ động | ~Tin/khách/tháng |
|------|---------------------|------------------|
| 1 — Mãn tính | Nhắc hằng ngày + sự kiện | ~20–30 (cao nhất) |
| 2 — OTC | 1 follow-up sau 2–3 ngày | ~1–2 |
| 3 — Kê đơn | Nhắc lịch + 1 follow-up | ~5–10 |
| 4 — TPCN | Follow-up 7 ngày + nhắc mua lại | ~2–3 |
| 5 — Phản ánh | Khách chủ động | biến thiên |
| 6 — Không ghi info | Tối thiểu | ~0–1 |

→ Cơ cấu nhẹ (nhiều OTC/TPCN): 1.000 tin phục vụ **~300–500 khách/tháng**. Nhiều mãn tính: tụt xuống **~30–50 khách/tháng**.

> **[CẦN TINSU XÁC NHẬN]** Bảng token/tin chính xác (session S25, Jun 1 7:04PM) không lưu được thành observation truy xuất. Cần số gốc để chốt con số đưa vào pricing + kỳ vọng dung lượng.

## 4. Chi Tiết Throttle Chống Khóa Zalo (FR-12)

Chiến lược (cần kiểm chứng ngưỡng thực tế Zalo — Open Q2):
1. Opt-in tại quầy (khách tự kết bạn) — không scrape, không add lạnh.
2. Nhịp giống người: jitter thời gian, trần tin/ngày, chỉ giờ hành chính.
3. Trần gói ≤1.000 tin/tháng giữ lưu lượng dưới ngưỡng rủi ro.
4. Warm-up tài khoản mới trước khi chạy tải thật.
5. Lộ trình dự phòng: đa tài khoản, hoặc migrate khối lượng lớn sang Zalo OA nếu Zalo siết.

## 5. Cập Nhật Kịch Bản Nguồn (handoff — Open Q3)

`kichban-chamsoc-khachhang.md` (746 dòng) cần sửa trước go-live:
- **27 dòng** nhắc persona cũ "Ngọc" → đổi "Dược Sĩ Hải" (dòng 3,5,19,32,41,57,72,84,102,217,237,259,331,347,364,427,446,464,534,577,596,614,666,683,700,721,731).
- Nhiều chỗ "kết nối dược sĩ" (dòng 47,127,145,157,164,194,249,331,373,389,401,407,411,456,488,504,536,548,558,567,690,723–731) viết theo mô hình 2 vai cũ (nhân viên → dược sĩ). Mô hình mới: front-line là AI "Dược Sĩ Hải", backend là Dược Sĩ Hải thật qua relay. Cần rà lại cho câu chữ nhất quán với mô hình relay.
- Giữ persona tự xưng **"em"**.
- File tự đánh dấu **bản nháp chờ duyệt nội dung** trước khi vào hệ thống (FR-16).

## 6. Tài Sản Đã Có

- `website/index.html` — sales kit 11 section.
- `website/BRAND.md` — brand guideline (đã trích vào PRD §10).
- `kichban-chamsoc-khachhang.md` — kịch bản 6 nhóm (cần cập nhật — §5 trên).
- `videos/` — showcase Remotion.
- Khách pilot: Nhà Thuốc Trúc Tâm (Dược Sĩ Hải).
