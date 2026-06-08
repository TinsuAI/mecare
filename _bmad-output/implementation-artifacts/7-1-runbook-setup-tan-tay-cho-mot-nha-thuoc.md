# Story 7.1: Runbook setup tận tay cho một nhà thuốc

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a kỹ sư onboarding MeCare,
I want một runbook đầy đủ để cấu hình một nhà thuốc mới,
so that mỗi lần onboard nhất quán và đúng an toàn.

## Acceptance Criteria

1. **AC1 — Seed kịch bản 6 nhóm (status=draft):** `docs/runbook-onboarding.md` section "Onboarding tenant mới" chứa bước seed kịch bản bằng `node scripts/apply-baserow-schema.mjs --seed --update-seed`, tham chiếu seed files `baserow/seed/08-message-templates-draft.json` và `baserow/seed/09-faq-entries-draft.json`, với hướng dẫn rõ rằng records sẽ có `status=draft` sau khi seed.

2. **AC2 — Duyệt kịch bản trước go-live:** Runbook chứa bước hướng dẫn chủ nhà thuốc duyệt kịch bản qua Baserow views 08-message-templates-edit và 09-faq-entries-edit (hoặc `scripts/approve-kichban.mjs`); nêu rõ đây là **điều kiện bắt buộc trước khi mở tải thật** (liên kết Story 1.4 pattern duyệt draft→approved).

3. **AC3 — Cấu hình relay dược sĩ thật:** Runbook documents bước điền `PHARMACIST_ZALO_ID` trong `tenants/<slug>.env` (field đã có sẵn trong `tenants/_template.env`) với số Zalo thật của dược sĩ relay; nêu rằng thiếu field này relay leo thang sẽ không hoạt động.

4. **AC4 — Baserow workspace visibility chủ nhà thuốc:** Runbook chứa section hướng dẫn Baserow Admin UI để giới hạn tài khoản chủ nhà thuốc chỉ thấy bảng MessageTemplates + FaqEntries (thực hiện qua Baserow Admin → Workspace Permissions); deferred từ Story 6.3 AC8.

5. **AC5 — Apply link_row filter pharmacy_id per tenant cho views 08+09:** Runbook chứa bước hướng dẫn áp link_row filter pharmacy_id cho views 08-message-templates-edit và 09-faq-entries-edit qua Baserow Admin UI sau khi tạo tenant (deferred từ Story 6.3 AC5 note: "filter by pharmacy_id per tenant qua onboarding runbook").

6. **AC6 — Views 08+09 trong apply-views step:** Runbook bước 5 "Setup stack (lần đầu)" (`apply-baserow-schema.mjs --views`) được cập nhật hoặc chú thích rõ bao gồm views 08-message-templates-edit và 09-faq-entries-edit từ Story 6.3 (cùng dòng lệnh hoặc note thêm).

7. **AC7 — Go-live checklist:** Runbook chứa section "Checklist go-live" liệt kê 3 điều kiện bắt buộc: (a) tất cả MessageTemplates + FaqEntries `status=approved` — kiểm tra qua Baserow UI hoặc `scripts/approve-kichban.mjs`; (b) `PHARMACIST_ZALO_ID` đã điền trong `tenants/<slug>.env`; (c) link Story 7.2 (warm-up & kiểm thử relay 2 chiều) là bước tiếp theo trước khi mở tải đầy.

8. **AC8 — Contract tests pass:** `tests/contract/runbook.test.js` (file mới, test group 18.x) verify: runbook file exists tại `docs/runbook-onboarding.md`; chứa từ khóa seed step; chứa từ khóa approve/duyệt; chứa `PHARMACIST_ZALO_ID`; chứa workspace visibility section; chứa go-live checklist. Toàn bộ suite (kể cả 821 existing tests) pass — no regressions.

## Tasks / Subtasks

- [x] Task 1: Mở rộng `docs/runbook-onboarding.md` với các bước còn thiếu (AC1–AC7)
  - [x] 1.1: Thêm bước seed kịch bản vào section "Onboarding tenant mới" — lệnh `--seed --update-seed`, ref seed files, note status=draft (AC1)
  - [x] 1.2: Thêm bước duyệt kịch bản — hướng dẫn Baserow views 08/09 hoặc approve-kichban.mjs, ghi rõ điều kiện bắt buộc trước go-live (AC2)
  - [x] 1.3: Thêm bước cấu hình relay — điền `PHARMACIST_ZALO_ID` trong tenant env, cảnh báo nếu thiếu (AC3)
  - [x] 1.4: Thêm section "Cấu hình Baserow workspace chủ nhà thuốc" — hướng dẫn Baserow Admin UI Workspace Permissions (AC4)
  - [x] 1.5: Thêm bước "Áp filter pharmacy_id cho views 08+09" — hướng dẫn Baserow Admin UI link_row filter per tenant (AC5)
  - [x] 1.6: Cập nhật bước 5 setup stack — chú thích views 08+09 trong apply-views step (AC6)
  - [x] 1.7: Thêm section "Checklist go-live" — 3 điều kiện bắt buộc + link Story 7.2 (AC7)

