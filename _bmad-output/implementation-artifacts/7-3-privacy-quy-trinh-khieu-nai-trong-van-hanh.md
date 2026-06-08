# Story 7.3: Privacy & quy trình khiếu nại trong vận hành

Status: done

## Story

As a chủ nhà thuốc,
I want quy trình tôn trọng quyền từ chối và xử lý khiếu nại đúng,
so that tuân thủ privacy và xử lý sự cố sản phẩm chuyên nghiệp (NFR-7).

## Acceptance Criteria

1. **Group 6 — phục vụ bình thường dù từ chối cung cấp thông tin sức khỏe:** Given khách care_group=6 gửi tin inbound, When MC-Handle-InboundReply xử lý, Then tin đi qua bình thường — `guard-is-group6` chỉ chặn proactive outbound (DueReminders), KHÔNG chặn inbound reply.

2. **Group 6 — proactive bị chặn trước lần tương tác đầu:** Given care_group=6 + `group6_unlocked=false`, When MC-Schedule-DueReminders chạy, Then `guard-group6-locked` chặn — không gửi tin chủ động cho khách chưa unlock.

3. **Group 6 — proactive được phép sau lần phản hồi đầu tiên:** Given care_group=6 + `group6_unlocked=true`, When MC-Schedule-DueReminders chạy, Then guard vượt qua — tin proactive được gửi bình thường.

4. **Group 6 — tự động unlock sau lần reply đầu:** Given khách care_group=6 reply lần đầu, When MC-Handle-InboundReply xử lý, Then node `unlock-group6-customer` cập nhật `group6_unlocked=true` trong Baserow customers.

5. **is_complaint_active — ưu tiên 1 trong phân loại trigger:** Given customer record có `is_complaint_active=true`, When tin inbound đến, Then `trigger_type=complaint_serious` ngay lập tức — TRƯỚC tất cả phân loại khác (Priority 1 trong jsCode của node Classification).

6. **is_complaint_active — cờ cắt ngang, KHÔNG ghi đè care_group:** Given customer có care_group=3 + is_complaint_active=true, Then care_group vẫn là 3 — `is_complaint_active` là cờ độc lập, hai field cùng tồn tại không xung đột.

7. **Complaint keywords → complaint_serious kể cả không có flag:** Given `is_complaint_active=false` nhưng tin có từ 'khiếu nại','tố cáo','bồi thường','thuốc giả', hoặc 'phản ánh', When Classification chạy, Then `trigger_type=complaint_serious` (Priority 9 trong jsCode).

8. **Complaint SLA (NFR-3) — tiếp nhận ngay, xử lý trong ngày:** Runbook ghi rõ: complaint_serious trigger → EscalationCase tạo ngay → dược sĩ xử lý TRONG NGÀY làm việc. Ngoài giờ: ghi nhận, phản hồi sáng hôm sau.

9. **Complaint — quy trình thu thập bằng chứng đủ yếu tố:** Runbook documents checklist thu thập: ảnh sản phẩm + hộp/lọ (số lô + HSD) + mô tả triệu chứng + cam kết đổi/hoàn/báo NSX.

10. **Promo — chỉ gửi khách đã từng mua sản phẩm liên quan:** Phân nhóm khách bằng care_group — khách mua liên quan được gán care_group=4 (Nhóm 4: proactive follow-up sau mua). MC-Schedule-DueReminders lọc theo care_group từ Baserow trước khi gửi → promo chỉ đến đúng đối tượng.

11. **Runbook có section "Privacy & quy trình khiếu nại":** `docs/runbook-onboarding.md` có section mới với 3 subsection: Group 6 privacy protocol, Group 5 complaint handling, và Promo targeting rules.

12. **Go-live checklist có item (d) xác nhận NFR-7:** Checklist go-live trong runbook có item (d): verify guard-is-group6 active + complaint escalation path configured + is_complaint_active field tồn tại trong schema customers.

## Tasks / Subtasks

