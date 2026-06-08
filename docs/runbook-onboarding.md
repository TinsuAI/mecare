# Runbook — Onboarding nhà thuốc mới

## Public URLs

| URL | Service | Dùng bởi |
|-----|---------|----------|
| https://mecareapp.tinsu.ai | Baserow CRM | nhà thuốc — truy cập hàng ngày |
| https://mecareapp-n8n.tinsu.ai | n8n scheduler | Tinsu admin |
| https://mecareapp-webhook.tinsu.ai | zalo-bridge webhook | Zalo server (auto) |

> Các URL này qua Cloudflare Tunnel — không cần mở firewall port trên VPS.

## Setup stack (lần đầu)

1. Copy `.env.example` → `.env`, điền giá trị thật (xem PORT GUIDE trong file).
2. `docker compose up -d` — tất cả 5 service phải `healthy`.
3. Truy cập `https://mecareapp.tinsu.ai` → tạo tài khoản admin Baserow đầu tiên.
4. Chạy `node scripts/apply-baserow-schema.mjs` để khởi tạo 10 bảng schema MeCare.
5. Chạy `node scripts/apply-baserow-schema.mjs --views` để tạo tất cả views:
   - Story 3.1/3.2: counter-form, phone-lookup, customers-by-group, group-changes-log
   - Story 5.4: escalation-cases-list
   - Story 6.2: quota-counter-dashboard
   - Story 6.3: message-templates-edit (08), faq-entries-edit (09)

## Onboarding tenant mới

1. Copy `tenants/_template.env` → `tenants/<slug>.env`, điền giá trị thật.
2. Tạo phiên Zalo (openzca) cho tenant, lưu vào `ZALO_SESSION_DIR`.
3. Tạo workspace/database Baserow cho tenant (schema từ Story 1.2).
4. `docker compose restart zalo-bridge` để load tenant mới.
5. **Seed kịch bản (status=draft):** Cập nhật `tenant_slug` trong seed files cho đúng tenant, sau đó chạy:

   ```bash
   node scripts/apply-baserow-schema.mjs --seed --update-seed
   ```

   Seed files kịch bản:
   - `baserow/seed/08-message-templates-draft.json` — mẫu tin nhắn
   - `baserow/seed/09-faq-entries-draft.json` — FAQ tự động

   > **Lưu ý:** Sau khi seed, tất cả records có `status=draft`. Chủ nhà thuốc PHẢI duyệt trước khi go-live.
   > **Lưu ý quan trọng:** Seed files hiện dùng `"tenant_slug": "tructam"` — cần cập nhật giá trị này cho đúng `pharmacy_slug` của tenant mới trước khi seed.

6. **Duyệt kịch bản trước go-live (BẮT BUỘC):** Hướng dẫn chủ nhà thuốc duyệt từng kịch bản qua Baserow:
   - Truy cập `https://mecareapp.tinsu.ai` → Database tenant → View `08-message-templates-edit`
   - Xem lại từng mẫu tin nhắn, cập nhật nội dung nếu cần, đổi `status` → `approved`
   - Truy cập View `09-faq-entries-edit` → lặp lại cho FAQ entries

   Hoặc dùng script (approve toàn bộ records của tenant):
   ```bash
   node scripts/approve-kichban.mjs <pharmacy_slug>
   ```

   > **Điều kiện bắt buộc trước khi mở tải thật:** Tất cả MessageTemplates + FaqEntries phải có `status=approved`.
   > Tham khảo: Story 1.4 — pattern draft→approved (idempotent, ghi `approved_at`, `approved_by`).

7. **Cấu hình relay dược sĩ:** Trong `tenants/<slug>.env`, điền số Zalo thật của dược sĩ relay:

   ```
   PHARMACIST_ZALO_ID=<so_zalo_duoc_si>
   ```

   > **Cảnh báo:** Nếu `PHARMACIST_ZALO_ID` bỏ trống, tính năng leo thang relay sang dược sĩ sẽ không hoạt động — khách hàng chờ mãi không có phản hồi chuyên môn.