- [x] Task 2: Tạo `tests/contract/runbook.test.js` với tests 18.1–18.N (AC8)
  - [x] 2.1: Khởi tạo file — import `fs`, `path`, `assert`, `test`, `describe`; load `docs/runbook-onboarding.md` thành string
  - [x] 2.2: Test 18.1 — file exists
  - [x] 2.3: Tests 18.2–18.3 — seed step present (contains `--seed` + `08-message-templates-draft.json`)
  - [x] 2.4: Tests 18.4–18.5 — approve/duyệt step present (contains `approve-kichban` or `approved`, contains views 08/09 ref)
  - [x] 2.5: Test 18.6 — relay config present (contains `PHARMACIST_ZALO_ID`)
  - [x] 2.6: Test 18.7 — workspace visibility section present (contains "workspace" or "MessageTemplates")
  - [x] 2.7: Tests 18.8–18.9 — go-live checklist present (contains "go-live" or "Checklist", contains "status=approved")

- [x] Task 3: Chạy test suite — xác nhận all pass, no regressions (AC8)
  - [x] 3.1: `cd /home/tinxu-luna/mecare/tests && node --test`
  - [x] 3.2: Tổng số tests phải ≥ 830 (821 existing + ≥9 mới)

- [x] Task 4: Cập nhật sprint-status.yaml (AC: all)
  - [x] 4.1: `7-1-runbook-setup-tan-tay-cho-mot-nha-thuoc: backlog` → `done`
  - [x] 4.2: `epic-7: backlog` → `in-progress`
  - [x] 4.3: Cập nhật `last_updated` comment

## Dev Notes

### Existing runbook file (KHÔNG tạo mới)

`docs/runbook-onboarding.md` đã tồn tại (45 dòng). **Chỉ expand — không rewrite từ đầu.** Nội dung hiện có:
- Public URLs (Baserow/n8n/webhook via Cloudflare Tunnel)
- Setup stack (lần đầu): steps 1–5 (Docker, schema init, views cho Story 3.1/3.2)
- Onboarding tenant mới: steps 1–4 (tenant env, openzca session, Baserow workspace, restart)
- Kiểm tra stack healthy + Port mapping

### PHARMACIST_ZALO_ID đã có trong tenant template

`tenants/_template.env` đã có `PHARMACIST_ZALO_ID=` (dòng trống). Story này **KHÔNG sửa `_template.env`**; chỉ document cách dùng field này trong runbook.

### apply-baserow-schema.mjs flags

```
node scripts/apply-baserow-schema.mjs              # schema + seed + views (toàn bộ)
node scripts/apply-baserow-schema.mjs --seed       # chỉ seed (insert-only, skip key trùng)
node scripts/apply-baserow-schema.mjs --seed --update-seed  # upsert: insert mới + UPDATE hàng theo key
node scripts/apply-baserow-schema.mjs --views      # chỉ tạo/cập nhật views
```

Seed files kịch bản: `baserow/seed/08-message-templates-draft.json`, `baserow/seed/09-faq-entries-draft.json` (tạo từ Story 1.4; record có `tenant_slug` để gắn `pharmacy_id` đúng tenant).

Để seed cho tenant cụ thể: cần seed file có `"tenant_slug": "<slug>"` matching `pharmacy_slug` trong bảng Pharmacies. Nếu seed file hiện dùng `tenant_slug: "tructam"`, runbook cần note engineer phải cập nhật `tenant_slug` trong seed file (hoặc tạo bản copy per tenant) trước khi seed cho tenant mới.

### approve-kichban.mjs

`scripts/approve-kichban.mjs` đã tồn tại từ Story 1.4 — script set `status=approved` + `approved_at` + `approved_by` cho toàn bộ records của tenant trong MessageTemplates + FaqEntries. Runbook cần document cách dùng script này.

### Baserow workspace visibility — Admin UI only

Giới hạn chủ nhà thuốc chỉ thấy 2 bảng (MessageTemplates + FaqEntries) là cấu hình Baserow Admin UI, **không phải code**:
- Baserow Admin → Workspaces → chọn workspace tenant → Members → chọn tài khoản chủ → Database Permissions → ẩn các bảng khác

Không có JSON file hay script nào cho bước này — chỉ là hướng dẫn thủ công trong runbook.

### link_row filter pharmacy_id — per tenant, Admin UI only

