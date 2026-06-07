// Contract — n8n workflow escalation nodes cho MC-Handle-InboundReply (Story 5.2, AC1–AC7).
// Tests 8.45–8.61: 6 new escalation nodes + connections + node count.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const WORKFLOW_FILE = repoPath("n8n/workflows/MC-Handle-InboundReply.json");

let workflow;
describe("MC-Handle-InboundReply escalation nodes (Story 5.2)", () => {
  test("8.45 — parse workflow JSON không lỗi (Story 5.2 baseline)", () => {
    const raw = fs.readFileSync(WORKFLOW_FILE, "utf8");
    workflow = JSON.parse(raw);
    assert.ok(workflow, "workflow JSON parsed");
  });

  test("8.46 — 'Detect Escalation Trigger' code node tồn tại (AC1)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Detect Escalation Trigger" && n.type === "n8n-nodes-base.code"
    );
    assert.ok(found, "'Detect Escalation Trigger' code node not found");
  });

  test("8.47 — 'Guard: Is Emergency' if node tồn tại (AC3)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Is Emergency" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Is Emergency' if node not found");
  });

  test("8.48 — 'Send Emergency 115' HTTP node tồn tại (AC3)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Send Emergency 115" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Send Emergency 115' httpRequest node not found");
  });

  test("8.49 — 'Guard: Needs Escalation' if node tồn tại (AC2)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Needs Escalation" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Needs Escalation' if node not found");
  });

  test("8.50 — 'Create Escalation Case' HTTP node tồn tại (AC2)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Create Escalation Case" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Create Escalation Case' httpRequest node not found");
  });

  test("8.51 — 'Log Escalation Case Created' set node tồn tại (AC2)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Log Escalation Case Created" && n.type === "n8n-nodes-base.set"
    );
    assert.ok(found, "'Log Escalation Case Created' set node not found");
  });

  test("8.52 — 'Create Escalation Case' POST tới /tools/create_escalation_case (AC2, AC8)", () => {
    const node = workflow.nodes.find((n) => n.name === "Create Escalation Case");
    assert.ok(node, "'Create Escalation Case' node not found");
    const params = node.parameters ?? {};
    assert.equal(params.method, "POST", "method must be POST");
    const url = String(params.url ?? "");
    assert.ok(
      url.includes("/tools/create_escalation_case"),
      `URL must include '/tools/create_escalation_case', got '${url}'`
    );
  });

  test("8.53 — 'Send Emergency 115' POST tới Zalo Bridge /send (AC3)", () => {
    const node = workflow.nodes.find((n) => n.name === "Send Emergency 115");
    assert.ok(node, "'Send Emergency 115' node not found");
    const params = node.parameters ?? {};
    assert.equal(params.method, "POST", "method must be POST");
    const url = String(params.url ?? "");
    assert.ok(url.includes("/send"), `URL must include '/send', got '${url}'`);
  });

  test("8.54 — Detect Escalation Trigger code chứa is_complaint_active check → complaint_serious (AC1, AC5)", () => {
    const node = workflow.nodes.find((n) => n.name === "Detect Escalation Trigger");
    assert.ok(node, "'Detect Escalation Trigger' node not found");
    const code = node.parameters?.jsCode ?? "";
    assert.ok(
      code.includes("is_complaint_active"),
      "code must check is_complaint_active"
    );
    assert.ok(
      code.includes("complaint_serious"),
      "code must return complaint_serious for is_complaint_active flag"
    );
  });

  test("8.55 — Detect Escalation Trigger code chứa emergency keyword check → emergency (AC3)", () => {
    const node = workflow.nodes.find((n) => n.name === "Detect Escalation Trigger");
    assert.ok(node, "'Detect Escalation Trigger' node not found");
    const code = node.parameters?.jsCode ?? "";
    assert.ok(
      code.includes("emergency"),
      "code must include 'emergency' trigger_type"
    );
    assert.ok(
      code.includes("is_emergency: true"),
      "code must set is_emergency=true for emergency triggers"
    );
  });

  test("8.56 — Detect Escalation Trigger code chứa ai_uncertainty catch-all fallback (AC6, AC7)", () => {
    const node = workflow.nodes.find((n) => n.name === "Detect Escalation Trigger");
    assert.ok(node, "'Detect Escalation Trigger' node not found");
    const code = node.parameters?.jsCode ?? "";
    assert.ok(
      code.includes("ai_uncertainty"),
      "code must include ai_uncertainty catch-all fallback"
    );
  });

  test("8.57 — Kết nối: Log Escalation Trigger → Detect Escalation Trigger (Task 4.7)", () => {
    const nextNode = workflow.connections?.["Log Escalation Trigger"]?.main?.[0]?.[0]?.node;
    assert.equal(
      nextNode,
      "Detect Escalation Trigger",
      `Log Escalation Trigger must connect to 'Detect Escalation Trigger', got '${nextNode}'`
    );
  });

  test("8.58 — Kết nối: Guard: Is Emergency true → Send Emergency 115 (AC3)", () => {
    const nextNode = workflow.connections?.["Guard: Is Emergency"]?.main?.[0]?.[0]?.node;
    assert.equal(
      nextNode,
      "Send Emergency 115",
      `Guard: Is Emergency true must connect to 'Send Emergency 115', got '${nextNode}'`
    );
  });

  test("8.59 — Kết nối: Guard: Is Emergency false → Guard: Needs Escalation (AC2)", () => {
    const nextNode = workflow.connections?.["Guard: Is Emergency"]?.main?.[1]?.[0]?.node;
    assert.equal(
      nextNode,
      "Guard: Needs Escalation",
      `Guard: Is Emergency false must connect to 'Guard: Needs Escalation', got '${nextNode}'`
    );
  });

  test("8.60 — Kết nối: Guard: Needs Escalation true → Create Escalation Case (AC2)", () => {
    const nextNode = workflow.connections?.["Guard: Needs Escalation"]?.main?.[0]?.[0]?.node;
    assert.equal(
      nextNode,
      "Create Escalation Case",
      `Guard: Needs Escalation true must connect to 'Create Escalation Case', got '${nextNode}'`
    );
  });

  test("8.61 — Kết nối: Create Escalation Case → Log Escalation Case Created (AC2)", () => {
    const nextNode = workflow.connections?.["Create Escalation Case"]?.main?.[0]?.[0]?.node;
    assert.equal(
      nextNode,
      "Log Escalation Case Created",
      `Create Escalation Case must connect to 'Log Escalation Case Created', got '${nextNode}'`
    );
  });

  test("8.62 — workflow có >= 26 nodes (20 cũ Story 5.1 + 6 mới Story 5.2) (AC1–AC3)", () => {
    assert.ok(
      workflow.nodes.length >= 26,
      `expected >= 26 nodes, got ${workflow.nodes.length}`
    );
  });

  test("8.63 — Kết nối: Guard: Needs Escalation false → Return Result (AC7 regression guard)", () => {
    const nextNode = workflow.connections?.["Guard: Needs Escalation"]?.main?.[1]?.[0]?.node;
    assert.equal(
      nextNode,
      "Return Result",
      `Guard: Needs Escalation false must connect to 'Return Result', got '${nextNode}'`
    );
  });

  test("8.64 — Kết nối: Send Emergency 115 → Create Escalation Case (AC3 parallel path)", () => {
    const nextNode = workflow.connections?.["Send Emergency 115"]?.main?.[0]?.[0]?.node;
    assert.equal(
      nextNode,
      "Create Escalation Case",
      `Send Emergency 115 must connect to 'Create Escalation Case', got '${nextNode}'`
    );
  });

  test("8.65 — Kết nối: Log Escalation Case Created → Send Waiting Message to Customer (Story 5.3 AC1 rewire)", () => {
    // Story 5.3 extends this connection: Log Escalation Case Created now feeds relay chain (AC1) before Return Result
    const nextNode = workflow.connections?.["Log Escalation Case Created"]?.main?.[0]?.[0]?.node;
    assert.equal(
      nextNode,
      "Send Waiting Message to Customer",
      `Log Escalation Case Created must connect to 'Send Waiting Message to Customer' (Story 5.3 AC1), got '${nextNode}'`
    );
  });
});
