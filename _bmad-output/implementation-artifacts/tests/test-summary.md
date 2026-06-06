# Test Automation Summary — Story 1.1 (Scaffold repo & Docker Compose stack)

**Framework:** Node.js built-in test runner (`node --test`) + `node:assert/strict`.
Zero external dependencies — chosen because this is an infra repo with no app-level
package manager state and tests must run offline/CI without `npm install`. Node v24.7
native TypeScript support lets the zalo-bridge `.ts` stub run unmodified.

**Run:** `cd tests && node --test`  →  **40 tests, 40 pass, 0 fail**.

## Generated Tests

### API / E2E (spawn real stub servers, probe HTTP)
- [x] `tests/api/zalo-bridge.test.js` — `/healthz` → 200 `{status:ok,service}`; unknown route → 404 `{error:not_found}` (AC2)
- [x] `tests/api/openclaw.test.js` — `/healthz` → 200 `config_loaded:true`; 404 error path; memory-dir created on boot; **missing-config → exit 1** (fail-fast) (AC2)

### Contract / structural (encode the 4 ACs as regression assertions)
- [x] `tests/contract/repo-layout.test.js` — AR-9 layout: 18 required paths + openclaw config trio (AC1)
- [x] `tests/contract/gitignore.test.js` — `git check-ignore`: real tenant env & `.env` blocked; `_template.env` + `.env.example` trackable; data volumes ignored (AC1/AC4)
- [x] `tests/contract/tenants-secrets.test.js` — `git ls-files`: no real `tenants/*.env`, no real `.env` committed (AC4)
- [x] `tests/contract/compose.test.js` — `docker compose config --format json`: 5 services present, all `restart: unless-stopped`, all healthchecks, pinned tags (no `:latest`), baserow/n8n depend on postgres healthy, `pgdata` named volume, no hardcoded secrets (AC2/AC3/AC4)
- [x] `tests/contract/openclaw-config.test.js` — provider pins non-CN (NFR-5), DeepSeek V4 Flash, key from env (no literal), memory SQLite+sqlite-vec (AC2)
- [x] `tests/helpers/server.js` — shared spawn/probe helper

## Coverage
- Acceptance Criteria: **AC1, AC2, AC3, AC4 — all covered** by automated assertions.
- HTTP endpoints: 2/2 stub services (openclaw, zalo-bridge) — happy path + 404 + (openclaw) fail-fast.
- Compose invariants: services, restart, healthcheck, tag-pin, depends_on, volumes, secret-leak.
- Not covered (out of Story 1.1 scope): live Baserow/n8n HTTP healthz (requires full `docker compose up`, slow — already done manually in dev-story); real cloud calls to OpenRouter (intentionally excluded per AC2).

## Gaps Discovered & Auto-Applied
1. **No automated regression for the 4 ACs** — they were verified once manually in dev-story. → Added 40 automated tests above.
2. **`openclaw/server.js` not host-testable** — `PORT`/`CONFIG_DIR` were hardcoded (`8000` / `/app/config`). → Made overridable via `OPENCLAW_PORT` / `OPENCLAW_CONFIG_DIR` env, **defaults unchanged** so container behavior is identical. (zalo-bridge already used `ZALO_BRIDGE_PORT` — no change needed.)

## Next Steps
- Wire `cd tests && node --test` into CI (no install step needed).
- Story 1.2+: add Baserow schema/seed tests once schema lands.
- Add live-healthz E2E (compose up) as a slow/nightly job if desired.
