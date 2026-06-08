import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const runbookPath = join(ROOT, "docs", "runbook-onboarding.md");
const runbook = existsSync(runbookPath) ? readFileSync(runbookPath, "utf8") : "";
const warmupShPath = join(ROOT, "zalo-bridge", "warmup.sh");
const warmupSh = existsSync(warmupShPath) ? readFileSync(warmupShPath, "utf8") : "";

describe("Story 7.2 — Warm-up & relay test runbook", () => {
  describe("19.1 — warmup.sh exists", () => {
    test("19.1: zalo-bridge/warmup.sh tồn tại và có nội dung", () => {
      assert.ok(existsSync(warmupShPath), "warmup.sh phải tồn tại");
      assert.ok(warmupSh.length > 50, "warmup.sh phải có nội dung");
    });
  });

  describe("19.2 — warmup.sh chứa 4 giai đoạn ramp-up", () => {
    test("19.2: warmup.sh output mention Tuần 1, 2, 3, 4", () => {
      assert.ok(warmupSh.includes("Tuần 1") || warmupSh.includes("Week 1") || warmupSh.includes("Giai đoạn 1"), "warmup.sh phải có giai đoạn 1");
      assert.ok(warmupSh.includes("WARMUP_DAILY_CAP"), "warmup.sh phải set WARMUP_DAILY_CAP");
      assert.ok(warmupSh.includes("WARMUP_UNTIL_EPOCH_MS"), "warmup.sh phải set WARMUP_UNTIL_EPOCH_MS");
    });
  });

  describe("19.3 — runbook có section Warm-up giai đoạn tải thấp", () => {
    test("19.3: runbook có section warm-up", () => {
      assert.ok(
        runbook.includes("Warm-up giai đoạn tải thấp"),
        "runbook phải có section 'Warm-up giai đoạn tải thấp'"
      );
    });
  });

  describe("19.4 — runbook document WARMUP_DAILY_CAP (AC1)", () => {
    test("19.4: runbook mention WARMUP_DAILY_CAP", () => {
      assert.ok(
        runbook.includes("WARMUP_DAILY_CAP"),
        "runbook phải mention WARMUP_DAILY_CAP"
      );
    });
  });

  describe("19.5 — runbook document WARMUP_UNTIL_EPOCH_MS (AC1)", () => {
    test("19.5: runbook mention WARMUP_UNTIL_EPOCH_MS", () => {
      assert.ok(
        runbook.includes("WARMUP_UNTIL_EPOCH_MS"),
        "runbook phải mention WARMUP_UNTIL_EPOCH_MS"
      );
    });
  });

  describe("19.6 — runbook document 4 giai đoạn warm-up (AC2)", () => {
    test("19.6: runbook có bảng 4 giai đoạn với Tuần 1–4+", () => {
      assert.ok(runbook.includes("Tuần 1"), "runbook phải có Tuần 1");
      assert.ok(runbook.includes("Tuần 2"), "runbook phải có Tuần 2");
      assert.ok(runbook.includes("Tuần 3"), "runbook phải có Tuần 3");
      assert.ok(runbook.includes("Tuần 4+"), "runbook phải có Tuần 4+");
    });
  });

  describe("19.7 — runbook có section Kiểm thử relay 2 chiều (AC3)", () => {
    test("19.7: runbook có section relay test", () => {
      assert.ok(
        runbook.includes("Kiểm thử relay 2 chiều"),
        "runbook phải có section 'Kiểm thử relay 2 chiều'"
      );
    });
  });

  describe("19.8 — runbook có checklist 6 bước relay (AC3)", () => {
    test("19.8: runbook có ít nhất 6 bước trong checklist relay", () => {
      assert.ok(runbook.includes("1."), "runbook phải có bước 1");
      assert.ok(runbook.includes("6."), "runbook phải có bước 6");
      assert.ok(
        runbook.includes("EscalationCase"),
        "runbook phải mention EscalationCase"
      );
      assert.ok(
        runbook.includes("PHARMACIST_ZALO_ID"),
        "runbook phải mention PHARMACIST_ZALO_ID trong relay section"
      );
    });
  });

  describe("19.9 — runbook document mã ca format (AC4)", () => {
    test("19.9: runbook có mã ca format ESC-<slug>-<YYYYMMDD>-<seq>", () => {
      assert.ok(
        runbook.includes("ESC-<slug>-<YYYYMMDD>-<seq>") ||
          runbook.includes("ESC-<pharmacy_slug>-<YYYYMMDD>-<seq>"),
        "runbook phải có mã ca format ESC-..."
      );
    });
  });

  describe("19.10 — runbook checklist go-live item (c1) warm-up (AC5)", () => {
    test("19.10: checklist go-live có (c1) warm-up env vars set", () => {
      assert.ok(
        runbook.includes("(c1)"),
        "checklist go-live phải có sub-item (c1)"
      );
      assert.ok(
        runbook.includes("Warm-up env vars set") || runbook.includes("warm-up env vars set"),
        "item (c1) phải mention warm-up env vars"
      );
    });
  });

  describe("19.11 — runbook checklist go-live item (c2) relay test (AC5)", () => {
    test("19.11: checklist go-live có (c2) relay test 2 chiều pass", () => {
      assert.ok(
        runbook.includes("(c2)"),
        "checklist go-live phải có sub-item (c2)"
      );
      assert.ok(
        runbook.includes("relay") && runbook.includes("resolved"),
        "item (c2) phải mention relay và resolved"
      );
    });
  });

  describe("19.12 — runbook mention escalation-cases-list view", () => {
    test("19.12: runbook mention view escalation-cases-list trong relay test", () => {
      assert.ok(
        runbook.includes("escalation-cases-list"),
        "runbook phải mention view escalation-cases-list"
      );
    });
  });
});
