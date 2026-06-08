import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const RUNBOOK_PATH = join(ROOT, "docs", "runbook-onboarding.md");

const runbook = existsSync(RUNBOOK_PATH)
  ? readFileSync(RUNBOOK_PATH, "utf8")
  : "";

describe("Story 7.1 — Runbook completeness (tests/contract/runbook.test.js)", () => {
  describe("18.1 — file exists", () => {
    test("18.1: docs/runbook-onboarding.md tồn tại và có nội dung", () => {
      assert.ok(existsSync(RUNBOOK_PATH), "runbook-onboarding.md phải tồn tại");
      assert.ok(runbook.length > 100, "runbook phải có nội dung đủ dài");
    });
  });

  describe("18.2–18.3 — seed step present (AC1)", () => {
    test("18.2: runbook chứa lệnh --seed --update-seed", () => {
      assert.ok(
        runbook.includes("--seed --update-seed"),
        "runbook phải có bước seed với flag --seed --update-seed"
      );
    });
    test("18.3: runbook tham chiếu seed file 08-message-templates-draft.json", () => {
      assert.ok(
        runbook.includes("08-message-templates-draft.json"),
        "runbook phải tham chiếu seed file 08-message-templates-draft.json"
      );
    });
  });

  describe("18.4–18.5 — approve/duyệt step present (AC2)", () => {
    test("18.4: runbook chứa tham chiếu approve-kichban hoặc từ khóa approved", () => {
      assert.ok(
        runbook.includes("approve-kichban") || runbook.includes("approved"),
        "runbook phải có bước duyệt kịch bản (approve-kichban.mjs hoặc approved)"
      );
    });
    test("18.5: runbook tham chiếu views 08-message-templates-edit và 09-faq-entries-edit", () => {
      assert.ok(
        runbook.includes("08-message-templates-edit") &&
          runbook.includes("09-faq-entries-edit"),
        "runbook phải tham chiếu cả 2 views 08 và 09 cho bước duyệt"
      );
    });
  });

  describe("18.6 — relay config present (AC3)", () => {
    test("18.6: runbook chứa PHARMACIST_ZALO_ID", () => {
      assert.ok(
        runbook.includes("PHARMACIST_ZALO_ID"),
        "runbook phải document bước điền PHARMACIST_ZALO_ID"
      );
    });
  });

  describe("18.7 — workspace visibility section present (AC4)", () => {
    test("18.7: runbook chứa hướng dẫn workspace visibility", () => {
      assert.ok(
        runbook.toLowerCase().includes("workspace") &&
          (runbook.includes("MessageTemplates") || runbook.includes("messagetemplates")),
        "runbook phải có section hướng dẫn Baserow workspace visibility"
      );
    });
  });

  describe("18.8 — link_row filter per tenant present (AC5)", () => {
    test("18.8: runbook chứa hướng dẫn áp filter pharmacy_id", () => {
      assert.ok(
        runbook.includes("pharmacy_id"),
        "runbook phải có bước áp filter pharmacy_id cho views 08+09"
      );
    });
  });

  describe("18.9–18.10 — go-live checklist present (AC7)", () => {
    test("18.9: runbook chứa section go-live hoặc Checklist go-live", () => {
      assert.ok(
        runbook.toLowerCase().includes("go-live") ||
          runbook.toLowerCase().includes("checklist"),
        "runbook phải có section Checklist go-live"
      );
    });
    test("18.10: go-live checklist chứa điều kiện status=approved", () => {
      assert.ok(
        runbook.includes("status=approved"),
        "go-live checklist phải yêu cầu tất cả kịch bản status=approved"
      );
    });
  });
});
