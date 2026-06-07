---
baseline_commit: 2afd0b7357772a1818f7cbeb1d449a3a44007767
---

# Story 1.7: Fix .env.example misleading internal port vars

Status: done
<!-- Implemented 2026-06-06 as part of Cloudflare Tunnel setup (not via story-automator) -->

## Story

As a kỹ sư vận hành MeCare,
I want `.env.example` và `docker-compose.yml` nhất quán về cách đặt tên biến port,
so that thay đổi bất kỳ biến port nào trong `.env` đều hoạt động đúng (hoặc bị chặn rõ ràng bằng comment).

## Background / Bug

Phát hiện sau khi test stack Epic 1 (2026-06-06): thay đổi `N8N_PORT` hoặc `ZALO_BRIDGE_PORT` trong `.env` làm stack hỏng âm thầm:

- **`N8N_PORT`**: n8n đọc biến này làm cổng listen nội bộ; healthcheck trong compose hardcode `localhost:5678` và port-map hardcode `:5678` phía container → thay đổi biến không đủ, healthcheck và port-map vẫn trỏ 5678 → service unhealthy.
- **`ZALO_BRIDGE_PORT`**: app đọc biến này làm cổng listen nội bộ (3000); healthcheck probe hardcode `:3000` → thay đổi biến làm app lắng nghe cổng khác nhưng healthcheck vẫn probe 3000 → unhealthy.

Tên biến gây nhầm: `N8N_PORT` / `ZALO_BRIDGE_PORT` trông như cổng host có thể đổi được, nhưng thực ra là cổng nội bộ container bị ràng buộc.

## Acceptance Criteria

**AC1 — Tên biến rõ ràng trong `.env.example`**
- **Given** kỹ sư mới clone repo và copy `.env.example` → `.env`
- **When** đọc `.env`
- **Then** mỗi biến port có comment giải thích: nội bộ container (không đổi) vs host-side (an toàn đổi)
- **And** không có biến nào tên "PORT" mà thực ra không thể tự do thay đổi mà không có warning

**AC2 — n8n port nhất quán**
- **Given** `.env` với `N8N_HTTP_PORT=<bất kỳ port host>` và `N8N_PORT=5678` (cố định)
- **When** chạy `docker compose up`
- **Then** n8n lắng nghe :5678 trong container, healthcheck pass, host truy cập qua `N8N_HTTP_PORT`
- **And** thay đổi `N8N_HTTP_PORT` (host side) không làm hỏng stack

**AC3 — zalo-bridge port nhất quán**
- **Given** `.env` với `ZALO_BRIDGE_HOST_PORT=<bất kỳ port host>` (đổi tên từ `ZALO_BRIDGE_PORT`)
- **When** chạy `docker compose up`
- **Then** zalo-bridge lắng nghe :3000 trong container, healthcheck pass, host map qua `ZALO_BRIDGE_HOST_PORT`
- **And** `ZALO_BRIDGE_PORT` bị xóa khỏi `.env.example` hoặc giữ lại với comment rõ "internal only — do not change"

**AC4 — Không regression trên services khác**
- **Given** sau khi apply fix
- **When** chạy `docker compose up -d --build`
- **Then** tất cả 5 service (baserow, n8n, openclaw, zalo-bridge, postgres) healthy
- **And** `node --test` suite 279 tests vẫn pass

## Tasks / Subtasks

- [ ] **Task 1 — Audit `.env.example` và `docker-compose.yml`** (AC: #1, #2, #3)
  - [ ] Liệt kê tất cả biến `*_PORT` trong cả hai file
  - [ ] Xác định: biến nào là host-side (an toàn đổi) vs nội bộ container (phải cố định)
  - [ ] Quyết định: rename `ZALO_BRIDGE_PORT` → `ZALO_BRIDGE_HOST_PORT` trong compose + env, hoặc thêm comment warning

- [ ] **Task 2 — Fix `docker-compose.yml`** (AC: #2, #3)
  - [ ] n8n: đổi port-map thành `${N8N_HTTP_PORT}:${N8N_PORT:-5678}` (dùng default 5678 nếu không set)
  - [ ] n8n: healthcheck dùng `${N8N_PORT:-5678}` thay vì hardcode `5678`
  - [ ] zalo-bridge: tách `ZALO_BRIDGE_HOST_PORT` (host) vs hardcode `:3000` nội bộ, hoặc dùng `${ZALO_BRIDGE_PORT:-3000}` trong healthcheck
  - [ ] Xác minh không service nào còn hardcode port nội bộ không qua biến

- [ ] **Task 3 — Fix `.env.example`** (AC: #1)
  - [ ] Thêm comment section header: `# HOST PORT MAPPINGS (safe to change)`
  - [ ] Thêm comment section header: `# INTERNAL PORTS (do not change unless you also update compose healthchecks)`
  - [ ] Sắp xếp lại biến theo section
  - [ ] Nếu rename `ZALO_BRIDGE_PORT` → `ZALO_BRIDGE_HOST_PORT`: cập nhật `.env.example`, `docker-compose.yml`, và `tenants/_template.env`

- [ ] **Task 4 — Verify** (AC: #4)
  - [ ] `docker compose down && docker compose up -d --build` → 5/5 healthy
  - [ ] `node --test 'tests/contract/**/*.test.js' 'tests/integration/**/*.test.js' 'tests/api/**/*.test.js'` → 279 pass / 0 fail
  - [ ] Test thay đổi `N8N_HTTP_PORT` sang port khác → stack vẫn healthy

## Dev Notes

**Scope nhỏ — config only.** Không thay đổi app code, chỉ `docker-compose.yml` và `.env.example`.

**Lưu ý khi rename `ZALO_BRIDGE_PORT`:** Kiểm tra xem `zalo-bridge/src` có đọc biến `ZALO_BRIDGE_PORT` trực tiếp không. Nếu có, phải giữ tên cũ cho app và chỉ tách host-side mapping trong compose.

**Test `.env` values sau fix (baseline):**
```
BASEROW_HTTP_PORT=8085
N8N_PORT=5678          # internal (container listen port — do not change)
N8N_HTTP_PORT=5680     # host-side mapping (safe to change)
ZALO_BRIDGE_PORT=3000  # internal (do not change) OR rename to ZALO_BRIDGE_HOST_PORT
```
