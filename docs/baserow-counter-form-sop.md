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

---

## Bảng quyết định phân nhóm (chi tiết)

Áp theo thứ tự ưu tiên **từ trên xuống** — nhóm đầu tiên khớp là nhóm được chọn.

| Ưu tiên | Điều kiện                                          | Nhóm | Ghi chú                              |
|---------|----------------------------------------------------|------|--------------------------------------|
| 1       | Thuốc mãn tính (tiểu đường / cao huyết áp / tim mạch) | **N1** | Override tất cả các nhóm khác       |
| 2       | Thuốc kê đơn bác sĩ (không mãn tính)               | **N3** |                                      |
| 3       | TPCN / thực phẩm chức năng / dụng cụ y tế          | **N4** |                                      |
| 4       | OTC không cần toa (cảm, đau nhức ngắn ngày)        | **N2** |                                      |
| 5       | Không đủ thông tin — một trong 5 tình huống N6:    | **N6** | Không gây áp lực; mở cửa lần sau    |

**5 tình huống N6** (phân nhóm tạm, có thể cập nhật lần sau):

1. **Từ chối chia sẻ** — khách không muốn cho thông tin sức khỏe
2. **Mua hộ người khác** — không biết bệnh trạng người thực sự dùng thuốc
3. **Đang vội** — không có thời gian khai báo tại quầy
4. **Người già / khó giao tiếp** — không thu thập được thông tin đầy đủ
5. **Lần đầu / nhân viên quên nhập** — chưa đủ dữ liệu để phân nhóm

> **N6 hành vi**: gửi 1–2 tin hướng dẫn tối giản sau mua; không chủ động nhắn thêm trừ khi khách phản hồi.

---

## Xử lý khiếu nại (Nhóm 5)

Nhóm 5 là **trạng thái cắt ngang** — KHÔNG thay thế nhóm gốc của khách.

**Khi khách có khiếu nại:**

1. Mở bảng **Customers** → tìm hàng khách đó
2. Bật cờ **`is_complaint_active = true`** (inline-edit trong Baserow)
3. **Giữ nguyên** `care_group` hiện tại — không đổi nhóm
4. Xử lý khiếu nại qua luồng **EscalationCases** (nếu cần leo thang)

**Khi khiếu nại được giải quyết:**

1. Tắt cờ **`is_complaint_active = false`**
2. `care_group` vẫn không thay đổi

> Cách nhớ nhanh: `is_complaint_active` là "đèn cảnh báo" — bật/tắt độc lập với phân nhóm gốc.

---

## Đổi nhóm khách + ghi log (2 bước)

Khi cần thay đổi `care_group` của khách (ví dụ: bổ sung thông tin → chuyển N6 sang N3):

**Bước 1 — Đổi nhóm trong view `customers-by-group`**

1. Mở view **`customers-by-group`** (bảng Customers)
2. Tìm khách cần đổi nhóm (dùng Quick Search theo tên hoặc SĐT)
3. **Inline-edit** ô `care_group` → nhập số nhóm mới (1–6)
4. Nhấn Enter hoặc click ra ngoài để lưu

**Bước 2 — Ghi log vào bảng `CustomerGroupChanges`**

1. Mở bảng **`CustomerGroupChanges`**
2. Nhấn **"+ Add row"** để tạo hàng mới
3. Điền đầy đủ:
   - `changed_at`: thời điểm thực tế đổi nhóm (ngày + giờ)
   - `customer_id`: link đúng khách vừa đổi
   - `pharmacy_id`: link đúng nhà thuốc (tenant của bạn)
   - `from_group`: nhóm cũ (trước khi đổi)
   - `to_group`: nhóm mới (sau khi đổi)
   - `changed_by`: tên nhân viên thực hiện (tùy chọn)
4. Lưu hàng

> Xem lịch sử đổi nhóm tại view **`group-changes-log`** (bảng CustomerGroupChanges) — sắp xếp mới nhất trên cùng.