8. **Cấu hình Baserow workspace visibility cho chủ nhà thuốc:** Giới hạn tài khoản chủ nhà thuốc chỉ thấy 2 bảng MessageTemplates + FaqEntries qua Baserow Admin UI:

   ```
   Baserow Admin → Workspaces → chọn workspace tenant
   → Members → chọn tài khoản chủ nhà thuốc
   → Database Permissions → ẩn tất cả bảng trừ MessageTemplates và FaqEntries
   ```

   > Bước này thực hiện thủ công qua Admin UI — không có script tự động. Mục đích: bảo vệ dữ liệu bệnh nhân và cấu trúc hệ thống khỏi chủ nhà thuốc chỉnh sửa nhầm.

9. **Áp filter pharmacy_id cho views 08+09 per tenant:** Views `08-message-templates-edit` và `09-faq-entries-edit` cần filter theo `pharmacy_id` của từng tenant để chủ nhà thuốc chỉ thấy kịch bản của mình:

   ```
   Baserow Admin → Database tenant → Views → 08-message-templates-edit
   → Filters → Add Filter: pharmacy_id = [row_id của nhà thuốc trong bảng Pharmacies]
   ```

   Lặp lại cho view `09-faq-entries-edit`.

   > Lấy `row_id` của nhà thuốc: mở bảng Pharmacies → tìm hàng có `pharmacy_slug = <slug>` → ghi ID hàng đó.
   > Pattern này nhất quán với Story 6.1 AC2 và Story 6.2 AC4.

## Checklist go-live

Trước khi mở tải thật cho nhà thuốc, xác nhận **3 điều kiện bắt buộc**:

- [ ] **(a) Tất cả kịch bản đã được duyệt:** Mọi bản ghi trong MessageTemplates + FaqEntries của tenant có `status=approved`.
  - Kiểm tra qua Baserow UI: View `08-message-templates-edit` và `09-faq-entries-edit` — không còn hàng nào `status=draft`.
  - Hoặc chạy: `node scripts/approve-kichban.mjs <pharmacy_slug>` rồi xác nhận không có lỗi.

- [ ] **(b) `PHARMACIST_ZALO_ID` đã điền:** File `tenants/<slug>.env` có `PHARMACIST_ZALO_ID` không bỏ trống.
  ```bash
  grep PHARMACIST_ZALO_ID tenants/<slug>.env
  ```

- [ ] **(c) Story 7.2 — Warm-up & relay test 2 chiều:**
  - [ ] **(c1) Warm-up env vars set:** Chạy `bash zalo-bridge/warmup.sh <slug>`, copy env vars giai đoạn 1 vào `tenants/<slug>.env`, restart zalo-bridge. Nâng giai đoạn theo tuần (xem section "Warm-up giai đoạn tải thấp").
  - [ ] **(c2) Relay test 2 chiều pass:** Hoàn thành checklist 6 bước trong section "Kiểm thử relay 2 chiều" — EscalationCase tạo, dược sĩ nhận tin, reply relay thành công, `status=resolved`.

- [ ] **(d) Story 7.3 — NFR-7 privacy & complaint path xác nhận:**
  - Xác nhận field `is_complaint_active` tồn tại trong schema customers (Baserow → bảng Customers → kiểm tra column).
  - Xác nhận field `group6_unlocked` tồn tại trong schema customers (Baserow → bảng Customers → kiểm tra column).
  - Xác nhận `PHARMACIST_ZALO_ID` đã điền — complaint escalation path cần ID này để gửi relay dược sĩ.

> Chỉ mở tải thật sau khi cả 4 điều kiện trên đều xanh.

## Warm-up giai đoạn tải thấp

Tài khoản Zalo mới cần được "làm nóng" (warm-up) với tải thấp trước khi gửi đầy 50 tin/ngày. Bỏ qua bước này có nguy cơ bị Zalo giới hạn hoặc khoá tài khoản.

### Chạy warmup.sh để sinh env vars

```bash
bash zalo-bridge/warmup.sh <pharmacy_slug>
```

Script in ra bảng kế hoạch 4 giai đoạn và env vars gợi ý. **Không tự gửi tin.**

### 4 giai đoạn ramp-up

| Giai đoạn | Tin/ngày | Thời gian   |
|-----------|----------|-------------|
| Tuần 1    | 5        | Ngày 1–7    |
| Tuần 2    | 15       | Ngày 8–14   |
| Tuần 3    | 30       | Ngày 15–21  |
| Tuần 4+   | 50       | Ngày 22+    |

### Áp env vars từng giai đoạn

