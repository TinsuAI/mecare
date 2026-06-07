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
4. Chạy `node scripts/apply-baserow-schema.mjs` để khởi tạo schema MeCare.

## Onboarding tenant mới

1. Copy `tenants/_template.env` → `tenants/<slug>.env`, điền giá trị thật.
2. Tạo phiên Zalo (openzca) cho tenant, lưu vào `ZALO_SESSION_DIR`.
3. Tạo workspace/database Baserow cho tenant (schema từ Story 1.2).
4. `docker compose restart zalo-bridge` để load tenant mới.

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
