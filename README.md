# MeCare — Self-hosted Care Stack

Hạ tầng chăm sóc khách hàng tự động cho nhà thuốc, chạy toàn bộ trên **1 VPS** qua Docker Compose. Mọi epic sau build trên nền stack này (foundation story 1.1, AR-2).

## Kiến trúc stack

| Service | Image/Version | Vai trò |
|---|---|---|
| **openclaw** | self-hosted agent gateway | Lõi hội thoại reactive + memory (SQLite + sqlite-vec) + channel |
| **n8n** | `2.0` (Community, queue mode) | Scheduler + quota + watchdog |
| **baserow** | `1.30.x` (pin tag) | CRM/DB nguồn sự thật + UI |
| **postgres** | `16` (engine chung) | DB engine — DB/schema riêng cho n8n và baserow |
| **zalo-bridge** | TypeScript (wrap openzca) | Lớp Zalo + anti-ban + de-anonymize PII |

- **Memory store** = SQLite + sqlite-vec nằm TRONG OpenClaw (không phải service riêng).
- **Egress cloud DUY NHẤT** = OpenClaw → OpenRouter (DeepSeek V4 Flash, pin provider non-TQ — NFR-5).
- **zalo-bridge** = điểm DUY NHẤT biết PII thật.
- **Baserow authoritative; memory recall-only** (rebuild được từ Baserow).

## Chạy stack

```bash
# 1. Copy biến chung, điền giá trị thật
cp .env.example .env
$EDITOR .env

# 2. (Tùy chọn) tạo tenant đầu tiên
cp tenants/_template.env tenants/tructam.env
$EDITOR tenants/tructam.env

# 3. Kiểm tra cú pháp compose
docker compose config

# 4. Lên stack
docker compose up -d

# 5. Theo dõi tới khi tất cả service `healthy`
docker compose ps

# 6. Set Baserow credentials trong .env (đăng ký tại http://localhost:8001)
#    BASEROW_EMAIL=<email đăng ký Baserow>
#    BASEROW_PASSWORD=<password>

# 7. Apply schema (9 bảng) + seed dữ liệu tructam — idempotent, chạy lại safe
node scripts/apply-baserow-schema.mjs
```

Tất cả service đặt `restart: unless-stopped` → tự lên lại sau khi restart VPS. Dữ liệu Baserow/Postgres + memory store persist qua named volume.

## Cấu trúc repo (AR-9)

```
mecare/
├── docker-compose.yml      # orchestrate toàn stack
├── .env.example            # biến chung (commit, placeholder)
├── tenants/                # config per-nhà thuốc (KHÔNG commit) — chỉ _template.env
├── baserow/{schema,seed,views}
├── n8n/workflows
├── openclaw/{config,plugins,kichban,guardrails,prompts}
├── zalo-bridge/src
├── docs/                   # runbook, governance
└── scripts/                # warmup.sh / backup.sh
```

## Tài liệu vận hành

- [docs/runbook-onboarding.md](docs/runbook-onboarding.md) — onboarding nhà thuốc mới (placeholder, hoàn thiện ở epic sau).

## Bảo mật

- Secrets/config per-tenant ở `tenants/<slug>.env` — **KHÔNG commit** (`.gitignore` chặn `tenants/*.env`, chỉ chừa `_template.env`).
- KHÔNG hardcode tên/SĐT/khóa trong file commit. KHÔNG dùng image `latest`. KHÔNG expose Postgres ra public.