**Bước 1 — Giai đoạn 1 (Tuần 1):**
1. Sao chép env vars giai đoạn 1 từ output `warmup.sh` vào `tenants/<slug>.env`:
   ```
   WARMUP_DAILY_CAP=5
   WARMUP_UNTIL_EPOCH_MS=<epoch_ms_7_ngay_sau>
   ```
2. `docker compose restart zalo-bridge`

**Nâng giai đoạn:** Lặp lại với env vars giai đoạn 2, 3 khi đến thời hạn.

**Tắt warm-up sau giai đoạn cuối (Tuần 4+):**

```
# tenants/<slug>.env
DAILY_SEND_CAP=50
# Xoá hoặc comment dòng WARMUP_UNTIL_EPOCH_MS
```

Sau đó: `docker compose restart zalo-bridge`

### Xác nhận warm-up đang active

Warm-up active khi log zalo-bridge ghi `dailyCap` theo `WARMUP_DAILY_CAP` (không phải `DAILY_SEND_CAP`):

```bash
docker compose logs --tail=50 zalo-bridge | grep -i "daily\|warmup\|cap"
```

> Không có endpoint riêng check warm-up. Xác nhận qua daily cap trong logs khi test gửi tin.

## Kiểm thử relay 2 chiều

Kiểm thử end-to-end luồng leo thang relay trước khi mở tải thật. Thực hiện thủ công sau khi stack đang chạy và `PHARMACIST_ZALO_ID` đã điền.

### Luồng relay

```
Khách → Zalo → zalo-bridge → OpenClaw agent → guardrail trigger → EscalationCase (mã ca)
                                                                 ↓
Dược sĩ ← Zalo ←────────────────────────────────── zalo-bridge send PHARMACIST_ZALO_ID
   ↓ (reply kèm mã ca)
Zalo → zalo-bridge → OpenClaw (khớp mã ca) → relay trả lời → Khách
                                            ↓
                                     Baserow EscalationCases.status = resolved
```

### Checklist kiểm thử 6 bước

1. **Gửi tin test trigger leo thang:** Dùng tài khoản Zalo khách test, gửi tin chứa từ khóa cờ đỏ — ví dụ: "nguy hiểm", "cấp cứu", "khó thở", hoặc "không chắc". OpenClaw guardrail tạo EscalationCase thay vì tự trả lời.

2. **Xác nhận EscalationCase tạo trong Baserow:** Mở Baserow → View `escalation-cases-list` → xác nhận có record mới với `case_id` format `ESC-<slug>-<YYYYMMDD>-<seq>` (ví dụ: `ESC-tructam-20260607-1`) và `status=open`.

3. **Xác nhận dược sĩ nhận tin Zalo:** Tài khoản Zalo `PHARMACIST_ZALO_ID` nhận tin từ zalo-bridge có chứa `case_id` trong nội dung.

4. **Dược sĩ reply kèm mã ca:** Dược sĩ reply tin Zalo có chứa `case_id` trong nội dung (ví dụ: "ESC-tructam-20260607-1 Khách dùng thuốc X, không nguy hiểm.").

5. **Xác nhận khách nhận reply:** Tài khoản Zalo khách test nhận được tin reply từ dược sĩ (relay qua zalo-bridge).

6. **Xác nhận EscalationCase resolved:** Mở Baserow → View `escalation-cases-list` → xác nhận record có `status=resolved`.

### Xác nhận mã ca khớp (bắt buộc)

**Mã ca format:** `ESC-<pharmacy_slug>-<YYYYMMDD>-<seq>` (pattern: `/^ESC-([a-z0-9]+)-(\d{8})-(\d+)$/`)

Kết quả kiểm thử chỉ đạt khi `case_id` trong tin gửi dược sĩ **khớp chính xác** với `case_id` trong bảng `EscalationCases` Baserow — không có ký tự thừa, không khác format.

## Privacy & quy trình khiếu nại trong vận hành

### Quyền từ chối thông tin sức khỏe (Nhóm 6)

Khách chọn `care_group=6` là khách **từ chối cung cấp thông tin sức khỏe**. Hệ thống tôn trọng quyền này: không ép, không hỏi lại.

**Cách hệ thống xử lý Nhóm 6:**

