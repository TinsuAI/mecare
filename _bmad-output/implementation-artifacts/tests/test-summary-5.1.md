# Test Automation Summary — Story 5.1: Trả lời tự động FAQ trong phạm vi kịch bản

**Date:** 2026-06-07

## Generated Tests

### Contract Tests — MC-Handle-InboundReply (Story 5.1 branch)
- [x] `tests/contract/n8n-handle-inbound-reply-structure.test.js` — tests 8.23–8.44 (22 tests)
  - 8.23–8.26: Guard: Is Free Form + condition (AC1)
  - 8.27–8.28: Guard: Is Complaint Active + condition (AC6)
  - 8.29–8.31: Log Escalation Trigger + Call OpenClaw FAQ + Guard: Can Answer (AC2, AC5)
  - 8.32–8.35: Format FAQ Reply + Audit: Write Messages Pending + Execute MC-Zalo-Send + Update Messages Status (AC3, AC4, AC7)
  - 8.36–8.39: Connection topology (Done Signal→Free Form, Can Answer→Escalation, Complaint Active→Escalation, node count)
  - **8.40–8.44 (gap-fill this session):** 5 missing false-branch connections
    - 8.40: Guard: Can Answer false → Format FAQ Reply (AC2)
    - 8.41: Guard: Is Free Form false → Return Result (AC1)
    - 8.42: Guard: Is Complaint Active false → Call OpenClaw FAQ (AC6)
    - 8.43: Log Escalation Trigger → Return Result (AC5, AC6)
    - 8.44: Format FAQ Reply → Audit: Write Messages Pending (AC7)

### Contract Tests — MC-Sync-FaqEntries
- [x] `tests/contract/n8n-sync-faq-entries-structure.test.js` — tests 9.1–9.11 (11 tests)
  - Webhook path, Fetch Approved FAQs, Expand Results pattern, POST Reindex OpenClaw, Return Result, connection order, ≥2 httpRequest nodes (AC8)

### Contract Tests — OpenClaw FAQ plugin + seed
- [x] `tests/contract/openclaw-faq-structure.test.js` — tests 10.1–10.15 (15 tests)
  - faq-lookup.json: name, endpoint, input schema, output schema, RAG threshold (AC2, AC10)
  - faq-guardrail.yml: 3 rules, no_diagnosis, tpcn_suffix (AC3, AC4)
  - gateway.yml: on_inbound_message hook, 6 payload fields (AC10)
  - Seed: ≥2 TPCN draft rows, cach-dung-thuoc, dung-cu, ≥3 approved rows, ≥2 approved TPCN with suffix (AC2, AC4)

## Coverage

| AC | Description | Tests |
|----|-------------|-------|
| AC1 | free_form routing | 8.23, 8.24, 8.36, 8.41 |
| AC2 | faq_lookup schema + FAQ call | 10.3, 10.4, 8.28, 8.29, 8.40 |
| AC3 | NFR-2 no-diagnosis guardrail | 10.6, 10.7, 8.31 |
| AC4 | TPCN mandatory_suffix verbatim | 10.8, 8.31, 10.11, 10.15 |
| AC5 | can_answer=false → escalation | 10.5, 8.30, 8.37, 8.43 |
| AC6 | is_complaint_active bypass | 8.25, 8.26, 8.38, 8.42, 8.43 |
| AC7 | audit-first Messages write | 8.32, 8.33, 8.34, 8.35, 8.44 |
| AC8 | FaqEntries re-index webhook | 9.3–9.11 |
| AC9 | opted-out regression guard | 8.20, 8.21 (existing) |
| AC10 | OpenClaw webhook config | 10.1, 10.2, 10.9, 10.10 |

- Story 5.1 contract tests total: **48 tests** (22 + 11 + 15)
- Gap-fill additions this session: **5 tests** (8.40–8.44)
- Full suite: 641 tests, 640 pass, 1 pre-existing failure (opt-in-gate service not running)

## Next Steps
- Run full stack (`docker compose up`) to clear opt-in-gate pre-existing failure
- Story 5.2 implementation: escalation trigger detection
