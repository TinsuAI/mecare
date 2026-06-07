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

  // Story 4.4 gap-fill: AC2, AC3, AC8 classification + guard condition details
  test("8.17 — continue_signal keywords trong Classify Response code (AC2)", () => {
    const node = workflow.nodes.find((n) => n.name === "Classify Response");
    assert.ok(node, "Classify Response node not found");
    const code = node?.parameters?.jsCode ?? "";
    assert.ok(code.includes("continue_signal"), "'continue_signal' classification not found in classify code");
    assert.ok(code.includes("chưa đỡ"), "continue_signal keyword 'chưa đỡ' not found in classify code");
  });

  test("8.18 — escalation_trigger keywords trong Classify Response code (AC3)", () => {
    const node = workflow.nodes.find((n) => n.name === "Classify Response");
    assert.ok(node, "Classify Response node not found");
    const code = node?.parameters?.jsCode ?? "";
    assert.ok(code.includes("escalation_trigger"), "'escalation_trigger' classification not found in classify code");
    assert.ok(
      code.includes("nặng hơn") || code.includes("tệ hơn"),
      "escalation keyword 'nặng hơn' or 'tệ hơn' not found in classify code"
    );
  });

  test("8.19 — free_form classification tồn tại trong Classify Response code (AC8)", () => {
    const node = workflow.nodes.find((n) => n.name === "Classify Response");
    assert.ok(node, "Classify Response node not found");
    const code = node?.parameters?.jsCode ?? "";
    assert.ok(code.includes("free_form"), "'free_form' fallback classification not found in classify code");
  });

  test("8.20 — 'Guard: Is Opt-Out' condition kiểm tra classified_type === 'opt_out' (AC4)", () => {
    const node = workflow.nodes.find((n) => n.name === "Guard: Is Opt-Out");
    assert.ok(node, "'Guard: Is Opt-Out' node not found");
    const conditions = node?.parameters?.conditions?.conditions ?? [];
    const checksOptOut = conditions.some(
      (c) => String(c.leftValue).includes("classified_type") && c.rightValue === "opt_out"
    );
    assert.ok(checksOptOut, "Guard: Is Opt-Out must check classified_type === 'opt_out'");
  });

  test("8.21 — 'Guard: Is Done Signal' condition kiểm tra classified_type === 'done_signal' (AC1)", () => {
    const node = workflow.nodes.find((n) => n.name === "Guard: Is Done Signal");
    assert.ok(node, "'Guard: Is Done Signal' node not found");
    const conditions = node?.parameters?.conditions?.conditions ?? [];
    const checksDoneSignal = conditions.some(
      (c) => String(c.leftValue).includes("classified_type") && c.rightValue === "done_signal"
    );
    assert.ok(checksDoneSignal, "Guard: Is Done Signal must check classified_type === 'done_signal'");
  });

  test("8.22 — 'Guard: Is Group 6' condition kiểm tra care_group === 6 (AC7)", () => {
    const node = workflow.nodes.find((n) => n.name === "Guard: Is Group 6");
    assert.ok(node, "'Guard: Is Group 6' node not found");
    const conditions = node?.parameters?.conditions?.conditions ?? [];
    const checksCareGroup6 = conditions.some(
      (c) => String(c.leftValue).includes("care_group") && c.rightValue === 6
    );
    assert.ok(checksCareGroup6, "Guard: Is Group 6 must check care_group === 6");
  });

  // Story 5.1 — free_form FAQ branch (AC1, AC4, AC5, AC6, AC7, AC9)
  test("8.23 — 'Guard: Is Free Form' if node tồn tại (AC1)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Is Free Form" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Is Free Form' if node not found");
  });

  test("8.24 — 'Guard: Is Free Form' condition kiểm tra classified_type === 'free_form' (AC1)", () => {
    const node = workflow.nodes.find((n) => n.name === "Guard: Is Free Form");
    assert.ok(node, "'Guard: Is Free Form' node not found");
    const conditions = node?.parameters?.conditions?.conditions ?? [];
    const checksFreeForm = conditions.some(
      (c) => String(c.leftValue).includes("classified_type") && c.rightValue === "free_form"
    );
    assert.ok(checksFreeForm, "Guard: Is Free Form must check classified_type === 'free_form'");
  });

  test("8.25 — 'Guard: Is Complaint Active' if node tồn tại (AC6)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Is Complaint Active" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Is Complaint Active' if node not found");
  });

  test("8.26 — 'Guard: Is Complaint Active' condition kiểm tra is_complaint_active (AC6)", () => {
    const node = workflow.nodes.find((n) => n.name === "Guard: Is Complaint Active");
    assert.ok(node, "'Guard: Is Complaint Active' node not found");
    const conditions = node?.parameters?.conditions?.conditions ?? [];
    const checksComplaint = conditions.some(
      (c) => String(c.leftValue).includes("is_complaint_active")
    );
    assert.ok(checksComplaint, "Guard: Is Complaint Active must check is_complaint_active");
  });

  test("8.27 — 'Log Escalation Trigger' set node tồn tại (AC5, AC6)", () => {
    const node = workflow.nodes.find((n) => n.name === "Log Escalation Trigger");
    assert.ok(node, "'Log Escalation Trigger' set node not found");
    assert.equal(node.type, "n8n-nodes-base.set", "Log Escalation Trigger must be set node");
    const assignments = node?.parameters?.assignments?.assignments ?? [];
    const setsEscalation = assignments.some(
      (a) => a.name === "classified_type" && a.value === "escalation_trigger"
    );
    assert.ok(setsEscalation, "Log Escalation Trigger must set classified_type=escalation_trigger");
  });

  test("8.28 — 'Call OpenClaw FAQ' httpRequest POST tới faq_lookup endpoint (AC2)", () => {
    const node = workflow.nodes.find((n) => n.name === "Call OpenClaw FAQ");
    assert.ok(node, "'Call OpenClaw FAQ' node not found");
    assert.equal(node.type, "n8n-nodes-base.httpRequest");
    assert.equal(node.parameters?.method, "POST");
    const url = node.parameters?.url ?? "";
    assert.ok(url.includes("faq_lookup"), "Call OpenClaw FAQ URL must include faq_lookup");
    const params = node.parameters?.bodyParameters?.parameters ?? [];
    const hasPharmacyId = params.some((p) => p.name === "pharmacy_id");
    const hasMessageContent = params.some((p) => p.name === "message_content");
    assert.ok(hasPharmacyId, "Call OpenClaw FAQ body must include pharmacy_id");
    assert.ok(hasMessageContent, "Call OpenClaw FAQ body must include message_content");
  });

  test("8.29 — 'Guard: Can Answer' if node tồn tại (AC2, AC5)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Can Answer" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Can Answer' if node not found");
  });

  test("8.30 — 'Guard: Can Answer' condition kiểm tra can_answer === false (AC5)", () => {
    const node = workflow.nodes.find((n) => n.name === "Guard: Can Answer");
    assert.ok(node, "'Guard: Can Answer' node not found");
    const conditions = node?.parameters?.conditions?.conditions ?? [];
    const checksCanAnswer = conditions.some(
      (c) => String(c.leftValue).includes("can_answer") && c.rightValue === false
    );
    assert.ok(checksCanAnswer, "Guard: Can Answer must check can_answer === false");
  });

  test("8.31 — 'Format FAQ Reply' code node tồn tại với mandatory_suffix logic (AC3, AC4)", () => {
    const node = workflow.nodes.find((n) => n.name === "Format FAQ Reply");
    assert.ok(node, "'Format FAQ Reply' code node not found");
    assert.equal(node.type, "n8n-nodes-base.code");
    const code = node?.parameters?.jsCode ?? "";
    assert.ok(code.includes("mandatory_suffix"), "Format FAQ Reply must handle mandatory_suffix");
    assert.ok(code.includes("is_tpcn"), "Format FAQ Reply must check is_tpcn flag");
    assert.ok(code.includes("final_answer"), "Format FAQ Reply must produce final_answer");
  });

  test("8.32 — 'Audit: Write Messages Pending' POST Baserow Messages status=pending trước MC-Zalo-Send (AC7)", () => {
    const node = workflow.nodes.find((n) => n.name === "Audit: Write Messages Pending");
    assert.ok(node, "'Audit: Write Messages Pending' node not found");
    assert.equal(node.type, "n8n-nodes-base.httpRequest");
    assert.equal(node.parameters?.method, "POST");
    const url = node.parameters?.url ?? "";
    assert.ok(url.includes("BASEROW_TABLE_MESSAGES"), "Audit: Write Messages Pending must POST to BASEROW_TABLE_MESSAGES");
    const params = node.parameters?.bodyParameters?.parameters ?? [];
    const statusParam = params.find((p) => p.name === "status");
    assert.ok(statusParam, "Audit: Write Messages Pending must have status param");
    assert.equal(statusParam.value, "pending", "Audit: Write Messages Pending status must be 'pending'");
    const typeParam = params.find((p) => p.name === "type");
    assert.ok(typeParam, "Audit: Write Messages Pending must have type param");
    assert.equal(typeParam.value, "reply", "Audit: Write Messages Pending type must be 'reply'");
    const connAfterAudit = workflow.connections?.["Audit: Write Messages Pending"]?.main?.[0]?.[0]?.node;
    assert.equal(connAfterAudit, "Execute MC-Zalo-Send", "Audit must connect to Execute MC-Zalo-Send (audit-first AC7)");
  });

  test("8.33 — 'Execute MC-Zalo-Send' executeWorkflow node tồn tại (AC7)", () => {
    const node = workflow.nodes.find((n) => n.name === "Execute MC-Zalo-Send");
    assert.ok(node, "'Execute MC-Zalo-Send' node not found");
    assert.equal(node.type, "n8n-nodes-base.executeWorkflow");
    const workflowId = node.parameters?.workflowId?.value ?? node.parameters?.workflowId ?? "";
    assert.ok(String(workflowId).includes("MC-Zalo-Send"), "Execute MC-Zalo-Send must reference MC-Zalo-Send workflow");
  });

  test("8.34 — 'Update Messages Status' code node tồn tại (AC7)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Update Messages Status" && n.type === "n8n-nodes-base.code"
    );
    assert.ok(found, "'Update Messages Status' code node not found");
  });

  test("8.35 — Update Messages Status code references Audit: Write Messages Pending.id (AC7)", () => {
    const node = workflow.nodes.find((n) => n.name === "Update Messages Status");
    assert.ok(node, "'Update Messages Status' node not found");
    const code = node?.parameters?.jsCode ?? "";
    assert.ok(
      code.includes("Audit: Write Messages Pending") || code.includes("messageId"),
      "Update Messages Status must reference audit node message_id"
    );
    assert.ok(
      code.includes("sent") && code.includes("failed"),
      "Update Messages Status must handle sent/failed status"
    );
  });

  test("8.36 — Guard: Is Done Signal false branch kết nối tới Guard: Is Free Form (Story 5.1 AC1)", () => {
    const falseBranchTarget = workflow.connections?.["Guard: Is Done Signal"]?.main?.[1]?.[0]?.node;
    assert.equal(
      falseBranchTarget,
      "Guard: Is Free Form",
      `Guard: Is Done Signal false branch must go to 'Guard: Is Free Form', got '${falseBranchTarget}'`
    );
  });

  test("8.37 — Guard: Can Answer true branch kết nối tới Log Escalation Trigger (AC5)", () => {
    const trueBranchTarget = workflow.connections?.["Guard: Can Answer"]?.main?.[0]?.[0]?.node;
    assert.equal(
      trueBranchTarget,
      "Log Escalation Trigger",
      `Guard: Can Answer true (can_answer=false) must go to 'Log Escalation Trigger', got '${trueBranchTarget}'`
    );
  });

  test("8.38 — Guard: Is Complaint Active true branch kết nối tới Log Escalation Trigger (AC6)", () => {
    const trueBranchTarget = workflow.connections?.["Guard: Is Complaint Active"]?.main?.[0]?.[0]?.node;
    assert.equal(
      trueBranchTarget,
      "Log Escalation Trigger",
      `Guard: Is Complaint Active true must go to 'Log Escalation Trigger', got '${trueBranchTarget}'`
    );
  });

  test("8.39 — workflow có >= 19 nodes (11 cũ + 8 mới Story 5.1)", () => {
    assert.ok(
      workflow.nodes.length >= 19,
      `expected >= 19 nodes (11 Epic4 + 8 Story5.1), got ${workflow.nodes.length}`
    );
  });

  test("8.40 — Guard: Can Answer false branch kết nối tới Format FAQ Reply (AC2)", () => {
    const falseBranchTarget = workflow.connections?.["Guard: Can Answer"]?.main?.[1]?.[0]?.node;
    assert.equal(
      falseBranchTarget,
      "Format FAQ Reply",
      `Guard: Can Answer false branch (can_answer=true) must go to 'Format FAQ Reply', got '${falseBranchTarget}'`
    );
  });

  test("8.41 — Guard: Is Free Form false branch kết nối tới Return Result (AC1)", () => {
    const falseBranchTarget = workflow.connections?.["Guard: Is Free Form"]?.main?.[1]?.[0]?.node;
    assert.equal(
      falseBranchTarget,
      "Return Result",
      `Guard: Is Free Form false branch (not free_form) must go to 'Return Result', got '${falseBranchTarget}'`
    );
  });

  test("8.42 — Guard: Is Complaint Active false branch kết nối tới Call OpenClaw FAQ (AC6)", () => {
    const falseBranchTarget = workflow.connections?.["Guard: Is Complaint Active"]?.main?.[1]?.[0]?.node;
    assert.equal(
      falseBranchTarget,
      "Call OpenClaw FAQ",
      `Guard: Is Complaint Active false branch (not active) must go to 'Call OpenClaw FAQ', got '${falseBranchTarget}'`
    );
  });

  test("8.43 — Log Escalation Trigger kết nối tới Return Result (AC5, AC6)", () => {
    const nextNode = workflow.connections?.["Log Escalation Trigger"]?.main?.[0]?.[0]?.node;
    assert.equal(
      nextNode,
      "Return Result",
      `Log Escalation Trigger must connect to 'Return Result', got '${nextNode}'`
    );
  });

  test("8.44 — Format FAQ Reply kết nối tới Audit: Write Messages Pending (AC7 audit-first)", () => {
    const nextNode = workflow.connections?.["Format FAQ Reply"]?.main?.[0]?.[0]?.node;
    assert.equal(
      nextNode,
      "Audit: Write Messages Pending",
      `Format FAQ Reply must connect to 'Audit: Write Messages Pending', got '${nextNode}'`
    );
  });
});
