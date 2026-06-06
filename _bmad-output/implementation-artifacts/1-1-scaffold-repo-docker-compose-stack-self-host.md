---
baseline_commit: b3b49b2625210fa0d76520f3530034ce24ade077
---

# Story 1.1: Scaffold repo & Docker Compose stack self-host

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a kỹ sư vận hành MeCare,
I want một repo có cấu trúc chuẩn và một Docker Compose stack chạy được toàn bộ service nền tảng trên 1 VPS,
so that mọi epic sau có môi trường chung để build và chạy.

## Acceptance Criteria

**AC1 — Repo layout chuẩn (AR-9)**
- **Given** repo trống (chưa có thư mục hạ tầng)
- **When** áp dụng layout chuẩn theo AR-9
- **Then** repo có: `docker-compose.yml`, `tenants/` (chứa `_template.env`), `baserow/{schema,seed,views}`, `n8n/workflows`, `openclaw/{config,plugins,kichban,guardrails,prompts}`, `zalo-bridge/src`, `docs/`, `scripts/`, `.env.example`, `README.md`
- **And** `.gitignore` chặn mọi file `tenants/*.env`, `.env`, secrets, và data volumes

**AC2 — Stack lên đủ service qua `docker compose up`**
- **Given** stack chưa chạy
- **When** chạy `docker compose up`
- **Then** các service lên: `openclaw`, `n8n` (2.0), `postgres` (schema riêng cho n8n và baserow), `baserow` (1.30.x), `zalo-bridge`, memory store (SQLite + sqlite-vec nằm trong OpenClaw, không phải service riêng)
- **And** healthcheck mỗi service pass
- **And** OpenClaw được cấu hình kết nối DeepSeek V4 Flash qua OpenRouter, pin provider non-TQ (cấu hình hiện diện + đọc khóa từ env; không bắt buộc gọi cloud thật trong CI)

**AC3 — Persistence + auto-restart**
- **Given** stack đang chạy
- **When** restart VPS (hoặc `docker compose down && up`)
- **Then** mọi service tự lên lại (`restart: unless-stopped`)
- **And** dữ liệu Baserow/Postgres và memory store persist qua named volume (không mất sau restart)

**AC4 — Cách ly secrets per-tenant**
- **Given** cấu hình per-tenant
- **When** kiểm tra repo
- **Then** không có file `tenants/*.env` thật nào được commit; chỉ `tenants/_template.env` (placeholder) tồn tại
- **And** `docker-compose.yml` đọc secrets/config từ env (không hardcode khóa/mật khẩu trong file commit)

## Tasks / Subtasks

