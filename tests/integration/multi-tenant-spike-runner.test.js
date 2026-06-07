// Integration tests — Story 1.6 runner (scripts/run-multi-tenant-spike.mjs).
// Kiểm tra runner child process stub mode: exit 0 + báo cáo tồn tại + heading đúng.
// Offline tuyệt đối — stub adapter không gọi cloud hay openzca thật.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  runIsolationCheck,
  runShutdownCheck,
  renderReport,
} from "../../scripts/run-multi-tenant-spike.mjs";
import { StubAdapter } from "../../zalo-bridge/src/lib/multi-tenant-spike.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = resolve(ROOT, "scripts/run-multi-tenant-spike.mjs");

describe("renderReport — cấu trúc báo cáo Markdown", () => {
  const isolationResults = [
    { name: "isolation check A", pass: true },
    { name: "isolation check B", pass: true },
  ];
  const shutdownResults = [
    { name: "shutdown check A", pass: true },
    { name: "shutdown check B", pass: true },
  ];

  test("GO report có ## Kết Luận, ✅ GO, isolation_rate, commit", () => {
    const md = renderReport({
      isolationResults, shutdownResults,
      isolationRate: 1.0, crossBleedCount: 0,
      runMode: "stub", commit: "abc123", go: true,
    });
    assert.match(md, /## Kết Luận/);
    assert.match(md, /✅ GO/);
    assert.match(md, /isolation_rate.*1\.00/);
    assert.match(md, /cross_tenant_bleed_count.*0/);
    assert.match(md, /abc123/, "commit hash phải có trong báo cáo");
    assert.match(md, /Run mode.*stub/);
  });

  test("NO-GO report khi bleed > 0 hoặc isolationRate < 1.0", () => {
    const md = renderReport({
      isolationResults: [{ name: "bleed check", pass: false }, ...isolationResults.slice(1)],
      shutdownResults,
      isolationRate: 0.75, crossBleedCount: 1,
      runMode: "stub", commit: "xyz", go: false,
    });
    assert.match(md, /❌ NO-GO/);
  });

  test("report có section Kết Luận openzca Session Model (Task 1)", () => {
    const md = renderReport({
      isolationResults, shutdownResults,
      isolationRate: 1.0, crossBleedCount: 0,
      runMode: "stub", commit: "test", go: true,
    });
    assert.match(md, /Kết Luận openzca Session Model/);
    assert.match(md, /multi-session.*NO/i, "phải ghi rõ openzca không hỗ trợ multi-session");
  });

  test("report có section Kiến Trúc Đề Xuất (Epic 2+ architecture)", () => {
    const md = renderReport({
      isolationResults, shutdownResults,
      isolationRate: 1.0, crossBleedCount: 0,
      runMode: "stub", commit: "test", go: true,
    });
    assert.match(md, /Kiến Trúc Đề Xuất/);
  });

  test("report có chi tiết 2 kịch bản riêng biệt", () => {
    const md = renderReport({
      isolationResults, shutdownResults,
      isolationRate: 1.0, crossBleedCount: 0,
      runMode: "stub", commit: "test", go: true,
    });
    assert.match(md, /Kịch bản 1.*Message Routing Isolation/s);
    assert.match(md, /Kịch bản 2.*Session Fault Isolation/s);
  });
});

describe("runIsolationCheck — isolation logic với StubAdapter", () => {
  test("cross_tenant_bleed_count = 0 (không có cross-contamination)", async () => {
    const { crossBleedCount } = await runIsolationCheck(new StubAdapter());
    assert.equal(crossBleedCount, 0);
  });

  test("tất cả isolation checks đều pass", async () => {
    const { results } = await runIsolationCheck(new StubAdapter());
    const failed = results.filter(r => !r.pass);
    assert.equal(failed.length, 0, `Check thất bại: ${failed.map(r => r.name).join(", ")}`);
  });
});

describe("runShutdownCheck — fault isolation logic với StubAdapter", () => {
  test("tất cả shutdown checks đều pass", async () => {
    const { results } = await runShutdownCheck(new StubAdapter());
    const failed = results.filter(r => !r.pass);
    assert.equal(failed.length, 0, `Check thất bại: ${failed.map(r => r.name).join(", ")}`);
  });

  test("lostEvents có pharmacy_001 + payload đầy đủ", async () => {
    const { lostEvents } = await runShutdownCheck(new StubAdapter());
    assert.ok(lostEvents.some(e => e.pharmacy_id === "pharmacy_001"), "session.lost phải emit cho pharmacy_001");
    assert.ok(lostEvents[0]?.session_id, "session_id phải có trong event");
    assert.ok(lostEvents[0]?.ts_iso, "ts_iso phải có trong event");
  });
});

describe("runner end-to-end (child process, stub, offline)", () => {
  test("--dry-run: exit 0, in báo cáo, có ## Kết Luận + GO/NO-GO", () => {
    const r = spawnSync("node", [SCRIPT, "--dry-run"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 30000,
    });
    assert.equal(r.status, 0, `runner phải exit 0. stderr: ${r.stderr}`);
    assert.match(r.stdout, /## Kết Luận/);
    assert.match(r.stdout, /GO|NO-GO/);
    assert.match(r.stdout, /isolation_rate/);
  });

  test("runner tạo docs/spike-multi-tenant-g6.md khi không --dry-run (AC3)", () => {
    const r = spawnSync("node", [SCRIPT], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 30000,
    });
    assert.equal(r.status, 0, `runner phải exit 0. stderr: ${r.stderr}`);
    const reportPath = resolve(ROOT, "docs/spike-multi-tenant-g6.md");
    assert.ok(existsSync(reportPath), "docs/spike-multi-tenant-g6.md phải tồn tại sau khi chạy runner");
  });

  test("báo cáo file chứa ## Kết Luận heading (AC3)", () => {
    spawnSync("node", [SCRIPT], { cwd: ROOT, encoding: "utf8", timeout: 30000 });
    const reportPath = resolve(ROOT, "docs/spike-multi-tenant-g6.md");
    const content = readFileSync(reportPath, "utf8");
    assert.match(content, /## Kết Luận/, "báo cáo phải có ## Kết Luận heading");
  });

  test("GO: isolation_rate = 1.00 với stub adapter", () => {
    const r = spawnSync("node", [SCRIPT, "--dry-run"], {
      cwd: ROOT, encoding: "utf8", timeout: 30000,
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /✅ GO/, "stub adapter phải cho kết quả GO");
  });
});
