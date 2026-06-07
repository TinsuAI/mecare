// Contract — n8n workflow structure cho MC-Zalo-Send (Story 4.2, AC3, AC6).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const WORKFLOW_FILE = repoPath("n8n/workflows/MC-Zalo-Send.json");

let workflow;
describe("MC-Zalo-Send workflow structure", () => {
  test("6.1 — parse JSON không lỗi", () => {
    const raw = fs.readFileSync(WORKFLOW_FILE, "utf8");
    workflow = JSON.parse(raw);
    assert.ok(workflow, "workflow JSON parsed");
  });

  test("6.2 — workflow.name === 'MC-Zalo-Send'", () => {
    assert.equal(workflow.name, "MC-Zalo-Send");
  });

  test("6.3 — có node type executeWorkflowTrigger (callable sub-workflow)", () => {
    const found = workflow.nodes.some(
      (n) => n.type === "n8n-nodes-base.executeWorkflowTrigger"
    );
    assert.ok(found, "executeWorkflowTrigger node not found");
  });

  test("6.4 — có >= 2 node type httpRequest (Fetch Customer + Send via zalo-bridge)", () => {
    const count = workflow.nodes.filter(
      (n) => n.type === "n8n-nodes-base.httpRequest"
    ).length;
    assert.ok(count >= 2, `expected >= 2 httpRequest nodes, got ${count}`);
  });

  test("6.5 — có >= 1 node type if (Guard: Send Error)", () => {
    const count = workflow.nodes.filter(
      (n) => n.type === "n8n-nodes-base.if"
    ).length;
    assert.ok(count >= 1, `expected >= 1 if nodes, got ${count}`);
  });

  test("6.6 — workflow.active === false", () => {
    assert.equal(workflow.active, false);
  });

  test("6.7 — có node 'Return: Sent' và 'Return: Failed' (AC6 output contract)", () => {
    const setNodes = workflow.nodes.filter((n) => n.type === "n8n-nodes-base.set");
    assert.ok(setNodes.length >= 2, `expected >= 2 set nodes, got ${setNodes.length}`);
    const names = setNodes.map((n) => n.name);
    assert.ok(names.includes("Return: Sent"), "'Return: Sent' set node not found");
    assert.ok(names.includes("Return: Failed"), "'Return: Failed' set node not found");
  });

  test("6.8 — có >= 3 node type httpRequest (Fetch Customer + Send + Update Messages ×2, AC3+AC6)", () => {
    const count = workflow.nodes.filter(
      (n) => n.type === "n8n-nodes-base.httpRequest"
    ).length;
    assert.ok(count >= 3, `expected >= 3 httpRequest nodes, got ${count}`);
  });
});
