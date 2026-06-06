# Runbook — Onboarding nhà thuốc mới

> Placeholder (Story 1.1). Nội dung đầy đủ hoàn thiện ở epic onboarding sau.

## Tóm tắt

1. Copy `tenants/_template.env` → `tenants/<slug>.env`, điền giá trị thật.
2. Tạo phiên Zalo (openzca) cho tenant, lưu vào `ZALO_SESSION_DIR`.
3. Tạo workspace/database Baserow cho tenant (Story 1.2 cung cấp schema).
4. `docker compose up -d` và xác nhận tất cả service `healthy`.
