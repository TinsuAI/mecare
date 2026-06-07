#!/usr/bin/env node
// run-multi-tenant-spike.mjs — Harness spike multi-tenant Zalo ↔ OpenClaw (Story 1.6, G6).
//
// Kịch bản spike (2 scenarios):
//   1. Message routing isolation: pharmacy_001 vs pharmacy_002 — không cross-contamination
//   2. Session fault isolation: crash pharmacy_001 → pharmacy_002 vẫn active (NFR-6)
//
// Adapter DI:
//   STUB (mặc định): in-memory, offline, CI-safe
//   LIVE (--live flag): TODO shell stubs (Epic 2+) — NOT cho CI
//
// GO condition: isolation_rate === 1.0 AND cross_tenant_bleed_count === 0
//
// Usage:
//   node scripts/run-multi-tenant-spike.mjs             # stub → ghi docs/spike-multi-tenant-g6.md
//   node scripts/run-multi-tenant-spike.mjs --dry-run   # in báo cáo ra stdout, KHÔNG ghi file
//   node scripts/run-multi-tenant-spike.mjs --live      # live adapter (cần openzca installed)

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  StubAdapter,
  LiveAdapter,
  createSessionManager,
} from "../zalo-bridge/src/lib/multi-tenant-spike.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const USE_LIVE = argv.includes("--live");

const REPORT_PATH = resolve(ROOT, "docs/spike-multi-tenant-g6.md");

function log(...m) { console.error(...m); }

// ── Scenario 1: Message routing isolation (AC1) ────────────────────────────────────
export async function runIsolationCheck(adapter) {
  const mgr = createSessionManager(adapter);

  await mgr.startTenant("pharmacy_001");
  await mgr.startTenant("pharmacy_002");

  await mgr.send("pharmacy_001", { text: "MSG_A_001", id: "m1" });
  await mgr.send("pharmacy_002", { text: "MSG_B_002", id: "m2" });

  const inbox001 = await mgr.receive("pharmacy_001");
  const inbox002 = await mgr.receive("pharmacy_002");

  const sessionIds = mgr.statusAll().map(s => s.session_id);

  const results = [
    { name: "pharmacy_001 nhận MSG_A_001", pass: inbox001.some(m => m.id === "m1") },
    { name: "pharmacy_001 KHÔNG nhận MSG_B_002 (no cross-tenant bleed)", pass: !inbox001.some(m => m.id === "m2") },
    { name: "pharmacy_002 nhận MSG_B_002", pass: inbox002.some(m => m.id === "m2") },
    { name: "pharmacy_002 KHÔNG nhận MSG_A_001 (no cross-tenant bleed)", pass: !inbox002.some(m => m.id === "m1") },
    { name: "session_id pharmacy_001 = 'pharmacy_001' (định danh riêng)", pass: sessionIds.includes("pharmacy_001") },
    { name: "session_id pharmacy_002 = 'pharmacy_002' (định danh riêng)", pass: sessionIds.includes("pharmacy_002") },
  ];

  const bleedIntoA = inbox001.some(m => m.id === "m2");
  const bleedIntoB = inbox002.some(m => m.id === "m1");
  const crossBleedCount = (bleedIntoA ? 1 : 0) + (bleedIntoB ? 1 : 0);

  return { results, crossBleedCount };
}

// ── Scenario 2: Session fault isolation / NFR-6 (AC2) ─────────────────────────────
export async function runShutdownCheck(adapter) {
  const mgr = createSessionManager(adapter);
  const lostEvents = [];
  mgr.on("session.lost", e => lostEvents.push(e));

  await mgr.startTenant("pharmacy_001");
  await mgr.startTenant("pharmacy_002");

  await mgr.crash("pharmacy_001");

  await mgr.send("pharmacy_002", { text: "POST_CRASH_MSG", id: "pc1" });
  const inbox002 = await mgr.receive("pharmacy_002");

  const all = mgr.statusAll();
  const status001 = all.find(s => s.pharmacy_id === "pharmacy_001");
  const status002 = all.find(s => s.pharmacy_id === "pharmacy_002");

  const results = [
    { name: "pharmacy_001 status = 'crashed' sau crash()", pass: status001?.status === "crashed" },
    { name: "pharmacy_002 vẫn 'active' sau crash pharmacy_001 (NFR-6)", pass: status002?.status === "active" },
    { name: "pharmacy_002 nhận/gửi tin bình thường sau crash", pass: inbox002.some(m => m.id === "pc1") },
    { name: "event session.lost emit với pharmacy_id pharmacy_001 (AR-8)", pass: lostEvents.some(e => e.pharmacy_id === "pharmacy_001") },
    {
      name: "payload session.lost có pharmacy_id + session_id + ts_iso (AR-8)",
      pass: lostEvents.some(e => e.pharmacy_id && e.session_id && e.ts_iso),
    },
  ];

  return { results, lostEvents };
}

