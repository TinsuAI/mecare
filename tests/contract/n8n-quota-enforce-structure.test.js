// Contract — n8n workflow structure cho MC-Quota-Enforce (Story 4.3, AC1-AC7).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const WORKFLOW_FILE = repoPath("n8n/workflows/MC-Quota-Enforce.json");

let workflow;
describe("MC-Quota-Enforce workflow structure", () => {
  test("7.1 — parse JSON không lỗi", () => {
    const raw = fs.readFileSync(WORKFLOW_FILE, "utf8");
    workflow = JSON.parse(raw);
    assert.ok(workflow, "workflow JSON parsed");
  });

  test("7.2 — workflow.name === 'MC-Quota-Enforce'", () => {
    assert.equal(workflow.name, "MC-Quota-Enforce");
  });

  test("7.3 — node đầu tiên là executeWorkflowTrigger (callable sub-workflow, AC1)", () => {
    assert.equal(
      workflow.nodes[0].type,
      "n8n-nodes-base.executeWorkflowTrigger",
      "first node must be executeWorkflowTrigger"
    );
  });

  test("7.4 — workflow.active === false", () => {
    assert.equal(workflow.active, false);
  });

  test("7.5 — có >= 5 nodes", () => {
    assert.ok(workflow.nodes.length >= 5, `expected >= 5 nodes, got ${workflow.nodes.length}`);
  });

  test("7.6 — có node 'Group 5 Bypass' (AC4: care_group=5 luôn allowed)", () => {
    const found = workflow.nodes.some((n) => n.name === "Group 5 Bypass");
    assert.ok(found, "'Group 5 Bypass' node not found");
  });

  test("7.7 — có node 'Get QuotaCounter' (httpRequest, AC3: đọc Baserow QuotaCounter)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Get QuotaCounter" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Get QuotaCounter' httpRequest node not found");
  });

  test("7.8 — có node 'Eval Quota' (code, AC3: sent_count >= cap → allowed=false)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Eval Quota" && n.type === "n8n-nodes-base.code"
    );
    assert.ok(found, "'Eval Quota' code node not found");
  });

  test("7.9 — có node 'Return Result' (set, AC3: output contract {allowed, sent_count, cap, bypassed})", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Return Result" && n.type === "n8n-nodes-base.set"
    );
    assert.ok(found, "'Return Result' set node not found");
  });

  test("7.10 — Get QuotaCounter URL tham chiếu BASEROW_TABLE_QUOTA_COUNTER (AC3)", () => {
    const node = workflow.nodes.find((n) => n.name === "Get QuotaCounter");
    assert.ok(node, "Get QuotaCounter node not found");
    const url = node.parameters?.url ?? "";
    assert.ok(
      url.includes("BASEROW_TABLE_QUOTA_COUNTER"),
      `Get QuotaCounter URL must reference BASEROW_TABLE_QUOTA_COUNTER, got: ${url}`
    );
  });

  test("7.11 — Get QuotaCounter URL filter theo pharmacy_id (AC7: per-pharmacy isolation)", () => {
    const node = workflow.nodes.find((n) => n.name === "Get QuotaCounter");
    const url = node?.parameters?.url ?? "";
    assert.ok(
      url.includes("pharmacy_id"),
      `Get QuotaCounter URL must filter by pharmacy_id, got: ${url}`
    );
  });

  test("7.12 — Get QuotaCounter URL filter theo period_month (AC7: per-month isolation)", () => {
    const node = workflow.nodes.find((n) => n.name === "Get QuotaCounter");
    const url = node?.parameters?.url ?? "";
    assert.ok(
      url.includes("period_month"),
      `Get QuotaCounter URL must filter by period_month, got: ${url}`
    );
  });

  test("7.13 — Eval Quota code xử lý row không tồn tại → allowed=true (AC3: tháng mới)", () => {
    const node = workflow.nodes.find((n) => n.name === "Eval Quota");
    const code = node?.parameters?.jsCode ?? "";
    assert.ok(
      code.includes("count === 0") || code.includes("count == 0"),
      "Eval Quota must handle count===0 (new month) case"
    );
    assert.ok(
      code.includes("allowed: true"),
      "Eval Quota must return allowed:true for new month"
    );
  });

  test("7.14 — Eval Quota code kiểm tra sent_count < cap → allowed (AC3: quota logic)", () => {
    const node = workflow.nodes.find((n) => n.name === "Eval Quota");
    const code = node?.parameters?.jsCode ?? "";
    assert.ok(
      code.includes("sent_count < cap"),
      "Eval Quota must compare sent_count < cap"
    );
  });

  test("7.15 — Return: Bypassed set node tồn tại với allowed=true, bypassed=true (AC4)", () => {
    const node = workflow.nodes.find((n) => n.name === "Return: Bypassed");
    assert.ok(node, "'Return: Bypassed' node not found");
    const assignments = node?.parameters?.assignments?.assignments ?? [];
    const allowedField = assignments.find((a) => a.name === "allowed");
    const bypassedField = assignments.find((a) => a.name === "bypassed");
    assert.equal(allowedField?.value, true, "Return: Bypassed must set allowed=true");
    assert.equal(bypassedField?.value, true, "Return: Bypassed must set bypassed=true");
  });

  test("7.16 — Return Result set node có fields: allowed, sent_count, cap, bypassed (AC3 output contract)", () => {
    const node = workflow.nodes.find((n) => n.name === "Return Result");
    const assignments = node?.parameters?.assignments?.assignments ?? [];
    const names = assignments.map((a) => a.name);
    assert.ok(names.includes("allowed"), "Return Result missing 'allowed' field");
    assert.ok(names.includes("sent_count"), "Return Result missing 'sent_count' field");
    assert.ok(names.includes("cap"), "Return Result missing 'cap' field");
    assert.ok(names.includes("bypassed"), "Return Result missing 'bypassed' field");
  });
});
