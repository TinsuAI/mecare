// Contract — n8n workflow structure cho MC-Schedule-DueReminders (Story 4.2, AC1-AC7).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const WORKFLOW_FILE = repoPath("n8n/workflows/MC-Schedule-DueReminders.json");

let workflow;
describe("MC-Schedule-DueReminders workflow structure", () => {
  test("5.1 — parse JSON không lỗi", () => {
    const raw = fs.readFileSync(WORKFLOW_FILE, "utf8");
    workflow = JSON.parse(raw);
    assert.ok(workflow, "workflow JSON parsed");
  });

  test("5.2 — workflow.name === 'MC-Schedule-DueReminders'", () => {
    assert.equal(workflow.name, "MC-Schedule-DueReminders");
  });

  test("5.3 — có node type scheduleTrigger (cron trigger)", () => {
    const found = workflow.nodes.some(
      (n) => n.type === "n8n-nodes-base.scheduleTrigger"
    );
    assert.ok(found, "scheduleTrigger node not found");
  });

  test("5.4 — có >= 4 node type httpRequest (Query + Update Skipped + Update Sent + Create Next/FollowUp)", () => {
    const count = workflow.nodes.filter(
      (n) => n.type === "n8n-nodes-base.httpRequest"
    ).length;
    assert.ok(count >= 4, `expected >= 4 httpRequest nodes, got ${count}`);
  });

  test("5.5 — có >= 3 node type if (Outside Hours + No Due Items + Compose Skip)", () => {
    const count = workflow.nodes.filter(
      (n) => n.type === "n8n-nodes-base.if"
    ).length;
    assert.ok(count >= 3, `expected >= 3 if nodes, got ${count}`);
  });

  test("5.6 — có node type splitInBatches (process rows one-by-one)", () => {
    const found = workflow.nodes.some(
      (n) => n.type === "n8n-nodes-base.splitInBatches"
    );
    assert.ok(found, "splitInBatches node not found");
  });

  test("5.7 — có >= 2 node type executeWorkflow (Compose + Send sub-workflows)", () => {
    const count = workflow.nodes.filter(
      (n) => n.type === "n8n-nodes-base.executeWorkflow"
    ).length;
    assert.ok(count >= 2, `expected >= 2 executeWorkflow nodes, got ${count}`);
  });

  test("5.8 — có >= 2 node type code (Business Hours Check + Generate message_id + Schedule Next)", () => {
    const count = workflow.nodes.filter(
      (n) => n.type === "n8n-nodes-base.code"
    ).length;
    assert.ok(count >= 2, `expected >= 2 code nodes, got ${count}`);
  });

  test("5.9 — workflow.active === false (kích hoạt thủ công)", () => {
    assert.equal(workflow.active, false);
  });

  test("5.10 — có node 'Set: Outside Hours' (AC1 early-exit log)", () => {
    const found = workflow.nodes.some((n) => n.name === "Set: Outside Hours");
    assert.ok(found, "Set: Outside Hours node not found");
  });

  test("5.11 — có node 'Set: No Due Items' (AC7 clean-exit log)", () => {
    const found = workflow.nodes.some((n) => n.name === "Set: No Due Items");
    assert.ok(found, "Set: No Due Items node not found");
  });

  test("5.12 — cron expression là '*/15 * * * *' (chạy mỗi 15 phút, AC2)", () => {
    const cronNode = workflow.nodes.find(
      (n) => n.type === "n8n-nodes-base.scheduleTrigger"
    );
    const interval = cronNode?.parameters?.rule?.interval ?? [];
    const expr = interval.find((i) => i.field === "cronExpression")?.expression;
    assert.equal(expr, "*/15 * * * *");
  });

  test("5.13 — có >= 6 node type httpRequest (Query + 2×UpdateSkipped + UpdateSent + CreateNext + CreateFollowUp, AC3-AC5)", () => {
    const count = workflow.nodes.filter(
      (n) => n.type === "n8n-nodes-base.httpRequest"
    ).length;
    assert.ok(count >= 6, `expected >= 6 httpRequest nodes, got ${count}`);
  });

  test("5.14 — executeWorkflow nodes include 'Compose Message' và 'Send Message' (AC2)", () => {
    const names = workflow.nodes
      .filter((n) => n.type === "n8n-nodes-base.executeWorkflow")
      .map((n) => n.name);
    assert.ok(names.includes("Compose Message"), "'Compose Message' executeWorkflow node not found");
    assert.ok(names.includes("Send Message"), "'Send Message' executeWorkflow node not found");
  });

  test("5.15 — có node 'Expand Results' (Code) giữa Guard: No Due Items và Process Each Row — mở rộng mảng results từ Baserow", () => {
    const found = workflow.nodes.some((n) => n.name === "Expand Results" && n.type === "n8n-nodes-base.code");
    assert.ok(found, "'Expand Results' code node not found — required to unpack Baserow {count, results:[]} into individual items");
  });

  test("5.16 — 'Send Message' và 'Compose Message' có continueOnFail=true (AC3: batch không halt khi lỗi)", () => {
    const sendNode = workflow.nodes.find((n) => n.name === "Send Message");
    const composeNode = workflow.nodes.find((n) => n.name === "Compose Message");
    assert.equal(sendNode?.continueOnFail, true, "'Send Message' missing continueOnFail=true");
    assert.equal(composeNode?.continueOnFail, true, "'Compose Message' missing continueOnFail=true");
  });
});
