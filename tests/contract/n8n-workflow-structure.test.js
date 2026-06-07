// Contract — n8n workflow structure cho MC-Compose-MessageFromTemplate (Story 4.1, AC1-AC5).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const WORKFLOW_FILE = repoPath("n8n/workflows/MC-Compose-MessageFromTemplate.json");

let workflow;
describe("MC-Compose-MessageFromTemplate workflow structure", () => {
  test("5.1 — parse JSON không lỗi", () => {
    const raw = fs.readFileSync(WORKFLOW_FILE, "utf8");
    workflow = JSON.parse(raw);
    assert.ok(workflow, "workflow JSON parsed");
  });

  test("5.2 — workflow.name === naming convention MC-<domain>-<action>", () => {
    assert.equal(workflow.name, "MC-Compose-MessageFromTemplate");
  });

  test("5.3 — workflow.nodes là mảng >= 8 nodes", () => {
    assert.ok(Array.isArray(workflow.nodes), "nodes is array");
    assert.ok(
      workflow.nodes.length >= 8,
      `expected >= 8 nodes, got ${workflow.nodes.length}`
    );
  });

  test("5.4 — có node type executeWorkflowTrigger (sub-workflow callable)", () => {
    const found = workflow.nodes.some(
      (n) => n.type === "n8n-nodes-base.executeWorkflowTrigger"
    );
    assert.ok(found, "executeWorkflowTrigger node not found");
  });

  test("5.5 — có >= 2 node type httpRequest (Fetch Template + Audit-First Write)", () => {
    const count = workflow.nodes.filter(
      (n) => n.type === "n8n-nodes-base.httpRequest"
    ).length;
    assert.ok(count >= 2, `expected >= 2 httpRequest nodes, got ${count}`);
  });

  test("5.6 — có >= 2 node type if (Guard: No Template + Guard: Missing Placeholder)", () => {
    const count = workflow.nodes.filter(
      (n) => n.type === "n8n-nodes-base.if"
    ).length;
    assert.ok(count >= 2, `expected >= 2 if nodes, got ${count}`);
  });

  test("5.7 — có node type code (Substitute Placeholders)", () => {
    const found = workflow.nodes.some(
      (n) => n.type === "n8n-nodes-base.code"
    );
    assert.ok(found, "code node not found");
  });

  test("5.8 — workflow.active === false (kích hoạt sau khi Story 4.2 scheduler ready)", () => {
    assert.equal(workflow.active, false);
  });

  test("5.9 — đúng 15 nodes (trigger+4 http+3 if+3 code+4 set)", () => {
    assert.equal(workflow.nodes.length, 15);
  });

  test("5.10 — có node tên 'Guard: Duplicate' (idempotency check)", () => {
    const found = workflow.nodes.some((n) => n.name === "Guard: Duplicate");
    assert.ok(found, "Guard: Duplicate node not found");
  });

  test("5.11 — có node tên 'Audit-First Write Messages' (AC5 audit-first)", () => {
    const found = workflow.nodes.some((n) => n.name === "Audit-First Write Messages");
    assert.ok(found, "Audit-First Write Messages node not found");
  });

  test("5.12 — có node tên 'Return Result' (Set node, result=composed)", () => {
    const found = workflow.nodes.some((n) => n.name === "Return Result");
    assert.ok(found, "Return Result node not found");
  });

  test("5.13 — đúng 4 httpRequest nodes (idempotency+fetch template+fetch customer+audit write)", () => {
    const count = workflow.nodes.filter((n) => n.type === "n8n-nodes-base.httpRequest").length;
    assert.equal(count, 4, `expected 4 httpRequest nodes, got ${count}`);
  });

  test("5.14 — đúng 3 code nodes (resolve placeholders+TPCN suffix+customer_ref)", () => {
    const count = workflow.nodes.filter((n) => n.type === "n8n-nodes-base.code").length;
    assert.equal(count, 3, `expected 3 code nodes, got ${count}`);
  });

  test("5.15 — Fetch Template URL tham chiếu env BASEROW_TABLE_MESSAGE_TEMPLATES", () => {
    const node = workflow.nodes.find((n) => n.name === "Fetch Template");
    assert.ok(node, "Fetch Template node not found");
    const url = node.parameters?.url ?? "";
    assert.ok(
      url.includes("BASEROW_TABLE_MESSAGE_TEMPLATES"),
      `Fetch Template URL must reference BASEROW_TABLE_MESSAGE_TEMPLATES, got: ${url}`
    );
  });

  test("5.16 — Audit-First Write URL tham chiếu env BASEROW_TABLE_MESSAGES", () => {
    const node = workflow.nodes.find((n) => n.name === "Audit-First Write Messages");
    assert.ok(node, "Audit-First Write Messages node not found");
    const url = node.parameters?.url ?? "";
    assert.ok(
      url.includes("BASEROW_TABLE_MESSAGES"),
      `Audit-First Write URL must reference BASEROW_TABLE_MESSAGES, got: ${url}`
    );
  });

  test("5.17 — Fetch Template URL lọc theo pharmacy_id (multi-tenant isolation)", () => {
    const node = workflow.nodes.find((n) => n.name === "Fetch Template");
    assert.ok(node, "Fetch Template node not found");
    const url = node.parameters?.url ?? "";
    assert.ok(
      url.includes("pharmacy_id"),
      `Fetch Template URL must filter by pharmacy_id, got: ${url}`
    );
  });

  test("5.18 — Fetch Template URL lọc status=approved (chỉ template đã duyệt)", () => {
    const node = workflow.nodes.find((n) => n.name === "Fetch Template");
    assert.ok(node, "Fetch Template node not found");
    const url = node.parameters?.url ?? "";
    assert.ok(
      url.includes("approved"),
      `Fetch Template URL must filter status=approved, got: ${url}`
    );
  });
});
