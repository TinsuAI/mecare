import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const CUSTOMERS_SCHEMA = join(ROOT, "baserow", "schema", "02-customers.json");
const INBOUND = join(ROOT, "n8n", "workflows", "MC-Handle-InboundReply.json");
const SCHEDULE = join(ROOT, "n8n", "workflows", "MC-Schedule-DueReminders.json");
const RUNBOOK = join(ROOT, "docs", "runbook-onboarding.md");

const schema = existsSync(CUSTOMERS_SCHEMA)
  ? JSON.parse(readFileSync(CUSTOMERS_SCHEMA, "utf8"))
  : { fields: [] };
const inbound = existsSync(INBOUND)
  ? JSON.parse(readFileSync(INBOUND, "utf8"))
  : { nodes: [] };
const schedule = existsSync(SCHEDULE)
  ? JSON.parse(readFileSync(SCHEDULE, "utf8"))
  : { nodes: [] };
const runbook = existsSync(RUNBOOK) ? readFileSync(RUNBOOK, "utf8") : "";

const inboundNodes = inbound.nodes ?? [];
const scheduleNodes = schedule.nodes ?? [];
const schemaFields = schema.fields ?? [];

describe("20. Privacy & complaint contract tests (NFR-7)", () => {
  describe("20.1 — schema has is_complaint_active boolean", () => {
    test("20.1: customers schema có field is_complaint_active type boolean", () => {
      const f = schemaFields.find((x) => x.name === "is_complaint_active");
      assert.ok(f, "is_complaint_active field missing từ schema");
      assert.equal(f.type, "boolean", "is_complaint_active phải type boolean");
    });
  });

  describe("20.2 — schema has group6_unlocked boolean default false", () => {
    test("20.2: customers schema có field group6_unlocked boolean default=false", () => {
      const f = schemaFields.find((x) => x.name === "group6_unlocked");
      assert.ok(f, "group6_unlocked field missing từ schema");
      assert.equal(f.type, "boolean", "group6_unlocked phải type boolean");
      assert.ok(
        f.default === false || f.default === "false",
        "group6_unlocked phải có default=false"
      );
    });
  });

  describe("20.3 — MC-Handle-InboundReply có node guard-is-group6", () => {
    test("20.3: MC-Handle-InboundReply.json có node id guard-is-group6", () => {
      const found = inboundNodes.find((n) => n.id === "guard-is-group6");
      assert.ok(found, "node guard-is-group6 không tìm thấy trong MC-Handle-InboundReply");
    });
  });

  describe("20.4 — MC-Handle-InboundReply có node unlock-group6-customer", () => {
    test("20.4: MC-Handle-InboundReply.json có node id unlock-group6-customer", () => {
      const found = inboundNodes.find((n) => n.id === "unlock-group6-customer");
      assert.ok(found, "node unlock-group6-customer không tìm thấy trong MC-Handle-InboundReply");
    });
  });

  describe("20.5 — MC-Handle-InboundReply có node guard-is-complaint-active", () => {
    test("20.5: MC-Handle-InboundReply.json có node id guard-is-complaint-active", () => {
      const found = inboundNodes.find((n) => n.id === "guard-is-complaint-active");
      assert.ok(found, "node guard-is-complaint-active không tìm thấy trong MC-Handle-InboundReply");
    });
  });

  describe("20.6 — Classification jsCode chứa complaint_serious trigger_type", () => {
    test("20.6: detect-escalation-trigger jsCode chứa complaint_serious", () => {
      const classNode = inboundNodes.find((n) => n.id === "detect-escalation-trigger");
      assert.ok(classNode, "node detect-escalation-trigger không tìm thấy");
      const code = classNode.parameters?.jsCode ?? "";
      assert.ok(
        code.includes("complaint_serious"),
        "jsCode phải chứa trigger_type complaint_serious"
      );
    });
  });

  describe("20.7 — Classification jsCode check is_complaint_active trước keyword (Priority 1)", () => {
    test("20.7: is_complaint_active check xuất hiện trước keyword complaint trong jsCode", () => {
      const classNode = inboundNodes.find((n) => n.id === "detect-escalation-trigger");
      assert.ok(classNode, "node detect-escalation-trigger không tìm thấy");
      const code = classNode.parameters?.jsCode ?? "";
      const posFlag = code.indexOf("is_complaint_active");
      const posKeyword = code.indexOf("khiếu nại");
      assert.ok(posFlag >= 0, "jsCode phải có is_complaint_active check");
      assert.ok(posKeyword >= 0, "jsCode phải có keyword khiếu nại");
      assert.ok(
        posFlag < posKeyword,
        "is_complaint_active (Priority 1) phải xuất hiện trước keyword check (Priority 9)"
      );
    });
  });

  describe("20.8 — MC-Schedule-DueReminders có node guard-group6-locked", () => {
    test("20.8: MC-Schedule-DueReminders.json có node id guard-group6-locked", () => {
      const found = scheduleNodes.find((n) => n.id === "guard-group6-locked");
      assert.ok(found, "node guard-group6-locked không tìm thấy trong MC-Schedule-DueReminders");
    });
  });

  describe("20.9 — runbook có section Privacy hoặc khiếu nại", () => {
    test("20.9: runbook chứa 'Privacy' hoặc 'khiếu nại'", () => {
      assert.ok(
        runbook.includes("Privacy") || runbook.includes("khiếu nại"),
        "runbook phải có section Privacy hoặc khiếu nại"
      );
    });
  });

  describe("20.10 — runbook có complaint evidence keywords", () => {
    test("20.10: runbook chứa 'số lô' hoặc 'HSD' (checklist thu thập bằng chứng)", () => {
      assert.ok(
        runbook.includes("số lô") || runbook.includes("HSD"),
        "runbook phải có hướng dẫn thu thập bằng chứng: số lô hoặc HSD"
      );
    });
  });

  describe("20.11 — runbook có checklist item (d) NFR-7", () => {
    test("20.11: runbook checklist go-live có item (d) xác nhận NFR-7", () => {
      assert.ok(
        runbook.includes("(d)"),
        "runbook checklist go-live phải có item (d)"
      );
      assert.ok(
        runbook.includes("is_complaint_active") || runbook.includes("group6_unlocked"),
        "item (d) phải nhắc is_complaint_active hoặc group6_unlocked"
      );
    });
  });

  describe("20.12 — runbook có promo targeting rule với care_group", () => {
    test("20.12: runbook chứa quy tắc promo targeting theo care_group", () => {
      assert.ok(
        runbook.includes("care_group=4") || runbook.includes("care_group"),
        "runbook phải document promo targeting rule dùng care_group"
      );
      assert.ok(
        runbook.includes("khuyến mãi") || runbook.includes("promo"),
        "runbook phải mention khuyến mãi hoặc promo trong context targeting"
      );
    });
  });
});
