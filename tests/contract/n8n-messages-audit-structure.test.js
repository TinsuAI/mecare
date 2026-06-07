// Contract — n8n workflow audit node structure cho MC-Handle-InboundReply (Story 5.4).
// Tests 13.1–13.12: 3 audit write nodes tồn tại, đúng POST target, đúng thứ tự connection,
//   status update nodes tồn tại, tổng node count ≥ 51.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const WORKFLOW_FILE = repoPath("n8n/workflows/MC-Handle-InboundReply.json");

let workflow;
describe("MC-Handle-InboundReply audit nodes (Story 5.4 AC1–AC4)", () => {
  test("13.0 — parse JSON không lỗi", () => {
    const raw = fs.readFileSync(WORKFLOW_FILE, "utf8");
    workflow = JSON.parse(raw);
    assert.ok(workflow, "workflow JSON parsed");
  });

  test("13.1 — có node 'Audit: Write Waiting Message Pending' (AC1)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Audit: Write Waiting Message Pending" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "MC-Handle-InboundReply missing 'Audit: Write Waiting Message Pending' httpRequest node");
  });

  test("13.2 — có node 'Audit: Write Relay Message Pending' (AC2)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Audit: Write Relay Message Pending" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "MC-Handle-InboundReply missing 'Audit: Write Relay Message Pending' httpRequest node");
  });

  test("13.3 — có node 'Audit: Write Pharmacist Reply Pending' (AC3)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Audit: Write Pharmacist Reply Pending" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "MC-Handle-InboundReply missing 'Audit: Write Pharmacist Reply Pending' httpRequest node");
  });

  test("13.4 — 'Audit: Write Waiting Message Pending' POST đến BASEROW_TABLE_MESSAGES (AC1)", () => {
    const node = workflow.nodes.find((n) => n.name === "Audit: Write Waiting Message Pending");
    assert.ok(node, "Audit: Write Waiting Message Pending not found");
    assert.equal(node.parameters?.method, "POST", "must use POST");
    const url = node.parameters?.url || "";
    assert.ok(
      url.includes("BASEROW_TABLE_MESSAGES"),
      `URL must reference BASEROW_TABLE_MESSAGES, got: ${url}`
    );
  });

  test("13.5 — 'Audit: Write Relay Message Pending' POST đến BASEROW_TABLE_MESSAGES (AC2)", () => {
    const node = workflow.nodes.find((n) => n.name === "Audit: Write Relay Message Pending");
    assert.ok(node, "Audit: Write Relay Message Pending not found");
    assert.equal(node.parameters?.method, "POST", "must use POST");
    const url = node.parameters?.url || "";
    assert.ok(
      url.includes("BASEROW_TABLE_MESSAGES"),
      `URL must reference BASEROW_TABLE_MESSAGES, got: ${url}`
    );
  });

  test("13.6 — 'Audit: Write Pharmacist Reply Pending' POST đến BASEROW_TABLE_MESSAGES (AC3)", () => {
    const node = workflow.nodes.find((n) => n.name === "Audit: Write Pharmacist Reply Pending");
    assert.ok(node, "Audit: Write Pharmacist Reply Pending not found");
    assert.equal(node.parameters?.method, "POST", "must use POST");
    const url = node.parameters?.url || "";
    assert.ok(
      url.includes("BASEROW_TABLE_MESSAGES"),
      `URL must reference BASEROW_TABLE_MESSAGES, got: ${url}`
    );
  });

  test("13.7 — 'Audit: Write Waiting Message Pending' nằm TRƯỚC 'Send Waiting Message to Customer' trong connection graph (AC1)", () => {
    // Audit → Send must be in connection chain (audit connects directly or transitively before send)
    const auditConns = workflow.connections?.["Audit: Write Waiting Message Pending"]?.main?.[0] || [];
    const directNext = auditConns.map((c) => c.node);
    assert.ok(
      directNext.includes("Send Waiting Message to Customer"),
      `'Audit: Write Waiting Message Pending' must connect directly before 'Send Waiting Message to Customer', connects to: ${JSON.stringify(directNext)}`
    );
  });

  test("13.8 — 'Audit: Write Relay Message Pending' nằm TRƯỚC 'Relay to Pharmacist Zalo' trong connection graph (AC2)", () => {
    const auditConns = workflow.connections?.["Audit: Write Relay Message Pending"]?.main?.[0] || [];
    const directNext = auditConns.map((c) => c.node);
    assert.ok(
      directNext.includes("Relay to Pharmacist Zalo"),
      `'Audit: Write Relay Message Pending' must connect directly before 'Relay to Pharmacist Zalo', connects to: ${JSON.stringify(directNext)}`
    );
  });

  test("13.9 — 'Audit: Write Pharmacist Reply Pending' nằm TRƯỚC 'Send Pharmacist Answer to Customer' trong connection graph (AC3)", () => {
    const auditConns = workflow.connections?.["Audit: Write Pharmacist Reply Pending"]?.main?.[0] || [];
    const directNext = auditConns.map((c) => c.node);
    assert.ok(
      directNext.includes("Send Pharmacist Answer to Customer"),
      `'Audit: Write Pharmacist Reply Pending' must connect directly before 'Send Pharmacist Answer to Customer', connects to: ${JSON.stringify(directNext)}`
    );
  });

  test("13.10 — có node 'Update Waiting Message Status' (AC4 status update)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Update Waiting Message Status"
    );
    assert.ok(found, "MC-Handle-InboundReply missing 'Update Waiting Message Status' node");
  });

  test("13.11 — có node 'Update Pharmacist Reply Status' (AC4 status update)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Update Pharmacist Reply Status"
    );
    assert.ok(found, "MC-Handle-InboundReply missing 'Update Pharmacist Reply Status' node");
  });

  test("13.12 — tổng node count MC-Handle-InboundReply ≥ 51 (42 gốc + 9 audit nodes Task 1–3)", () => {
    assert.ok(
      workflow.nodes.length >= 51,
      `Expected ≥ 51 nodes, got ${workflow.nodes.length}`
    );
  });

  // ─── Gap-fill: Update Relay Message Status + audit body type ───

  test("13.13 — có node 'Update Relay Message Status' (AC4 status update cho relay path)", () => {
    const found = workflow.nodes.some((n) => n.name === "Update Relay Message Status");
    assert.ok(found, "MC-Handle-InboundReply missing 'Update Relay Message Status' node");
  });

  test("13.14 — 'Audit: Write Waiting Message Pending' body có type='escalation' (AC1)", () => {
    const node = workflow.nodes.find((n) => n.name === "Audit: Write Waiting Message Pending");
    assert.ok(node, "Audit: Write Waiting Message Pending not found");
    const paramsStr = JSON.stringify(node.parameters || {});
    assert.ok(
      paramsStr.includes('"escalation"'),
      "Audit: Write Waiting Message Pending body must set type='escalation'"
    );
  });

  test("13.15 — 'Audit: Write Relay Message Pending' body có type='escalation' (AC2)", () => {
    const node = workflow.nodes.find((n) => n.name === "Audit: Write Relay Message Pending");
    assert.ok(node, "Audit: Write Relay Message Pending not found");
    const paramsStr = JSON.stringify(node.parameters || {});
    assert.ok(
      paramsStr.includes('"escalation"'),
      "Audit: Write Relay Message Pending body must set type='escalation'"
    );
  });

  test("13.16 — 'Audit: Write Pharmacist Reply Pending' body có type='pharmacist_reply' (AC3)", () => {
    const node = workflow.nodes.find((n) => n.name === "Audit: Write Pharmacist Reply Pending");
    assert.ok(node, "Audit: Write Pharmacist Reply Pending not found");
    const paramsStr = JSON.stringify(node.parameters || {});
    assert.ok(
      paramsStr.includes('"pharmacist_reply"'),
      "Audit: Write Pharmacist Reply Pending body must set type='pharmacist_reply'"
    );
  });
});