Views `08-message-templates-edit.json` và `09-faq-entries-edit.json` (Story 6.3) đã có `description` ghi: "Filter by pharmacy_id per tenant qua onboarding runbook". Filter thực tế cần row_id cụ thể của bản ghi Pharmacies — không hardcode trong JSON được. Engineer áp filter qua:
- Baserow Admin → Views → 08-message-templates-edit → Filters → Add Filter: pharmacy_id = [row_id của nhà thuốc]
- Lặp cho view 09-faq-entries-edit

Pattern này nhất quán với Story 6.1 AC2 + Story 6.2 AC4.

### Contract test pattern (Node.js built-in --test)

Theo pattern `baserow-views.test.js`: dùng Node.js built-in `test`/`describe` không cần framework ngoài.

```js
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const runbook = readFileSync(join(ROOT, "docs", "runbook-onboarding.md"), "utf8");

describe("Story 7.1 — Runbook completeness", () => {
  describe("18.1 — file exists", () => {
    test("18.1: docs/runbook-onboarding.md tồn tại và readable", () => {
      assert.ok(runbook.length > 100, "runbook phải có nội dung");
    });
  });
  // ... tests 18.2–18.9
});
```

Test runner: `cd /home/tinxu-luna/mecare/tests && node --test` (từ thư mục `tests/`, globbing `**/*.test.js`).

### Dependency chain rõ

Story 7.1 **không depend** bất kỳ code chưa có — tất cả scripts, schemas, seed files, và view JSONs đã tồn tại từ Epic 1–6. Story này chỉ document quy trình đã implicit vào một runbook tường minh.

### Views 08+09 trong apply-views step

Bước 5 hiện tại trong runbook:
```
5. Chạy `node scripts/apply-baserow-schema.mjs --views` để tạo views tại quầy (counter-form, phone-lookup, customers-by-group, group-changes-log — Story 3.1/3.2).
```

Cần cập nhật để include views từ Story 6.3:
```
5. Chạy `node scripts/apply-baserow-schema.mjs --views` để tạo tất cả views:
   - Story 3.1/3.2: counter-form, phone-lookup, customers-by-group, group-changes-log
   - Story 5.4: escalation-cases-list
   - Story 6.2: quota-counter-dashboard
   - Story 6.3: message-templates-edit (08), faq-entries-edit (09)
```

### Project Structure Notes

**Files sửa:**
- `docs/runbook-onboarding.md` — expand với bước seed/approve/relay/workspace/views filter/go-live checklist

**Files mới:**
- `tests/contract/runbook.test.js` — contract tests 18.1–18.N