- [x] Task 1: Thêm section "Privacy & quy trình khiếu nại trong vận hành" vào `docs/runbook-onboarding.md` (AC: #8, #9, #10, #11)
  - [x] 1.1: Viết subsection "Quyền từ chối thông tin sức khỏe (Nhóm 6)" — giải thích care_group=6, `group6_unlocked` flow, cách system tự unlock sau phản hồi đầu, không ép cung cấp thông tin (AC: #1, #2, #3, #4)
  - [x] 1.2: Viết subsection "Quy trình tiếp nhận khiếu nại chất lượng (Nhóm 5)" — checklist thu thập bằng chứng (ảnh + hộp/lọ: số lô + HSD + mô tả) + cam kết đổi/hoàn/báo NSX + SLA bảng (trong giờ vs ngoài giờ) (AC: #8, #9)
  - [x] 1.3: Viết subsection "Quy tắc gửi khuyến mãi" — promo chỉ gửi care_group=4 (đã mua sản phẩm liên quan), giải thích care_group filter trong DueReminders (AC: #10)
  - [x] 1.4: Thêm checklist item **(d)** vào "Checklist go-live" — xác nhận NFR-7: is_complaint_active field hiện diện, group6_unlocked field hiện diện, complaint escalation path có PHARMACIST_ZALO_ID (AC: #12)

- [x] Task 2: Tạo `tests/contract/privacy-complaint.test.js` với ≥9 tests (nhóm 20.x) dùng Node.js built-in `node:test` và `node:assert/strict` (AC: #1–#12)
  - [x] 2.1: Test 20.1 — Schema customers.json có field `is_complaint_active` type boolean (AC: #5, #6)
  - [x] 2.2: Test 20.2 — Schema customers.json có field `group6_unlocked` type boolean + default=false (AC: #2, #3)
  - [x] 2.3: Test 20.3 — MC-Handle-InboundReply.json có node id `guard-is-group6` (AC: #1)
  - [x] 2.4: Test 20.4 — MC-Handle-InboundReply.json có node id `unlock-group6-customer` (AC: #4)
  - [x] 2.5: Test 20.5 — MC-Handle-InboundReply.json có node id `guard-is-complaint-active` (AC: #5)
  - [x] 2.6: Test 20.6 — Classification jsCode chứa `complaint_serious` trigger_type (AC: #5, #7)
  - [x] 2.7: Test 20.7 — Classification jsCode check `is_complaint_active` TRƯỚC các keyword check (Priority 1 ordering) (AC: #5)
  - [x] 2.8: Test 20.8 — MC-Schedule-DueReminders.json có node id `guard-group6-locked` (AC: #2)
  - [x] 2.9: Test 20.9 — Runbook chứa "Privacy" hoặc "khiếu nại" (AC: #11)
  - [x] 2.10: Test 20.10 — Runbook chứa complaint evidence keywords: "số lô" hoặc "HSD" (AC: #9)
  - [x] 2.11: Test 20.11 — Runbook chứa checklist item (d) NFR-7 (AC: #12)
  - [x] 2.12: Test 20.12 — Runbook chứa promo targeting rule hoặc "care_group" targeting context (AC: #10)

## Dev Notes

### Scope: Tài liệu + contract tests — KHÔNG code mới

Story này không thêm logic vào workflow, schema, hay service nào. Toàn bộ guard nodes (`guard-is-group6`, `guard-is-complaint-active`, `guard-group6-locked`, `unlock-group6-customer`) và schema fields (`is_complaint_active`, `group6_unlocked`) đã tồn tại và hoạt động. Story 7.3 là bước documentation + verification cuối cùng của NFR-7 trước go-live.

### Kiến trúc Group 5 & Group 6 hiện có

**care_group field** (`baserow/schema/02-customers.json`):
- `care_group`: integer 1..6 — nhóm chăm sóc chính của khách
- `is_complaint_active`: boolean — cờ cắt ngang Nhóm 5, KHÔNG ghi đè care_group
- `group6_unlocked`: boolean, default=false — Nhóm 6 unlock sau lần reply đầu tiên

**Group 6 Privacy Flow** (MC-Handle-InboundReply.json):
- Node `guard-is-group6` (line ~111): kiểm tra inbound trigger → không block (Group 6 luôn được phục vụ inbound)
- Node `unlock-group6-customer` (line ~141): đặt `group6_unlocked=true` khi Group 6 reply lần đầu

**Group 6 Proactive Block** (MC-Schedule-DueReminders.json):
- Node `guard-group6-locked` (line ~286): block proactive send nếu `group6_unlocked=false`
- Khi `group6_unlocked=true`: tin chủ động được gửi bình thường

**Group 5 Complaint Flow** (MC-Handle-InboundReply.json, Classification jsCode ~line 581):
- Priority 1: `is_complaint_active === true` → `trigger_type: 'complaint_serious'` ngay lập tức
- Priority 9: keywords ['khiếu nại','tố cáo','bồi thường','thuốc giả','phản ánh'] → `complaint_serious`
- Cả hai path đều set `needs_escalation: true` → EscalationCase được tạo → relay dược sĩ

**Promo Targeting** (MC-Schedule-DueReminders.json):
- Workflow lọc customers theo `care_group` từ Baserow
- care_group=4 = khách đã mua sản phẩm liên quan (Nhóm 4: proactive follow-up sau mua)
- Promo chỉ đến đúng nhóm vì template được gán `care_group` tại seed time

### Test Pattern — Node.js built-in test runner

Theo pattern của `tests/contract/runbook.test.js` (Story 7.1, nhóm 18.x) và `tests/contract/warmup.test.js` (Story 7.2, nhóm 19.x):

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const INBOUND = 'n8n/workflows/MC-Handle-InboundReply.json';
const SCHEDULE = 'n8n/workflows/MC-Schedule-DueReminders.json';
const CUSTOMERS_SCHEMA = 'baserow/schema/02-customers.json';
const RUNBOOK = 'docs/runbook-onboarding.md';

describe('20. Privacy & complaint contract tests (NFR-7)', () => {
  // Schema tests
  it('20.1 customers schema has is_complaint_active boolean field', () => {
    if (!existsSync(CUSTOMERS_SCHEMA)) return;
    const schema = JSON.parse(readFileSync(CUSTOMERS_SCHEMA, 'utf8'));
    const field = schema.fields.find(f => f.name === 'is_complaint_active');
    assert.ok(field, 'is_complaint_active field missing');
    assert.equal(field.type, 'boolean');
  });
  // ... continuing pattern
});
```

**Quan trọng:** Dùng `existsSync` guard trên mọi file đọc. Test đọc từ project root — tất cả path là relative to `tests/` runner cwd hoặc dùng `new URL` để resolve.

Xem pattern exact: `tests/contract/runbook.test.js` và `tests/contract/warmup.test.js`.

### Test numbering

- Story 7.1 kết thúc tại group 18.x (test 18.16)
- Story 7.2 dùng group 19.x (test 19.1–19.17)
- **Story 7.3 dùng group 20.x** — bắt đầu 20.1, tối thiểu 20.1–20.12 (12 tests)

### Baseline trước story này

Test suite hiện tại: **854 tests passing**. Sau story 7.3: phải ≥ 866 tests.

```bash
cd /home/tinxu-luna/mecare/tests && node --test
```

### Files KHÔNG sửa

- `n8n/workflows/MC-Handle-InboundReply.json` — chỉ đọc (verified bởi contract tests)
- `n8n/workflows/MC-Schedule-DueReminders.json` — chỉ đọc
- `baserow/schema/02-customers.json` — chỉ đọc (fields đã có)
- `openclaw/` — không liên quan
- `zalo-bridge/` — không liên quan
- `tests/contract/runbook.test.js` — Story 7.1's tests, không chỉnh
- `tests/contract/warmup.test.js` — Story 7.2's tests, không chỉnh

### Project Structure Notes

- Runbook: `docs/runbook-onboarding.md` — thêm section sau "Kiểm thử relay 2 chiều", trước "Kiểm tra stack healthy"
- Checklist go-live trong runbook: thêm item (d) sau item (c2)
- New test file: `tests/contract/privacy-complaint.test.js`
- Test runner discover: `node --test` từ `tests/` dir auto-discover tất cả `*.test.js`

### Complaint Evidence Collection Template (cho runbook)

Nội dung runbook subsection cần bao gồm:

```
1. Thu thập ảnh sản phẩm (chụp rõ nhãn)
2. Ghi số lô (batch number) và HSD (hạn sử dụng) từ hộp/lọ
3. Khách mô tả triệu chứng hoặc vấn đề chất lượng
4. Cam kết với khách: đổi sản phẩm / hoàn tiền / báo NSX (nhà sản xuất)
5. SLA: tiếp nhận ngay; xử lý trong ngày (trong giờ) hoặc sáng hôm sau (ngoài giờ)
```

### References

- NFR-7: `_bmad-output/planning-artifacts/epics.md#L55` — "Privacy & xử lý khiếu nại"
- NFR-3: `_bmad-output/planning-artifacts/epics.md#L51` — SLA khiếu nại chất lượng → tiếp nhận ngay, xử lý trong ngày
- Schema: `baserow/schema/02-customers.json` — fields `is_complaint_active`, `group6_unlocked`, `care_group`
- InboundReply workflow: `n8n/workflows/MC-Handle-InboundReply.json` — nodes guard-is-group6 (L111), unlock-group6-customer (L141), guard-is-complaint-active (L345), Classification jsCode (L581)
- DueReminders workflow: `n8n/workflows/MC-Schedule-DueReminders.json` — node guard-group6-locked (L286)
- Runbook: `docs/runbook-onboarding.md` — add section after "Kiểm thử relay 2 chiều"
- Story 7.1 test pattern: `tests/contract/runbook.test.js` (group 18.x)
- Story 7.2 test pattern: `tests/contract/warmup.test.js` (group 19.x)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Task 1 complete: Added "Privacy & quy trình khiếu nại trong vận hành" section to `docs/runbook-onboarding.md` with 3 subsections (Group 6 privacy, Group 5 complaint handling with evidence checklist + SLA table, promo targeting rules). Added checklist item (d) to go-live checklist covering NFR-7 fields verification.
- Task 2 complete: Created `tests/contract/privacy-complaint.test.js` with 12 tests (group 20.1–20.12). All tests pass.
- Final test count: 866 passing, 0 failing (baseline was 854 → +12 new tests).

### File List

- `docs/runbook-onboarding.md` — added privacy/complaint section + checklist item (d)
- `tests/contract/privacy-complaint.test.js` — new file, 12 tests group 20.x
