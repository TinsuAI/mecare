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

- [ ] **(c) Tiếp theo — Story 7.2:** Warm-up & kiểm thử relay 2 chiều trước khi mở tải đầy (xem Story 7.2 — end-to-end relay test).

> Chỉ mở tải thật sau khi cả 3 điều kiện trên đều xanh.

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
