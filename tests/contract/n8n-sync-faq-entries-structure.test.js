// Contract — n8n workflow structure for MC-Sync-FaqEntries (Story 5.1, AC8).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const WORKFLOW_FILE = repoPath("n8n/workflows/MC-Sync-FaqEntries.json");

let workflow;
describe("MC-Sync-FaqEntries workflow structure", () => {
  test("9.1 — parse JSON không lỗi", () => {
    const raw = fs.readFileSync(WORKFLOW_FILE, "utf8");
    workflow = JSON.parse(raw);
    assert.ok(workflow, "workflow JSON parsed");
  });

  test("9.2 — workflow.name === 'MC-Sync-FaqEntries'", () => {
    assert.equal(workflow.name, "MC-Sync-FaqEntries");
  });

  test("9.3 — webhook trigger tồn tại với path MC-Sync-FaqEntries (AC8)", () => {
    const node = workflow.nodes.find((n) => n.type === "n8n-nodes-base.webhook");
    assert.ok(node, "webhook trigger not found");
    assert.equal(node.parameters?.path, "MC-Sync-FaqEntries", "webhook path must be MC-Sync-FaqEntries");
  });

  test("9.4 — 'Fetch Approved FAQs' httpRequest node tồn tại (AC8)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Fetch Approved FAQs" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Fetch Approved FAQs' httpRequest node not found");
  });

  test("9.5 — 'Expand Results' Code node đứng trước SplitInBatches (Epic 4 Expand Results pattern)", () => {
    const expandIdx = workflow.nodes.findIndex((n) => n.name === "Expand Results");
    const splitIdx = workflow.nodes.findIndex((n) => n.type === "n8n-nodes-base.splitInBatches");
    assert.ok(expandIdx >= 0, "'Expand Results' code node not found");
    assert.ok(splitIdx >= 0, "SplitInBatches node not found");
    const expandConn = workflow.connections["Expand Results"]?.main?.[0]?.[0]?.node;
    assert.equal(expandConn, "Split In Batches", "Expand Results must connect to Split In Batches");
  });

  test("9.6 — Expand Results code contains results.map (Baserow list pattern)", () => {
    const node = workflow.nodes.find((n) => n.name === "Expand Results");
    assert.ok(node, "'Expand Results' node not found");
    const code = node?.parameters?.jsCode ?? "";
    assert.ok(code.includes("results") && code.includes("map"), "Expand Results must use results.map");
  });

  test("9.7 — 'POST Reindex OpenClaw' httpRequest POST tới openclaw:8000 (AC8)", () => {
    const node = workflow.nodes.find((n) => n.name === "POST Reindex OpenClaw");
    assert.ok(node, "'POST Reindex OpenClaw' node not found");
    assert.equal(node.type, "n8n-nodes-base.httpRequest");
    assert.equal(node.parameters?.method, "POST");
    const url = node.parameters?.url ?? "";
    assert.ok(url.includes("openclaw") || url.includes("reindex_faq"), "must call openclaw reindex_faq");
  });

  test("9.8 — 'Return Result' Set node tồn tại", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Return Result" && n.type === "n8n-nodes-base.set"
    );
    assert.ok(found, "'Return Result' set node not found");
  });

  test("9.9 — workflow.active === false", () => {
    assert.equal(workflow.active, false);
  });

  test("9.10 — Webhook Trigger → Fetch Approved FAQs là connection đầu tiên", () => {
    const webhookNode = workflow.nodes.find((n) => n.type === "n8n-nodes-base.webhook");
    assert.ok(webhookNode, "Webhook Trigger not found");
    const firstConn = workflow.connections?.[webhookNode.name]?.main?.[0]?.[0]?.node;
    assert.equal(firstConn, "Fetch Approved FAQs", `First node after Webhook must be 'Fetch Approved FAQs', got '${firstConn}'`);
  });

  test("9.11 — có ≥ 2 httpRequest nodes (Fetch + POST Reindex)", () => {
    const count = workflow.nodes.filter((n) => n.type === "n8n-nodes-base.httpRequest").length;
    assert.ok(count >= 2, `expected >= 2 httpRequest nodes, got ${count}`);
  });
});
