#!/usr/bin/env node
// Demo e2e allocate mã ca với Baserow live (Story 1.3, Task 4). Tùy chọn, thủ công.
// Zero-dep (Node built-in fetch). KHÔNG chạy trong CI — cần Baserow live + schema Story 1.2.
//
// Env (đọc từ shell, KHÔNG commit):
//   BASEROW_API_URL      vd http://localhost:8080
//   BASEROW_API_TOKEN    database token (row ops) — hoặc BASEROW_JWT
//   ESCALATION_TABLE_ID  id bảng EscalationCases trong Baserow
//   DEMO_SLUG            (mặc định "tructam")
//   DEMO_PHARMACY_ID     id row Pharmacies của tenant (bắt buộc)
//
// Usage:
//   ESCALATION_TABLE_ID=123 DEMO_PHARMACY_ID=1 BASEROW_API_TOKEN=... node scripts/demo-allocate-case.mjs

import { makeBaserowStore, allocateNewCaseId, getOrCreateByCaseId } from "../openclaw/lib/case-allocator.mjs";
import { parseCaseId } from "../openclaw/lib/case-id.mjs";

const slug = process.env.DEMO_SLUG || "tructam";
const pharmacyId = process.env.DEMO_PHARMACY_ID;
if (!pharmacyId) { console.error("✗ thiếu DEMO_PHARMACY_ID"); process.exit(1); }
const at = new Date().toISOString(); // demo thủ công → dùng now() ở tầng script, KHÔNG trong core

async function main() {
  const store = makeBaserowStore();
  console.log(`• allocate 3 ca tuần tự cho ${slug} (pharmacy_id=${pharmacyId})`);
  for (let i = 0; i < 3; i++) {
    const r = await allocateNewCaseId(store, { slug, pharmacyId, at, fields: { state: "open", created_at: at } });
    console.log(`  → ${r.case_id} (seq=${r.seq})`);
  }

  console.log("• allocate 5 song song (parallel) — kiểm không trùng seq");
  const par = await Promise.all(
    Array.from({ length: 5 }, () =>
      allocateNewCaseId(store, { slug, pharmacyId, at, fields: { state: "open", created_at: at } }, { sleep: (n) => new Promise((r) => setTimeout(r, 20 * n)) }),
    ),
  );
  const seqs = par.map((r) => r.seq);
  const dup = seqs.length !== new Set(seqs).size;
  console.log(`  → seq song song: ${seqs.join(", ")} ${dup ? "✗ TRÙNG!" : "✓ không trùng"}`);

  console.log("• idempotent: ghi lặp cùng case_id");
  const known = par[0].case_id;
  const before = parseCaseId(known);
  const a = await getOrCreateByCaseId(store, known, { state: "open" });
  const b = await getOrCreateByCaseId(store, known, { state: "open" });
  console.log(`  → ${known}: lần1 created=${a.created}, lần2 created=${b.created} ${!a.created && !b.created ? "✓ idempotent" : "(đã tồn tại)"}`);
  console.log(`  parse: slug=${before.slug} date=${before.date} seq=${before.seq}`);

  if (dup) process.exit(1);
  console.log("✓ Demo OK");
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