**Files KHÔNG sửa:**
- `tenants/_template.env` — PHARMACIST_ZALO_ID đã có; không cần thay đổi
- `scripts/apply-baserow-schema.mjs` — không sửa logic; chỉ document trong runbook
- `scripts/approve-kichban.mjs` — không sửa; chỉ document trong runbook
- Bất kỳ view JSON nào (Story 6.3 artifacts đã hoàn chỉnh)

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` lines 713–727] — Story 7.1 user story + ACs đầy đủ
- [Source: `_bmad-output/planning-artifacts/architecture.md` line 114] — "Per-tenant cô lập phiên Zalo; Secrets: env per-tenant / external secrets"
- [Source: `_bmad-output/planning-artifacts/architecture.md` line 146] — "Kịch bản = Baserow authoritative. Chủ hiệu thuốc tự sửa + tự duyệt (draft→approved)"
- [Source: `_bmad-output/planning-artifacts/architecture.md` line 167] — No frontend v1 constraint
- [Source: `docs/runbook-onboarding.md`] — Existing 45-line runbook (base to expand)
- [Source: `tenants/_template.env`] — PHARMACIST_ZALO_ID field đã tồn tại
- [Source: `scripts/apply-baserow-schema.mjs` lines 16–19] — Flag documentation for --seed, --seed --update-seed, --views
- [Source: `_bmad-output/implementation-artifacts/1-4-sua-duyet-kich-ban-duoc-si-hai-g1.md`] — Draft→approved pattern (AC4 Story 1.4): idempotent, approve_at, approve_by
- [Source: `_bmad-output/implementation-artifacts/6-3-quan-ly-tu-duyet-kich-ban-chu-hieu-thuoc.md` Dev Notes] — Deferred items: workspace visibility ("chỉ thấy 2 bảng") + link_row filter per tenant
- [Source: `tests/contract/baserow-views.test.js`] — Contract test pattern: Node built-in, loadView helper, describe/test/assert pattern; last group = 17.29

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

N/A — implementation straightforward, no debugging needed.

### Completion Notes List

- Expanded `docs/runbook-onboarding.md` from 45 → ~120 lines with all AC sections.
- Step 5 in "Setup stack" updated to list all views from Stories 3.1/3.2, 5.4, 6.2, 6.3 (AC6).
- "Onboarding tenant mới" extended with steps 5–9: seed, approve, relay config, workspace visibility, pharmacy_id filter (AC1–AC5).
- New section "Checklist go-live" with 3 mandatory conditions + Story 7.2 link (AC7).
- Created `tests/contract/runbook.test.js` with tests 18.1–18.10 (10 tests, exceeds ≥9 target).
- Full suite after dev: 831 pass / 0 fail (up from 821).
- `tenant_slug` gotcha documented in seed step per Dev Notes guidance.
- Post-dev QA gap analysis added 6 tests (18.11–18.16); final suite: 837 pass / 0 fail.

### QA Review — E2E Test Gap Analysis (post-dev)

**Executed:** QA `bmad-qa-generate-e2e-tests` workflow.

**Framework:** Node.js built-in `node:test` (no UI/API — doc + contract tests only).

**Gaps found and auto-applied (6 new tests, 18.11–18.16):**

| Test | AC | Gap |
|------|----|-----|
| 18.11 | AC1 | `09-faq-entries-draft.json` seed file not verified |
| 18.12 | AC1 | `status=draft` post-seed note not verified |
| 18.13 | AC4 | `FaqEntries` in workspace visibility section not verified |
| 18.14 | AC6 | `escalation-cases-list` (Story 5.4) in views step not verified |
| 18.15 | AC6 | `quota-counter-dashboard` (Story 6.2) in views step not verified |
| 18.16 | AC7 | `Story 7.2` link in go-live checklist not verified |

**Final suite:** 837 pass / 0 fail (16 runbook tests: 18.1–18.16).

### File List

- `docs/runbook-onboarding.md` — expanded with AC1–AC7 content
- `tests/contract/runbook.test.js` — new, contract tests 18.1–18.16 (16 tests; 18.11–18.16 added via QA gap analysis)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 7-1 → done
- `_bmad-output/implementation-artifacts/7-1-runbook-setup-tan-tay-cho-mot-nha-thuoc.md` — tasks checked, status done

## Senior Developer Review (AI)

**Reviewer:** claude-sonnet-4-6 | **Date:** 2026-06-07 | **Outcome:** ✅ APPROVED

### Review Summary

Story 7.1 is a documentation-only story with contract tests. Zero new application code — all scripts, schemas, seed files, and view JSONs pre-existed from Epics 1–6. Review scope: runbook content correctness, test coverage completeness, AC satisfaction.

### AC Verification

| AC | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| AC1 | Seed step with `--seed --update-seed`, both seed files, `status=draft` note | ✅ | Runbook step 5 (Onboarding); tests 18.2, 18.3, 18.11, 18.12 |
| AC2 | Approve step, views 08+09, mandatory pre-go-live condition | ✅ | Runbook step 6 (Onboarding); tests 18.4, 18.5 |
| AC3 | `PHARMACIST_ZALO_ID` in tenant env with warning | ✅ | Runbook step 7 (Onboarding); test 18.6 |
| AC4 | Baserow workspace visibility — MessageTemplates + FaqEntries only | ✅ | Runbook step 8 (Onboarding); tests 18.7, 18.13 |
| AC5 | link_row filter pharmacy_id per tenant for views 08+09 | ✅ | Runbook step 9 (Onboarding); test 18.8 |
| AC6 | Step 5 Setup stack lists all views incl. 08+09 from Story 6.3 | ✅ | Runbook Setup stack step 5; tests 18.14, 18.15 |
| AC7 | Go-live checklist — 3 mandatory conditions + Story 7.2 link | ✅ | Runbook "Checklist go-live" section; tests 18.9, 18.10, 18.16 |
| AC8 | `tests/contract/runbook.test.js` group 18.x, suite ≥830 | ✅ | 16 tests (18.1–18.16); 837 pass / 0 fail |

### Issues Found (2 auto-fixed)

| Severity | Issue | Fix Applied |
|----------|-------|-------------|
| MEDIUM | File List said "18.1–18.10" — stale after QA gap-fill added 18.11–18.16 | Updated to "18.1–18.16 (16 tests)" |
| MEDIUM | Completion Notes said "831 pass / 0 fail" — stale after QA gap-fill | Updated to document both 831 (dev) and 837 (QA final) |

### Code Quality

- Contract test pattern consistent with `baserow-views.test.js` — `existsSync` guard prevents crash on missing file, correct.
- `readFileSync` at module top-level — acceptable for test files (eager fail-fast); no performance concern.
- Test 18.4 uses `approve-kichban || approved` fallback — slightly broad but correct given runbook content.
- No application code changed — no security review scope.

### Change Log

- 2026-06-07: Story created and implemented (dev session)
- 2026-06-07: QA gap analysis — 6 tests added (18.11–18.16); suite 831→837
- 2026-06-07: Senior Developer Review — APPROVED; 2 MEDIUM issues auto-fixed