// ── Report renderer ───────────────────────────────────────────────────────────────
export function renderReport({ isolationResults, shutdownResults, isolationRate, crossBleedCount, runMode, commit, go }) {
  const goLabel = go ? "✅ GO" : "❌ NO-GO";
  const allResults = [...isolationResults, ...shutdownResults];
  const passedChecks = allResults.filter(r => r.pass).length;
  const totalChecks = allResults.length;

  const fmtRows = results => results.map(r => `| ${r.pass ? "✅" : "❌"} | ${r.name} |`).join("\n");

  return `# Spike Report: Multi-Tenant Zalo ↔ OpenClaw (G6)

## Kết Luận

**${goLabel}**

| Metric | Giá trị |
|--------|---------|
| \`isolation_rate\` | ${isolationRate.toFixed(2)} |
| \`cross_tenant_bleed_count\` | ${crossBleedCount} |
| Checks passed | ${passedChecks}/${totalChecks} |
| Run mode | ${runMode} |
| Commit | \`${commit}\` |

GO condition: \`isolation_rate === 1.0\` VÀ \`cross_tenant_bleed_count === 0\`

## Kết Luận openzca Session Model

**openzca hỗ trợ multi-session trong 1 process: NO**

- Phiên bản kiểm tra: zca-js@3.x (underlying library của openzca)
- zca-js tạo đối tượng \`Zalo\` — mỗi instance = 1 session (1 số điện thoại)
- openzca CLI = 1 process = 1 session by design
- Kỹ thuật: N instances zca-js CÓ THỂ chạy trong 1 Node.js process nhưng không có isolation thật (shared memory, 1 crash = cả process)
- **Giới hạn spike này**: test in-memory \`Map<pharmacy_id, …>\` isolation; KHÔNG test per-process openzca isolation thật (Epic 2+)

## Kiến Trúc Đề Xuất (Epic 2+)

\`\`\`
OpenClaw (1 instance)
  └── openzalo channel plugin
        └── zalo-bridge supervisor
              ├── openzca process → tenants/pharmacy_001/ (session state)
              ├── openzca process → pharmacy_002/ (session state)
              └── openzca process → tenants/<slug>/ (1 per tenant)
\`\`\`

- 1 openzca process per tenant, state dir riêng \`zalo-bridge/tenants/<slug>/\`
- 1 process crash → supervisor restart chỉ process đó; tenant khác KHÔNG ảnh hưởng (NFR-6)
- OpenClaw route message theo \`pharmacy_id\` → đúng openzca process endpoint (AR-3)
- Mỗi \`pharmacy_id\` là routing key bất biến (AR-3: phân vùng mọi bảng + mọi message)

## Chi Tiết Kịch Bản

### Kịch bản 1 — Message Routing Isolation (AC1)

| | Check |
|--|-------|
${fmtRows(isolationResults)}

### Kịch bản 2 — Session Fault Isolation / NFR-6 (AC2)

| | Check |
|--|-------|
${fmtRows(shutdownResults)}
`;
}

// ── Main ───────────────────────────────────────────────────────────────────────────
async function main() {
  const makeAdapter = () => USE_LIVE ? new LiveAdapter() : new StubAdapter();
  const runMode = USE_LIVE ? "live" : "stub";

  let commit = "unknown";
  try {
    commit = execSync("git rev-parse --short HEAD", { encoding: "utf8", cwd: ROOT }).trim();
  } catch { /* non-git env */ }

  log(`\n=== Spike multi-tenant Zalo ↔ OpenClaw (Story 1.6 G6) ===`);
  log(`Chế độ chạy: ${runMode}`);

  const { results: isolationResults, crossBleedCount } = await runIsolationCheck(makeAdapter());
  const { results: shutdownResults } = await runShutdownCheck(makeAdapter());

  const allResults = [...isolationResults, ...shutdownResults];
  const passedChecks = allResults.filter(r => r.pass).length;
  const isolationRate = allResults.length > 0 ? passedChecks / allResults.length : 0;
  const go = isolationRate === 1.0 && crossBleedCount === 0;

  const report = renderReport({ isolationResults, shutdownResults, isolationRate, crossBleedCount, runMode, commit, go });

  log(`isolation_rate=${isolationRate.toFixed(2)} cross_tenant_bleed_count=${crossBleedCount}`);
  log(`Kết quả: ${go ? "✅ GO" : "❌ NO-GO"}`);

  if (DRY_RUN) {
    process.stdout.write(report);
  } else {
    await writeFile(REPORT_PATH, report, "utf8");
    log(`\nBáo cáo ghi: ${REPORT_PATH}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
