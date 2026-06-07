// Contract — n8n workflow structure cho MC-Handle-InboundReply (Story 4.4, AC1-AC9).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const WORKFLOW_FILE = repoPath("n8n/workflows/MC-Handle-InboundReply.json");

let workflow;
describe("MC-Handle-InboundReply workflow structure", () => {
  test("8.1 — parse JSON không lỗi", () => {
    const raw = fs.readFileSync(WORKFLOW_FILE, "utf8");
    workflow = JSON.parse(raw);
    assert.ok(workflow, "workflow JSON parsed");
  });

  test("8.2 — webhook trigger tồn tại (n8n-nodes-base.webhook)", () => {
    const found = workflow.nodes.some(
      (n) => n.type === "n8n-nodes-base.webhook"
    );
    assert.ok(found, "webhook trigger node not found");
  });

  test("8.3 — workflow.name === 'MC-Handle-InboundReply'", () => {
    assert.equal(workflow.name, "MC-Handle-InboundReply");
  });

  test("8.4 — 'Classify Response' code node tồn tại", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Classify Response" && n.type === "n8n-nodes-base.code"
    );
    assert.ok(found, "'Classify Response' code node not found");
  });

  test("8.5 — opt-out keywords trong Classify Response code", () => {
    const node = workflow.nodes.find((n) => n.name === "Classify Response");
    assert.ok(node, "Classify Response node not found");
    const code = node?.parameters?.jsCode ?? "";
    assert.ok(code.includes("dừng"), "opt-out keyword 'dừng' not found in classify code");
    assert.ok(code.includes("stop"), "opt-out keyword 'stop' not found in classify code");
    assert.ok(code.includes("opt_out"), "'opt_out' classification not found in classify code");
  });

  test("8.6 — done_signal detection trong Classify Response code", () => {
    const node = workflow.nodes.find((n) => n.name === "Classify Response");
    const code = node?.parameters?.jsCode ?? "";
    assert.ok(code.includes("done_signal"), "'done_signal' not found in classify code");
    assert.ok(code.includes("đỡ rồi") || code.includes("done"), "done_signal biến thể không tìm thấy trong classify code");
  });

  test("8.7 — 'Guard: Is Group 6' if node tồn tại", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Is Group 6" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Is Group 6' if node not found");
  });

  test("8.8 — 'Unlock Group 6 Customer' PATCH node tồn tại (AC7)", () => {
    const node = workflow.nodes.find((n) => n.name === "Unlock Group 6 Customer");
    assert.ok(node, "'Unlock Group 6 Customer' node not found");
    assert.equal(node.type, "n8n-nodes-base.httpRequest", "Unlock Group 6 Customer must be httpRequest");
    assert.equal(node.parameters?.method, "PATCH", "Unlock Group 6 Customer must use PATCH");
    const body = node.parameters?.body ?? {};
    assert.strictEqual(body.group6_unlocked, true, "Unlock Group 6 Customer must set group6_unlocked=true");
  });

  test("8.9 — 'Guard: Is Opt-Out' if node tồn tại", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Is Opt-Out" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Is Opt-Out' if node not found");
  });

  test("8.10 — 'Update Customer Opted Out' PATCH is_opted_out=true (AC4)", () => {
    const node = workflow.nodes.find((n) => n.name === "Update Customer Opted Out");
    assert.ok(node, "'Update Customer Opted Out' node not found");
    assert.equal(node.type, "n8n-nodes-base.httpRequest", "must be httpRequest");
    assert.equal(node.parameters?.method, "PATCH", "must use PATCH");
    const body = node.parameters?.body ?? {};
    assert.strictEqual(body.is_opted_out, true, "must set is_opted_out=true");
  });

  test("8.11 — 'Cancel Pending Schedule' node tồn tại (AC4)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Cancel Pending Schedule"
    );
    assert.ok(found, "'Cancel Pending Schedule' node not found");
  });

  test("8.12 — 'Guard: Is Done Signal' if node tồn tại (AC1)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Is Done Signal" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Is Done Signal' if node not found");
  });

  test("8.13 — 'Cancel Follow-Up Schedule' node tồn tại (AC1)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Cancel Follow-Up Schedule"
    );
    assert.ok(found, "'Cancel Follow-Up Schedule' node not found");
  });

  test("8.14 — 'Return Result' set node tồn tại", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Return Result" && n.type === "n8n-nodes-base.set"
    );
    assert.ok(found, "'Return Result' set node not found");
  });

  test("8.15 — 'Log Inbound Message' là node đầu tiên sau Webhook Trigger (AC9: audit-first)", () => {
    const webhookNode = workflow.nodes.find(
      (n) => n.type === "n8n-nodes-base.webhook"
    );
    assert.ok(webhookNode, "Webhook Trigger not found");
    const conns = workflow.connections ?? {};
    const firstConn = conns[webhookNode.name]?.main?.[0]?.[0]?.node;
    assert.equal(firstConn, "Log Inbound Message", `First node after Webhook must be 'Log Inbound Message', got '${firstConn}'`);
  });

  test("8.16 — 'Log Inbound Message' POST tới Baserow Messages với type=reply (AC9)", () => {
    const node = workflow.nodes.find((n) => n.name === "Log Inbound Message");
    assert.ok(node, "'Log Inbound Message' node not found");
    assert.equal(node.type, "n8n-nodes-base.httpRequest", "must be httpRequest");
    assert.equal(node.parameters?.method, "POST", "must use POST");
    const url = node.parameters?.url ?? "";
    assert.ok(url.includes("BASEROW_TABLE_MESSAGES"), "Log Inbound Message must POST to BASEROW_TABLE_MESSAGES");
    const params = node.parameters?.bodyParameters?.parameters ?? [];
    const typeParam = params.find((p) => p.name === "type");
    assert.ok(typeParam, "'type' body parameter not found");
    assert.equal(typeParam.value, "reply", "type must be 'reply'");
  });
});
