# Test Automation Summary — Story 1.4

**Story:** Sửa & duyệt kịch bản "Dược Sĩ Hải" (G1)
**Workflow:** bmad-qa-generate-e2e-tests
**Date:** 2026-06-06
**Framework:** Node built-in `node:test` + `node:assert/strict` (zero-dep, ESM). Chạy: `cd tests && node --test`.

## Result

- **176/176 pass**, 48 suites, 0 fail (baseline trước QA = 150 → **+26 test gap-fill**).
- Toàn bộ regression Story 1.1/1.2/1.3 vẫn xanh.
- Tất cả test offline — KHÔNG phụ thuộc Baserow live (fake store in-memory + đọc seed JSON trực tiếp).

## Scope note (E2E)

UI/E2E browser: KHÔNG áp dụng. Story 1.4 = chuyển hóa nội dung + logic upsert/approve thuần, không có giao diện. "E2E" ở đây = contract nội dung seed + integration logic upsert/approve qua store interface (DI seam). Lớp REST/CLI (`approve-kichban.mjs`, `apply-baserow-schema.mjs`) tự chạy `main()` khi import → đường vận hành thật cần env Baserow (chưa tự test; logic thuần đã phủ qua DI store).

## Generated / Extended Tests

### Contract — nội dung seed (`tests/contract/kichban-content.test.js`)
Đã có (baseline): no "Ngọc", 6 nhóm body không rỗng, câu an toàn (gấp đôi liều / 38.5°C / TPCN suffix), 4 scope cốt lõi.

Gap-fill thêm:
- [x] Mô hình relay — KHÔNG còn câu chữ 2-vai cũ: absent `kết nối dược sĩ`, absent `nhân viên`; persona "Dược Sĩ Hải" ở MessageTemplates; tự xưng `em` (AC2)
- [x] Cấp cứu **115** hiện diện (phát song song, AC2)
- [x] Quy tắc bù liều đầy đủ: ngưỡng `1–2 tiếng`; câu nguyên văn nằm đúng Nhóm 1 (AC3)
- [x] Placeholder `[TÊN]` giữ nguyên — không điền cứng (AC1)
- [x] Mọi FAQ: status=draft, version≥1, updated_by, answer không rỗng (AC1)

### Integration — upsert + approve (`tests/integration/seed-update-approve.test.js`)
Đã có (baseline): upsert insert/update/skip cơ bản, không hạ approved→draft, approve 3-field + idempotent + tenant isolation, guard arg cơ bản.

Gap-fill thêm:
- [x] `upsertSeed` guards: store thiếu list/create ném; update=true thiếu update() ném; seedRows non-array ném (AC5)
- [x] `upsertSeed` batch hỗn hợp: đếm đúng inserted/updated/skipped; `decorate` áp dụng khi insert
- [x] `buildUpsertPatch` tôn trọng `statusFields` tùy biến
- [x] `matchKey`: ném khi keyFields rỗng/non-array; multi-field key; so khớp dạng chuỗi số-vs-text (AC5)
- [x] `approveDrafts`: store guard ném; ném sớm thiếu approvedBy/now; `pharmacyId=null` duyệt mọi tenant; hỗn hợp draft/approved chỉ duyệt draft (AC4)
- [x] `belongsToTenant` biên: pharmacy_id undefined→false; mảng id thô; pharmacyId undefined = mọi hàng (NFR-6)

## Coverage by AC

| AC | Phủ |
|----|-----|
| AC1 đích Baserow + 2-nơi đồng bộ + field đủ | ✅ contract (MT 6 nhóm, FAQ field/answer, placeholder) |
| AC2 persona Hải + relay sạch 2-vai | ✅ contract (no Ngọc, no kết-nối/nhân-viên, Hải, em, 115) |
| AC3 lằn ranh an toàn nguyên văn | ✅ contract (gấp đôi liều @Nhóm1, 1–2 tiếng, 38.5°C, TPCN suffix) |
| AC4 draft→approved idempotent có dấu vết | ✅ integration (3-field, không reset, guard, tenant, pharmacyId null) |
| AC5 upsert chạy được idempotent | ✅ integration (guards, batch, matchKey, statusFields, decorate) |

## Checklist (skill)

- [x] API/logic tests generated — store-interface (DI) integration
- [x] E2E browser — N/A (no UI); contract nội dung thay thế
- [x] Standard framework APIs (`node:test`)
- [x] Happy path + error/guard cases phủ
- [x] All tests pass (176/176)
- [x] Clear descriptions, no hardcoded waits, independent (fake store dựng mới mỗi test)
- [x] Summary saved

## Next Steps

- Khi vận hành Baserow live: smoke `apply-baserow-schema.mjs --seed --update-seed` + `approve-kichban.mjs --by "..." --dry-run` rồi thật, `GET` xác nhận approved (AC4/AC5 live — cần env).
- Cân nhắc refactor 2 script tách `main()` (export guard `import.meta`) để fetch-mock test REST adapter như Story 1.3 nếu muốn phủ lớp HTTP.
