# SOP: Nhập hồ sơ khách tại quầy (Baserow) — ≤20s

## URL mẫu form tại quầy

```
http://localhost:8080/form/<form_slug>?prefill_pharmacy_id=<row_id>
```

> **Lưu ý Baserow v1.30.x**: dùng tiền tố `prefill_` cho URL pre-fill tự động điền trường.  
> Nếu `pharmacy_id` không tự điền → kiểm tra đúng slug và prefix tại `/api/redoc/`.

## Quy trình nhập nhanh (≤20s)

1. **Mở URL form** (bookmark sẵn trên trình duyệt quầy — URL đã có `pharmacy_id` đúng tenant)
2. **Nhập Họ tên** + **Số điện thoại** (bắt buộc)
3. **Chọn Nhóm chăm sóc** (1–6) và **Trạng thái Zalo** (mặc định: `pending`)
4. **Ghi chú thuốc/sản phẩm** nếu có (tùy chọn — free text)
5. **Nhấn "Lưu hồ sơ"** → hồ sơ được tạo ngay trong Baserow

## Quy trình kiểm tra SĐT trùng (trước bước 1 nếu nghi ngờ)

1. Mở view **`phone-lookup`** (grid view của bảng Customers)
2. Gõ số điện thoại vào ô tìm kiếm nhanh (Quick Search) của Baserow
3. **Nếu thấy trùng** → nhấp vào hàng → chọn **"Edit row"** cập nhật hồ sơ cũ — **không tạo bản ghi mới**
4. **Nếu không thấy** → quay lại form tạo mới (bước 1 bên trên)

> Tìm kiếm trong lookup view đạt ≤3s trên mạng LAN nội bộ.

## Bảng nhóm chăm sóc gợi ý

| Nhóm | Tên gợi nhớ    | Mô tả                                                      |
|------|----------------|------------------------------------------------------------|
| 1    | Mãn tính       | Tiểu đường, huyết áp, tim mạch — mua thuốc đều đặn         |
| 2    | OTC ngắn ngày  | Cảm cúm, đau nhức nhẹ — mua không cần đơn                 |
| 3    | Kê đơn         | Thuốc cần toa bác sĩ                                       |
| 4    | TPCN / Dụng cụ | Thực phẩm chức năng, băng gạc, nhiệt kế, v.v.             |
| 5    | Khiếu nại      | Khách có vấn đề — cờ `is_complaint_active` bật riêng; **không ghi đè nhóm gốc** |
| 6    | Chưa đủ TT     | Chưa xác định được nhóm phù hợp                           |

## Lưu ý PII (bảo mật dữ liệu khách)

- Họ tên và SĐT khách **chỉ lưu trong Baserow self-host**.
- **Không** sao chép hoặc gửi thông tin này ra ngoài (email, Zalo cá nhân, cloud).
- OpenClaw AI chỉ nhận `customer_ref` token ẩn danh — không bao giờ thấy tên/SĐT thật.