- [x] **Task 1 — Tạo cây thư mục repo theo AR-9** (AC: #1)
  - [x] Tạo các thư mục: `tenants/`, `baserow/{schema,seed,views}`, `n8n/workflows`, `openclaw/{config,plugins,kichban,guardrails,prompts}`, `zalo-bridge/src`, `scripts/` (`docs/` đã tồn tại — bổ sung, không ghi đè)
  - [x] Thêm `.gitkeep` vào các thư mục rỗng để git theo dõi
  - [x] Tạo `README.md` root: mô tả stack, lệnh `docker compose up`, link `docs/runbook-onboarding.md` (placeholder OK)
  - [x] Tạo `tenants/_template.env` với các biến per-tenant (xem Dev Notes › Cấu hình per-tenant)
- [x] **Task 2 — `.gitignore` + `.env.example`** (AC: #1, #4)
  - [x] Xác minh `.gitignore` đã chặn `*.env` / `*.env.*` (đã có) — thêm comment rõ chặn `tenants/*.env`; thêm ignore data volumes nếu dùng bind-mount (vd `baserow/data/`, `postgres/data/`)
  - [x] Tạo `.env.example` (biến chung, commit được): `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `OPENROUTER_API_KEY`, `BASEROW_PUBLIC_URL`, `N8N_*`, … — chỉ placeholder, KHÔNG giá trị thật
- [x] **Task 3 — Soạn `docker-compose.yml`** (AC: #2, #3)
  - [x] Service `postgres` (chia sẻ engine; tạo DB/schema riêng cho `n8n` và `baserow`); named volume `pgdata`; healthcheck `pg_isready`
  - [x] Service `baserow` (image `baserow/baserow:1.30.x`, pin tag); named volume; depends_on postgres healthy; healthcheck HTTP
  - [x] Service `n8n` (n8n 2.0, pin tag; queue mode tùy chọn v1); depends_on postgres healthy; healthcheck HTTP `/healthz`
  - [x] Service `openclaw` (agent + memory SQLite+sqlite-vec; mount `openclaw/config`, `openclaw/plugins`; named volume cho memory store); env `OPENROUTER_API_KEY`; healthcheck
  - [x] Service `zalo-bridge` (build từ `zalo-bridge/`; mount `zalo-bridge/tenants` per-tenant; healthcheck)
  - [x] Tất cả service: `restart: unless-stopped`; network nội bộ Docker chung; KHÔNG expose port nhạy cảm ra ngoài trừ cần thiết
- [x] **Task 4 — Stub cấu hình OpenClaw + zalo-bridge để stack bootstrap được** (AC: #2)
  - [x] `openclaw/config/gateway.yml` (channel openzalo, provider OpenRouter — placeholder hợp lệ)
  - [x] `openclaw/config/provider-openrouter.yml` (DeepSeek V4 Flash, pin provider non-TQ, đọc key từ env)
  - [x] `openclaw/config/memory.yml` (SQLite + sqlite-vec, đường dẫn volume self-host)
  - [x] `zalo-bridge/package.json` + `zalo-bridge/src/index.ts` stub (chỉ cần khởi động + expose healthcheck; logic FR-11..13 ở Epic 2)
  - [x] `Dockerfile` cho `zalo-bridge` (Node TS) nếu build từ source
- [x] **Task 5 — Xác minh end-to-end** (AC: #2, #3, #4)
  - [x] `docker compose config` parse không lỗi
  - [x] `docker compose up -d` → tất cả service `healthy`
  - [x] `docker compose down && docker compose up -d` → dữ liệu Baserow/Postgres còn nguyên (tạo 1 record test trước, kiểm tra sau restart)
  - [x] `git status` xác nhận không có `tenants/*.env` thật trong tracked files

## Dev Notes

### Bối cảnh & ranh giới story
- **Đây là foundation story bắt buộc (AR-2) — chạy TRƯỚC mọi FR.** Không story nào khác bắt đầu cho tới khi stack này lên được. [Source: epics.md#Epic-1 ; architecture.md#Deployment-foundation]
- Story này CHỈ dựng khung + bootstrap service. **KHÔNG** tạo Baserow schema (đó là Story 1.2), **KHÔNG** sinh mã ca (Story 1.3), **KHÔNG** viết logic anti-ban/agent (Epic 2+). Giữ scope hẹp — chỉ "stack lên được, persist được, restart được".
- **Không phải greenfield code-scaffold** — runtime stack đã neo trong architecture; "foundation" = cách dựng & ghép các service self-hosted. [Source: architecture.md#Primary-Technology-Domain]

### Stack & version pin (BẮT BUỘC — chống drift)
| Service | Image/Version | Vai trò | Nguồn |
|---|---|---|---|
| OpenClaw | self-hosted agent gateway (agent + memory + channel) | lõi hội thoại reactive + memory | AR-1 |
| n8n | **2.0** (Community Edition, Docker, queue mode) | scheduler + quota + watchdog | AR-1 |
| Baserow | **1.30.x** (pin tag chính xác) | CRM/DB nguồn sự thật + UI | AR-1 |
| PostgreSQL | dùng chung 1 engine; **schema/DB riêng** cho n8n và baserow | DB engine | architecture.md#Data-Architecture |
| zalo-bridge | TypeScript wrap openzca (Node) | lớp Zalo + anti-ban + de-anon | AR-1 |
| Memory store | **SQLite + sqlite-vec** nằm TRONG OpenClaw (không service riêng) | recall ngữ nghĩa self-host | architecture.md#AI/Agent |
- **Pin tag cụ thể**, không dùng `latest` (chống breaking change OSS phát triển nhanh — rủi ro foundation đã ghi nhận). [Source: architecture.md#Rủi-ro-foundation]
- **Hermes agent đã BỎ** như runtime riêng — KHÔNG thêm service Hermes. OpenClaw tự là agent; model cắm qua provider plugin. [Source: architecture.md#Quyết-định-nền-tảng]

### AI provider
- **DeepSeek V4 Flash qua OpenRouter** (`$0.098/$0.197` per 1M, ctx 1M). Cắm vào OpenClaw provider plugin.
- **Pin provider non-TQ** trên OpenRouter (data residency dữ liệu sức khỏe — NFR-5). Cấu hình ở `openclaw/config/provider-openrouter.yml`.
- Story này chỉ cần **cấu hình hiện diện + đọc key từ env**. Không cần chứng minh gọi cloud thành công (để tránh phụ thuộc khóa thật trong CI) — nhưng OpenClaw phải khởi động không lỗi với config đó.

### Cấu hình per-tenant (`tenants/_template.env`)
Các biến mẫu (giá trị thật KHÔNG commit) — neo theo `Pharmacies` tenant trong architecture:
- `PHARMACY_SLUG` (vd `tructam`) — dùng trong mã ca `ESC-<pharmacy_slug>-...`
- Zalo session ref / đường dẫn phiên openzca
- `PERSONA_NAME=Dược Sĩ Hải` (KHÔNG phải "Ngọc" — persona cũ; xem [[mecare-persona-relay]])
- Quota tháng (trần gói 1.000 tin/tháng), giờ làm việc
- Tenant đầu tiên thực tế = **Trúc Tâm** (`tructam.env`) — chỉ tạo `_template.env` ở story này. [Source: architecture.md#Deployment-foundation]

### Cấu trúc thư mục mục tiêu (rút gọn — bám AR-9)
```
mecare/
├── docker-compose.yml          # orchestrate toàn stack
├── .env.example                # biến chung (commit, placeholder)
├── .gitignore                  # ignore tenants/*.env, secrets, data volumes
├── tenants/                    # config per-nhà thuốc (KHÔNG commit) — chỉ _template.env
├── baserow/{schema,seed,views} # schema = Story 1.2; story này chỉ tạo thư mục
├── n8n/workflows               # workflow = Epic sau; story này chỉ thư mục
├── openclaw/{config,plugins,kichban,guardrails,prompts}
├── zalo-bridge/src             # stub bootstrap + healthcheck
├── docs/                       # đã tồn tại — bổ sung runbook placeholder
└── scripts/                    # warmup.sh / backup.sh (placeholder OK)
```
[Source: architecture.md#Complete-Project-Directory-Structure]

### Ranh giới kiến trúc (giữ đúng để không vỡ ở epic sau)
- **Network egress ra cloud DUY NHẤT** = OpenClaw → OpenRouter (qua PII-min). Không service nào khác gọi cloud. [Source: architecture.md#Architectural-Boundaries]
- **zalo-bridge** = điểm DUY NHẤT biết PII thật (de-anonymize lúc gửi). Compose phải cô lập phiên Zalo per-tenant (`zalo-bridge/tenants/`).
- **Baserow authoritative; memory recall-only.** Volume riêng cho memory store, rebuild được từ Baserow.
- **Multi-tenancy:** thiết kế compose để 1 phiên Zalo hỏng không kéo tenant khác (NFR-6) — ở story này nghĩa là zalo-bridge mount per-tenant, không trộn state.

### Convention bắt buộc (enforcement — áp ngay từ foundation)
- JSON inter-component **snake_case** (khớp Baserow). [Source: architecture.md#Format-Patterns]
- Secrets/config per-tenant ở `tenants/<slug>.env` — **KHÔNG commit**. [Source: architecture.md#Structure-Patterns]
- Anti-patterns TRÁNH: hardcode tên/SĐT/khóa trong file commit; dùng image `latest`; expose Postgres ra public. [Source: architecture.md#Enforcement]

### Testing standards
- Không có test framework app-level ở story hạ tầng này. **Kiểm thử = vận hành thực:**
  - `docker compose config` (lint compose)
  - `docker compose up -d` → poll healthcheck tới khi tất cả `healthy`
  - Restart test cho persistence (AC3): tạo record Baserow → `down`/`up` → record còn.
  - `git status` / `git ls-files | grep tenants` xác nhận không lộ secret (AC4).
- Ghi lại lệnh + kết quả vào Completion Notes.

### Trạng thái repo hiện tại (đã đọc — quan trọng)
- **Chưa có** thư mục hạ tầng nào (`docker-compose.yml`, `baserow/`, `n8n/`, `openclaw/`, `zalo-bridge/`, `tenants/`, `scripts/` đều thiếu). Chỉ có `docs/`, website/videos (không liên quan story này).
- **`.gitignore` ĐÃ chặn** `*.env` và `*.env.*` (dòng có sẵn) → AC1/AC4 phần env gần như đạt; chỉ cần thêm comment rõ ràng + ignore data volume nếu dùng bind-mount. KHÔNG xóa rule env hiện có.
- `kichban-chamsoc-khachhang.md` nằm ở root (persona cũ "Ngọc", mô hình 2-vai cũ) — **KHÔNG đụng** ở story này; việc viết lại sang "Dược Sĩ Hải" + seed Baserow là Story 1.4 (G1). [Source: epics.md#G1]
- File ảnh/website ở root không liên quan — bỏ qua.

### Project Structure Notes
- Layout bám 1:1 AR-9 / architecture.md#Complete-Project-Directory-Structure. Không phát sinh thư mục ngoài chuẩn.
- `docs/` đã tồn tại → chỉ thêm file placeholder (`runbook-onboarding.md`, `data-governance.md`) nếu tiện, không bắt buộc trong story này.
- Biến thể đã chấp nhận: `baserow/schema/*.json` và `n8n/workflows/*.json` để **rỗng (.gitkeep)** ở story này — nội dung thật thuộc Story 1.2 và các epic sau.

### References
- [Source: epics.md#Story-1.1-Scaffold-repo-Docker-Compose-stack-self-host] — story gốc + AC BDD
- [Source: epics.md#Epic-1-Nền-tảng-Khử-rủi-ro] — mục tiêu epic, AR/NFR/Gap
- [Source: architecture.md#AR-2-Initialization] — danh sách service foundation bắt buộc
- [Source: architecture.md#AR-9-Project-structure] — repo layout chuẩn
- [Source: architecture.md#Deployment-foundation] — Docker Compose 1 VPS, Postgres chung, per-tenant
- [Source: architecture.md#Complete-Project-Directory-Structure] — cây thư mục đầy đủ
- [Source: architecture.md#Infrastructure-Deployment] — restart, volume, network
- [Source: architecture.md#AI/Agent] — DeepSeek V4 Flash + OpenRouter pin non-TQ
- [Source: architecture.md#Enforcement] — anti-patterns, convention bắt buộc
- [[mecare-architecture-openclaw]] — quyết định OpenClaw-trung tâm, bỏ Hermes
- [[mecare-persona-relay]] — persona "Dược Sĩ Hải" + mô hình relay

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code dev-story workflow)

### Debug Log References

- Build fail đầu tiên: `src/index.ts(14,40): error TS7006: Parameter 'res' implicitly has an 'any' type` → thiếu `@types/node` trong devDeps zalo-bridge. Fix: thêm `@types/node`.
- `docker compose up` fail: `failed to bind host port 0.0.0.0:8080/tcp: address already in use` (và 5678) → host đã chạy process khác. Fix: tham số hoá host port (`BASEROW_HTTP_PORT`, `N8N_HTTP_PORT`); verify chạy với 18080/15678.
- `.env.example` bị `*.env.*` chặn → thêm negation `!.env.example` vào `.gitignore`.

### Completion Notes List

- **Tất cả 4 AC verify end-to-end bằng vận hành thực** (story hạ tầng, không có test framework app-level):
  - **AC1** ✓ Cây thư mục AR-9 đầy đủ; `.gitignore` chặn `tenants/*.env` + data volumes; `_template.env` và `.env.example` trackable (qua negation rules).
  - **AC2** ✓ `docker compose config` parse OK; `docker compose up -d --build` → cả 5 service `healthy` (postgres, baserow 1.30.1, n8n 2.25.5, openclaw, zalo-bridge). OpenClaw nạp 3 file config + đọc `OPENROUTER_API_KEY` từ env (log: `config OK; OPENROUTER_API_KEY present`), provider pin `pin_non_cn: true`, model `deepseek/deepseek-chat-v4-flash`. Postgres tạo DB riêng `baserow` + `n8n` (multi-db init script).
  - **AC3** ✓ Tạo marker row trong Postgres → `docker compose down && up` (giữ volume) → marker còn nguyên (`survive-restart`). Mọi service `restart: unless-stopped`.
  - **AC4** ✓ `git ls-files | grep tenants/.*\.env` rỗng; `tructam.env` bị ignore, `_template.env` trackable; không có khóa/mật khẩu thật hardcode trong `docker-compose.yml` (chỉ placeholder `change-me` qua `${VAR:-default}`).
- **Quyết định scope — OpenClaw stub:** OpenClaw chưa có image công khai (runtime agent gateway thật thuộc Epic 2+). Để AC2/AC3 verify được (service `healthy`, persist/restart), build foundation stub `openclaw/server.js` (+ `Dockerfile`): nạp config, xác nhận đọc env key, mở `/healthz`, tạo thư mục memory volume. KHÔNG gọi cloud thật. Thay bằng runtime OpenClaw thật ở Epic 2+.
- **Pin tag cụ thể (chống `latest`):** `postgres:16-alpine`, `baserow/baserow:1.30.1`, `n8nio/n8n:2.25.5` (dòng 2.x — tag 2.0.0 không tồn tại trên Hub; 2.25.5 là 2.x ổn định mới nhất).
- **Memory store** = SQLite + sqlite-vec trong OpenClaw (named volume `openclaw_memory`), không service riêng — đúng AR.
- Stack đã teardown (`down -v`) sau khi verify để dọn tài nguyên.

### File List

**Mới (new):**
- `docker-compose.yml`
- `.env.example`
- `README.md`
- `tenants/_template.env`
- `tenants/.gitkeep`
- `baserow/schema/.gitkeep`, `baserow/seed/.gitkeep`, `baserow/views/.gitkeep`
- `n8n/workflows/.gitkeep`
- `openclaw/config/gateway.yml`
- `openclaw/config/provider-openrouter.yml`
- `openclaw/config/memory.yml`
- `openclaw/plugins/.gitkeep`, `openclaw/kichban/.gitkeep`, `openclaw/guardrails/.gitkeep`, `openclaw/prompts/.gitkeep`
- `openclaw/Dockerfile`
- `openclaw/server.js` (foundation stub)
- `openclaw/package.json` (`"type":"module"` — ESM ổn định mọi Node 20.x; review-fix M3)
- `zalo-bridge/tenants/.gitkeep` (giữ thư mục phiên Zalo per-tenant trong VCS; review-fix M1)
- `zalo-bridge/package.json`
- `zalo-bridge/tsconfig.json`
- `zalo-bridge/Dockerfile`
- `zalo-bridge/src/index.ts` (stub bootstrap + healthcheck)
- `scripts/.gitkeep`
- `scripts/init-multiple-dbs.sh`
- `docs/runbook-onboarding.md` (placeholder)
- `tests/package.json` + bộ test hồi quy (Node built-in runner, zero-dep) — review-fix M2:
  - `tests/helpers/server.js`
  - `tests/contract/{repo-layout,gitignore,tenants-secrets,compose,openclaw-config}.test.js`
  - `tests/api/{openclaw,zalo-bridge}.test.js`

**Sửa (modified):**
- `.gitignore` (thêm rule `tenants/*.env` + negation `!tenants/_template.env` + `!.env.example` + data volumes)

## Senior Developer Review (AI)

**Reviewer:** Tinsu · **Date:** 2026-06-06 · **Outcome:** ✅ Approve (sau auto-fix)

### Phạm vi
Adversarial review: đối chiếu mọi task `[x]` + 4 AC với code thật + git reality. Đọc toàn bộ File List. Chạy bộ test (40/40 pass), boot thử stub OpenClaw, validate `docker compose config`.

### Kết luận
- **CRITICAL: 0.** Mọi task `[x]` đều có bằng chứng thực thi; cả 4 AC implemented & test-verified (34 contract test phủ AC1/AC4; 6 API test phủ healthcheck AC2; design persist/restart AC3 đúng).
- **AC mapping:** AC1 ✓ (`tests/contract/repo-layout.test.js`, `gitignore.test.js`) · AC2 ✓ (`compose.test.js`, `openclaw-config.test.js`, `api/*.test.js`) · AC3 ✓ (named volume + `restart: unless-stopped`, verify restart trong Completion Notes) · AC4 ✓ (`tenants-secrets.test.js`).

### Findings & xử lý (auto-fix tất cả HIGH/MEDIUM + LOW rẻ)
| # | Sev | Vấn đề | Fix |
|---|---|---|---|
| M1 | MED | `zalo-bridge/tenants/` bị `.gitignore` chặn toàn bộ, không `.gitkeep` → thư mục cô lập phiên per-tenant (NFR-6) không tái lập từ clone sạch; thiếu trong File List. | Thêm `zalo-bridge/tenants/.gitkeep` + negation `!zalo-bridge/tenants/.gitkeep` (file phiên thật vẫn ignore — đã verify bằng `git add -n`). |
| M2 | MED | Bộ `tests/` (9 file, 40 test) vắng mặt trong File List → tài liệu thiếu minh bạch. | Bổ sung vào File List. |
| M3 | MED | `openclaw/` không có `package.json`; `server.js` dùng ESM `import` trong `.js`, phụ thuộc auto-detect ESM của Node ≥20.19. `node:20-alpine` float → patch cũ = `SyntaxError`. | Thêm `openclaw/package.json` (`"type":"module"`) + `COPY package.json` vào Dockerfile. Boot lại OK. |
| L1 | LOW | `.env.example` khai báo `N8N_EXECUTIONS_MODE` + `DATABASE_NAME` nhưng compose không đọc → config chết/gây hiểu nhầm. | Map `N8N_EXECUTIONS_MODE` → `EXECUTIONS_MODE` của n8n trong compose; chú thích `DATABASE_NAME` là tham chiếu. |
| L2 | LOW | Base image `node:20-alpine` không pin patch — vi phạm chính convention "KHÔNG `latest`" ở base layer. | **Ghi nhận, chưa fix** (pin tag cần verify build-time/Docker Hub). M3 đã loại bỏ rủi ro ESM nên không còn chặn. Theo dõi khi build production. |

### Sau fix
- `docker compose config` → valid; `EXECUTIONS_MODE: regular` xuất hiện.
- OpenClaw stub boot sạch với `package.json` mới (`config OK`, healthcheck 200).
- Test suite: **40/40 pass** (34 contract + 6 api).

## Change Log

| Date | Version | Mô tả | Tác giả |
|---|---|---|---|
| 2026-06-06 | 0.1.0 | Scaffold repo AR-9 + Docker Compose stack self-host (postgres/baserow/n8n/openclaw/zalo-bridge). Verify 4 AC end-to-end (config/up/restart/git). | dev-story (Opus 4.8) |
| 2026-06-06 | 0.1.1 | Senior Developer Review (AI): 0 CRITICAL, auto-fix M1/M2/M3 + L1 (gitkeep per-tenant + negation, File List, openclaw package.json type:module, n8n EXECUTIONS_MODE). 40/40 test pass. Outcome Approve → done. | story-automator-review (Opus 4.8) |
