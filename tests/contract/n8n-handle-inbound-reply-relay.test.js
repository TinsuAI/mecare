// Contract — n8n workflow relay nodes cho MC-Handle-InboundReply (Story 5.3, AC1–AC10).
// Tests 8.66–8.81: pharmacist sender guard, relay chain, escalation update, node count.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const WORKFLOW_FILE = repoPath("n8n/workflows/MC-Handle-InboundReply.json");

let workflow;
describe("MC-Handle-InboundReply relay nodes (Story 5.3)", () => {
  test("8.66 — parse workflow JSON không lỗi (Story 5.3 baseline)", () => {
    const raw = fs.readFileSync(WORKFLOW_FILE, "utf8");
    workflow = JSON.parse(raw);
    assert.ok(workflow, "workflow JSON parsed");
  });

  // ─── Task 2: Pharmacist Reply Branch ───
  test("8.67 — 'Guard: Is Pharmacist Sender' if node tồn tại (AC4)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Is Pharmacist Sender" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Is Pharmacist Sender' if node not found");
  });

  test("8.68 — 'Parse Pharmacist Reply' code node tồn tại (AC5)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Parse Pharmacist Reply" && n.type === "n8n-nodes-base.code"
    );
    assert.ok(found, "'Parse Pharmacist Reply' code node not found");
  });

  test("8.69 — 'Lookup Escalation Case' HTTP node tồn tại (AC5)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Lookup Escalation Case" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Lookup Escalation Case' httpRequest node not found");
  });

  test("8.70 — 'Guard: Case Active' if node tồn tại (AC5 idempotency)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Case Active" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Case Active' if node not found");
  });

  test("8.71 — 'Format Relay to Customer' code node tồn tại (AC6)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Format Relay to Customer" && n.type === "n8n-nodes-base.code"
    );
    assert.ok(found, "'Format Relay to Customer' code node not found");
  });

  test("8.72 — 'Send Pharmacist Answer to Customer' HTTP node tồn tại (AC6)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Send Pharmacist Answer to Customer" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Send Pharmacist Answer to Customer' httpRequest node not found");
  });

  test("8.73 — 'Update Case: Resolved' HTTP node tồn tại (AC7)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Update Case: Resolved" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Update Case: Resolved' httpRequest node not found");
  });

  // ─── Task 1: Escalation Relay Chain (AC1, AC2, AC3) ───
  test("8.74 — 'Send Waiting Message to Customer' HTTP node tồn tại (AC1)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Send Waiting Message to Customer" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Send Waiting Message to Customer' httpRequest node not found");
  });

  test("8.75 — 'Relay to Pharmacist Zalo' HTTP node tồn tại (AC2)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Relay to Pharmacist Zalo" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Relay to Pharmacist Zalo' httpRequest node not found");
  });

  test("8.76 — 'Update Case: Waiting Pharmacist' HTTP node tồn tại (AC3)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Update Case: Waiting Pharmacist" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Update Case: Waiting Pharmacist' httpRequest node not found");
  });

  // ─── Connection tests ───
  test("8.77 — Log Inbound Message kết nối tới Guard: Is Pharmacist Sender (AC4 routing)", () => {
    const nextNode = workflow.connections?.["Log Inbound Message"]?.main?.[0]?.[0]?.node;
    assert.equal(
      nextNode,
      "Guard: Is Pharmacist Sender",
      `Log Inbound Message must connect to 'Guard: Is Pharmacist Sender', got '${nextNode}'`
    );
  });

  test("8.78 — Guard: Is Pharmacist Sender false branch kết nối tới Classify Response (AC10 regression)", () => {
    const falseBranchTarget = workflow.connections?.["Guard: Is Pharmacist Sender"]?.main?.[1]?.[0]?.node;
    assert.equal(
      falseBranchTarget,
      "Classify Response",
      `Guard: Is Pharmacist Sender false branch must go to 'Classify Response', got '${falseBranchTarget}'`
    );
  });

  test("8.79 — Guard: Is Pharmacist Sender true branch kết nối tới Parse Pharmacist Reply (AC4)", () => {
    const trueBranchTarget = workflow.connections?.["Guard: Is Pharmacist Sender"]?.main?.[0]?.[0]?.node;
    assert.equal(
      trueBranchTarget,
      "Parse Pharmacist Reply",
      `Guard: Is Pharmacist Sender true branch must go to 'Parse Pharmacist Reply', got '${trueBranchTarget}'`
    );
  });

  test("8.80 — Log Escalation Case Created kết nối tới Send Waiting Message to Customer (AC1)", () => {
    const nextNode = workflow.connections?.["Log Escalation Case Created"]?.main?.[0]?.[0]?.node;
    assert.equal(
      nextNode,
      "Send Waiting Message to Customer",
      `Log Escalation Case Created must connect to 'Send Waiting Message to Customer', got '${nextNode}'`
    );
  });

  test("8.81 — Update Case: Waiting Pharmacist kết nối tới Return Result (AC3 chain end)", () => {
    const nextNode = workflow.connections?.["Update Case: Waiting Pharmacist"]?.main?.[0]?.[0]?.node;
    assert.equal(
      nextNode,
      "Return Result",
      `Update Case: Waiting Pharmacist must connect to 'Return Result', got '${nextNode}'`
    );
  });

  test("8.82 — Node count >= 35 sau Story 5.3 (kiến trúc hoàn chỉnh)", () => {
    const count = workflow.nodes.length;
    assert.ok(
      count >= 35,
      `MC-Handle-InboundReply phải có >= 35 nodes sau Story 5.3, currently has ${count}`
    );
  });
});
