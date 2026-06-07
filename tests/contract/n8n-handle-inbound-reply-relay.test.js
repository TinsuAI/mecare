// Contract — n8n workflow relay nodes cho MC-Handle-InboundReply (Story 5.3, AC1–AC10).
// Tests 8.66–8.109: pharmacist sender guard, relay chain, escalation update, node count, content/behavior, tenant config.
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

  // ─── Gap-fill: Missing node existence (Story 5.3 QA) ───
  test("8.83 — 'Guard: Case ID Present' if node tồn tại (AC5 — no case_id stop branch)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Case ID Present" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Case ID Present' if node not found");
  });

  test("8.84 — 'Notify Pharmacist: No Case ID' HTTP node tồn tại (AC5 stop branch)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Notify Pharmacist: No Case ID" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Notify Pharmacist: No Case ID' httpRequest node not found");
  });

  test("8.85 — 'Extract Case Data' code node tồn tại (AC5 expand Baserow results)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Extract Case Data" && n.type === "n8n-nodes-base.code"
    );
    assert.ok(found, "'Extract Case Data' code node not found");
  });

  test("8.86 — 'Notify Pharmacist: Already Resolved' HTTP node tồn tại (AC5 idempotency stop)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Notify Pharmacist: Already Resolved" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Notify Pharmacist: Already Resolved' httpRequest node not found");
  });

  test("8.87 — 'Lookup Case Row ID' HTTP node tồn tại (AC3 — get Baserow row_id for PATCH)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Lookup Case Row ID" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Lookup Case Row ID' httpRequest node not found");
  });

  test("8.88 — 'Extract Escalation Row' code node tồn tại (AC3 — expand Baserow results for row_id)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Extract Escalation Row" && n.type === "n8n-nodes-base.code"
    );
    assert.ok(found, "'Extract Escalation Row' code node not found");
  });

  // ─── Gap-fill: Content / behavior tests ───
  test("8.89 — Parse Pharmacist Reply code chứa regex ESC-[A-Za-z0-9_-]+ (AC5)", () => {
    const node = workflow.nodes.find((n) => n.name === "Parse Pharmacist Reply");
    const code = node?.parameters?.jsCode || "";
    assert.ok(
      code.includes("ESC-"),
      "Parse Pharmacist Reply code must contain ESC- regex pattern for case_id extraction"
    );
  });

  test("8.90 — Format Relay to Customer code chứa prefix persona 'Dạ anh/chị' (AC6 — no content change)", () => {
    const node = workflow.nodes.find((n) => n.name === "Format Relay to Customer");
    const code = node?.parameters?.jsCode || "";
    assert.ok(
      code.includes("Dạ anh/chị"),
      "Format Relay to Customer must prepend persona prefix without altering pharmacist content"
    );
  });

  test("8.91 — Send Waiting Message body bypass_persona=false (AC1 — giọng Dược Sĩ Hải)", () => {
    const node = workflow.nodes.find((n) => n.name === "Send Waiting Message to Customer");
    const bp = node?.parameters?.body?.bypass_persona;
    assert.strictEqual(bp, false, `Send Waiting Message bypass_persona must be false (got ${bp})`);
  });

  test("8.92 — Relay to Pharmacist body bypass_persona=true (AC2 — không qua persona)", () => {
    const node = workflow.nodes.find((n) => n.name === "Relay to Pharmacist Zalo");
    const bp = node?.parameters?.body?.bypass_persona;
    assert.strictEqual(bp, true, `Relay to Pharmacist bypass_persona must be true (got ${bp})`);
  });

  test("8.93 — Relay to Pharmacist body 'to' tham chiếu PHARMACIST_ZALO_ID env var (AC2)", () => {
    const node = workflow.nodes.find((n) => n.name === "Relay to Pharmacist Zalo");
    const toField = node?.parameters?.body?.to || "";
    assert.ok(
      toField.includes("PHARMACIST_ZALO_ID"),
      `Relay to Pharmacist 'to' must reference PHARMACIST_ZALO_ID env var, got: ${toField}`
    );
  });

  test("8.94 — Send Pharmacist Answer body bypass_persona=false (AC6 — giọng Dược Sĩ Hải)", () => {
    const node = workflow.nodes.find((n) => n.name === "Send Pharmacist Answer to Customer");
    const bp = node?.parameters?.body?.bypass_persona;
    assert.strictEqual(bp, false, `Send Pharmacist Answer bypass_persona must be false (got ${bp})`);
  });

  test("8.95 — Update Case: Waiting Pharmacist PATCH body có state='waiting_pharmacist' (AC3)", () => {
    const node = workflow.nodes.find((n) => n.name === "Update Case: Waiting Pharmacist");
    const params = node?.parameters?.bodyParameters?.parameters || [];
    const stateParam = params.find((p) => p.name === "state");
    assert.equal(
      stateParam?.value,
      "waiting_pharmacist",
      `Update Case: Waiting Pharmacist must set state='waiting_pharmacist', got '${stateParam?.value}'`
    );
  });

  test("8.96 — Update Case: Resolved PATCH body có state='resolved', pharmacist_reply, resolved_at (AC7)", () => {
    const node = workflow.nodes.find((n) => n.name === "Update Case: Resolved");
    const params = node?.parameters?.bodyParameters?.parameters || [];
    const names = params.map((p) => p.name);
    const stateParam = params.find((p) => p.name === "state");
    assert.ok(names.includes("pharmacist_reply"), "Update Case: Resolved must include pharmacist_reply field");
    assert.ok(names.includes("resolved_at"), "Update Case: Resolved must include resolved_at field");
    assert.equal(stateParam?.value, "resolved", `state must be 'resolved', got '${stateParam?.value}'`);
  });

  // ─── Gap-fill: Full chain connection tests (AC5 pharmacist branch) ───
  test("8.97 — Parse Pharmacist Reply → Guard: Case ID Present (AC5)", () => {
    const next = workflow.connections?.["Parse Pharmacist Reply"]?.main?.[0]?.[0]?.node;
    assert.equal(next, "Guard: Case ID Present", `got '${next}'`);
  });

  test("8.98 — Guard: Case ID Present false branch → Notify Pharmacist: No Case ID (AC5 stop)", () => {
    const next = workflow.connections?.["Guard: Case ID Present"]?.main?.[1]?.[0]?.node;
    assert.equal(next, "Notify Pharmacist: No Case ID", `got '${next}'`);
  });

  test("8.99 — Guard: Case ID Present true branch → Lookup Escalation Case (AC5)", () => {
    const next = workflow.connections?.["Guard: Case ID Present"]?.main?.[0]?.[0]?.node;
    assert.equal(next, "Lookup Escalation Case", `got '${next}'`);
  });

  test("8.100 — Lookup Escalation Case → Extract Case Data (AC5 expand pattern)", () => {
    const next = workflow.connections?.["Lookup Escalation Case"]?.main?.[0]?.[0]?.node;
    assert.equal(next, "Extract Case Data", `got '${next}'`);
  });

  test("8.101 — Extract Case Data → Guard: Case Active (AC5 idempotency check)", () => {
    const next = workflow.connections?.["Extract Case Data"]?.main?.[0]?.[0]?.node;
    assert.equal(next, "Guard: Case Active", `got '${next}'`);
  });

  test("8.102 — Guard: Case Active false branch → Notify Pharmacist: Already Resolved (AC5 idempotency stop)", () => {
    const next = workflow.connections?.["Guard: Case Active"]?.main?.[1]?.[0]?.node;
    assert.equal(next, "Notify Pharmacist: Already Resolved", `got '${next}'`);
  });

  test("8.103 — Format Relay to Customer → Send Pharmacist Answer to Customer (AC6)", () => {
    const next = workflow.connections?.["Format Relay to Customer"]?.main?.[0]?.[0]?.node;
    assert.equal(next, "Send Pharmacist Answer to Customer", `got '${next}'`);
  });

  test("8.104 — Send Pharmacist Answer to Customer → Update Case: Resolved (AC7)", () => {
    const next = workflow.connections?.["Send Pharmacist Answer to Customer"]?.main?.[0]?.[0]?.node;
    assert.equal(next, "Update Case: Resolved", `got '${next}'`);
  });

  test("8.105 — Relay to Pharmacist Zalo → Lookup Case Row ID (AC3 — get row_id for PATCH)", () => {
    const next = workflow.connections?.["Relay to Pharmacist Zalo"]?.main?.[0]?.[0]?.node;
    assert.equal(next, "Lookup Case Row ID", `got '${next}'`);
  });

  test("8.106 — Lookup Case Row ID → Extract Escalation Row (AC3 expand pattern)", () => {
    const next = workflow.connections?.["Lookup Case Row ID"]?.main?.[0]?.[0]?.node;
    assert.equal(next, "Extract Escalation Row", `got '${next}'`);
  });

  test("8.107 — Extract Escalation Row → Update Case: Waiting Pharmacist (AC3)", () => {
    const next = workflow.connections?.["Extract Escalation Row"]?.main?.[0]?.[0]?.node;
    assert.equal(next, "Update Case: Waiting Pharmacist", `got '${next}'`);
  });

  // ─── Gap-fill: AC9 tenant config ───
  test("8.108 — PHARMACIST_ZALO_ID có trong tenants/_template.env (AC9)", () => {
    const envPath = repoPath("tenants/_template.env");
    const content = fs.readFileSync(envPath, "utf8");
    assert.ok(content.includes("PHARMACIST_ZALO_ID"), "PHARMACIST_ZALO_ID missing from tenants/_template.env");
  });

  test("8.109 — RELAY_SLA_MINUTES=60 có trong tenants/_template.env (AC9 default)", () => {
    const envPath = repoPath("tenants/_template.env");
    const content = fs.readFileSync(envPath, "utf8");
    assert.ok(content.includes("RELAY_SLA_MINUTES=60"), "RELAY_SLA_MINUTES=60 missing from tenants/_template.env");
  });
});