- **Inbound reply (khách nhắn vào):** Luôn được phục vụ bình thường — `guard-is-group6` trong `MC-Handle-InboundReply` chỉ ghi nhận, không chặn. Khi Nhóm 6 reply lần đầu, node `unlock-group6-customer` tự đặt `group6_unlocked=true`.
- **Proactive outbound (hệ thống nhắn ra):**
  - `group6_unlocked=false` (chưa từng phản hồi): `guard-group6-locked` trong `MC-Schedule-DueReminders` **chặn** — không gửi tin chủ động.
  - `group6_unlocked=true` (đã phản hồi ít nhất 1 lần): guard vượt qua — tin proactive được gửi bình thường.

**Nguyên tắc vận hành:** Không yêu cầu Nhóm 6 cung cấp thêm thông tin để nhận dịch vụ. Nếu khách tự chủ động nhắn, hệ thống phục vụ và unlock tự động — không cần can thiệp thủ công.

### Quy trình tiếp nhận khiếu nại chất lượng (Nhóm 5)

Khi khách khiếu nại về chất lượng sản phẩm, hệ thống tự phân loại `trigger_type=complaint_serious` và tạo `EscalationCase` → relay dược sĩ. Dược sĩ **không để khách tự xử lý** — tiếp nhận ngay và xử lý trong ngày (NFR-3).

**Hai đường kích hoạt complaint_serious:**
1. Cờ `is_complaint_active=true` trong record khách (Priority 1 trong Classification jsCode) — ưu tiên tuyệt đối, kích hoạt trước tất cả phân loại khác.
2. Từ khóa trong tin nhắn (Priority 9): `khiếu nại`, `tố cáo`, `bồi thường`, `thuốc giả`, `phản ánh`.

**Lưu ý:** `is_complaint_active` là cờ cắt ngang — KHÔNG ghi đè `care_group`. Khách vẫn giữ nhóm chăm sóc gốc khi có khiếu nại.

**Checklist thu thập bằng chứng (dược sĩ thực hiện khi nhận EscalationCase loại complaint_serious):**

1. Thu thập ảnh sản phẩm (chụp rõ nhãn)
2. Ghi số lô (batch number) và HSD (hạn sử dụng) từ hộp/lọ
3. Khách mô tả triệu chứng hoặc vấn đề chất lượng
4. Cam kết với khách: đổi sản phẩm / hoàn tiền / báo NSX (nhà sản xuất)
5. Tạo báo cáo nội bộ và báo nhà sản xuất nếu cần

**SLA khiếu nại (NFR-3):**

| Thời điểm | Hành động |
|-----------|-----------|
| Trong giờ làm việc | Tiếp nhận ngay, xử lý trong ngày |
| Ngoài giờ làm việc | Ghi nhận ngay, phản hồi sáng hôm sau |

### Quy tắc gửi khuyến mãi

Tin khuyến mãi chỉ gửi đến khách **đã từng mua sản phẩm liên quan** — phân nhóm qua `care_group`:

- `care_group=4` = Nhóm 4 (proactive follow-up sau mua) — khách đã mua sản phẩm liên quan.
- `MC-Schedule-DueReminders` lọc customers theo `care_group` từ Baserow trước khi gửi → tin khuyến mãi chỉ đến đúng nhóm.
- Template được gán `care_group` tại seed time — dược sĩ không cần filter thủ công.

**Nguyên tắc:** Không gửi promo đại trà. Mỗi template khuyến mãi có `care_group` target cụ thể; hệ thống tự lọc đúng đối tượng.

## Kiểm tra stack healthy

```bash
docker compose ps                          # tất cả Status: healthy
curl -s https://mecareapp.tinsu.ai/api/_health/          # 200
curl -s https://mecareapp-n8n.tinsu.ai/healthz           # {"status":"ok"}
curl -s https://mecareapp-webhook.tinsu.ai/healthz       # {"status":"ok"}
```

## Port mapping (tham khảo)

| Biến env | Giá trị | Loại | Ghi chú |
|----------|---------|------|---------|
| `BASEROW_HTTP_PORT` | 8001 | host | an toàn đổi |
| `N8N_HTTP_PORT` | 8002 | host | an toàn đổi |
| `ZALO_BRIDGE_HOST_PORT` | 8003 | host | an toàn đổi |
| `N8N_PORT` | 5678 | internal | KHÔNG đổi |
| `ZALO_BRIDGE_PORT` | 3000 | internal | KHÔNG đổi |
