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

  // Story 4.3 — Quota enforcement nodes
  test("5.17 — có node 'Quota Check' (executeWorkflow → MC-Quota-Enforce, AC1)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Quota Check" && n.type === "n8n-nodes-base.executeWorkflow"
    );
    assert.ok(found, "'Quota Check' executeWorkflow node not found");
  });

  test("5.18 — 'Quota Check' truyền pharmacy_id, care_group, period_month (AC1)", () => {
    const node = workflow.nodes.find((n) => n.name === "Quota Check");
    assert.ok(node, "Quota Check node not found");
    const values = node?.parameters?.fields?.values ?? [];
    const names = values.map((v) => v.name);
    assert.ok(names.includes("pharmacy_id"), "Quota Check missing pharmacy_id field");
    assert.ok(names.includes("care_group"), "Quota Check missing care_group field");
    assert.ok(names.includes("period_month"), "Quota Check missing period_month field");
  });

  test("5.19 — 'Quota Check' gọi MC-Quota-Enforce (AC1)", () => {
    const node = workflow.nodes.find((n) => n.name === "Quota Check");
    const workflowId = node?.parameters?.workflowId?.value ?? "";
    assert.equal(workflowId, "MC-Quota-Enforce", "Quota Check must call MC-Quota-Enforce workflow");
  });

  test("5.20 — có node 'Guard: Quota Blocked' (if, AC1: chặn khi allowed=false)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Quota Blocked" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Quota Blocked' if node not found");
  });

  test("5.21 — có node 'Update CareSchedule QuotaExceeded' (httpRequest PATCH, AC5)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Update CareSchedule QuotaExceeded" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Update CareSchedule QuotaExceeded' httpRequest node not found");
  });

  test("5.22 — 'Update CareSchedule QuotaExceeded' đặt status=quota_exceeded (AC5)", () => {
    const node = workflow.nodes.find((n) => n.name === "Update CareSchedule QuotaExceeded");
    assert.ok(node, "Update CareSchedule QuotaExceeded not found");
    const status = node?.parameters?.body?.status ?? node?.parameters?.bodyParameters?.parameters?.find((p) => p.name === "status")?.value;
    assert.equal(status, "quota_exceeded", "must set status=quota_exceeded");
  });

  test("5.23 — có node 'Log Quota Alert' (httpRequest POST, AC5: ghi cảnh báo)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Log Quota Alert" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Log Quota Alert' httpRequest node not found");
  });

  test("5.24 — có node 'Get QuotaCounter Row' (httpRequest GET, AC6)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Get QuotaCounter Row" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Get QuotaCounter Row' httpRequest node not found");
  });

  test("5.25 — có node 'Guard: Quota Row Exists' (if, AC6: upsert pattern)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Guard: Quota Row Exists" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Guard: Quota Row Exists' if node not found");
  });

  test("5.26 — có node 'Increment QuotaCounter' (httpRequest PATCH, AC6)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Increment QuotaCounter" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Increment QuotaCounter' httpRequest node not found");
  });

  test("5.27 — có node 'Create QuotaCounter Row' (httpRequest POST, AC6+AC7: tháng mới)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Create QuotaCounter Row" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Create QuotaCounter Row' httpRequest node not found");
  });

  test("5.28 — 'Create QuotaCounter Row' POST với cap=1000 (AC7: default cap)", () => {
    const node = workflow.nodes.find((n) => n.name === "Create QuotaCounter Row");
    assert.ok(node, "Create QuotaCounter Row not found");
    const params = node?.parameters?.bodyParameters?.parameters ?? [];
    const capParam = params.find((p) => p.name === "cap");
    assert.ok(capParam, "Create QuotaCounter Row missing 'cap' parameter");
    assert.equal(String(capParam.value), "1000", "cap default must be 1000");
  });

  test("5.29 — có node 'Check Error Type' (if, AC2: phân loại 429 vs lỗi khác)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Check Error Type" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "'Check Error Type' if node not found");
  });

  test("5.30 — 'Check Error Type' kiểm tra daily_cap_exceeded (AC2)", () => {
    const node = workflow.nodes.find((n) => n.name === "Check Error Type");
    const conditions = node?.parameters?.conditions?.conditions ?? [];
    const hasDailyCapCheck = conditions.some(
      (c) => c.rightValue === "daily_cap_exceeded" || String(c.rightValue).includes("daily_cap_exceeded")
    );
    assert.ok(hasDailyCapCheck, "Check Error Type must check for 'daily_cap_exceeded'");
  });

  test("5.31 — có node 'Update CareSchedule RateLimited' (httpRequest PATCH, AC2)", () => {
    const found = workflow.nodes.some(
      (n) => n.name === "Update CareSchedule RateLimited" && n.type === "n8n-nodes-base.httpRequest"
    );
    assert.ok(found, "'Update CareSchedule RateLimited' httpRequest node not found");
  });

  test("5.32 — 'Update CareSchedule RateLimited' đặt status=rate_limited (AC2)", () => {
    const node = workflow.nodes.find((n) => n.name === "Update CareSchedule RateLimited");
    assert.ok(node, "Update CareSchedule RateLimited not found");
    const status = node?.parameters?.body?.status;
    assert.equal(status, "rate_limited", "must set status=rate_limited");
  });

  test("5.33 — 'Update CareSchedule SkippedOnSendFail' đặt status=send_failed (AC2: không dùng 'skipped' cho lỗi send)", () => {
    const node = workflow.nodes.find((n) => n.name === "Update CareSchedule SkippedOnSendFail");
    assert.ok(node, "Update CareSchedule SkippedOnSendFail not found");
    const status = node?.parameters?.body?.status;
    assert.equal(status, "send_failed", "must set status=send_failed for non-429 errors");
  });

  test("5.34 — 'Generate message_id' code tính period_month GMT+7 (AC1+AC3: period_month cho quota check)", () => {
    const node = workflow.nodes.find((n) => n.name === "Generate message_id");
    const code = node?.parameters?.jsCode ?? "";
    assert.ok(
      code.includes("period_month"),
      "Generate message_id must compute period_month"
    );
    assert.ok(
      code.includes("7 * 3600000") || code.includes("7*3600000"),
      "period_month must use GMT+7 offset"
    );
  });

  test("5.35 — Query CareSchedule lọc rate_limited (AC2: rate_limited rows được retry)", () => {
    const node = workflow.nodes.find((n) => n.name === "Query CareSchedule");
    const url = node?.parameters?.url ?? "";
    assert.ok(
      url.includes("rate_limited") || url.includes("not_equal"),
      "Query CareSchedule must include rate_limited rows (via inclusion or not_equal exclusion)"
    );
  });

  test("5.36 — 'Guard: Quota Blocked' condition kiểm tra allowed === false (AC1: chặn khi quota hết)", () => {
    const node = workflow.nodes.find((n) => n.name === "Guard: Quota Blocked");
    const conditions = node?.parameters?.conditions?.conditions ?? [];
    const hasAllowedFalse = conditions.some(
      (c) => String(c.leftValue).includes("allowed") && c.rightValue === false
    );
    assert.ok(hasAllowedFalse, "Guard: Quota Blocked must check allowed === false");
  });

  test("5.37 — 'Log Quota Alert' URL tham chiếu BASEROW_TABLE_MESSAGES (AC5: ghi vào Messages thay Error_Logs)", () => {
    const node = workflow.nodes.find((n) => n.name === "Log Quota Alert");
    const url = node?.parameters?.url ?? "";
    assert.ok(
      url.includes("BASEROW_TABLE_MESSAGES"),
      `Log Quota Alert URL must reference BASEROW_TABLE_MESSAGES, got: ${url}`
    );
  });

  test("5.38 — 'Log Quota Alert' body có type=escalation (AC5: tránh 'alert' không hợp lệ trong Messages)", () => {
    const node = workflow.nodes.find((n) => n.name === "Log Quota Alert");
    const params = node?.parameters?.bodyParameters?.parameters ?? [];
    const typeParam = params.find((p) => p.name === "type");
    assert.ok(typeParam, "Log Quota Alert missing 'type' body param");
    assert.equal(typeParam.value, "escalation", "Log Quota Alert type must be 'escalation'");
  });

  test("5.39 — 'Log Quota Alert' body có status=failed (AC5: status hợp lệ trong Messages)", () => {
    const node = workflow.nodes.find((n) => n.name === "Log Quota Alert");
    const params = node?.parameters?.bodyParameters?.parameters ?? [];
    const statusParam = params.find((p) => p.name === "status");
    assert.ok(statusParam, "Log Quota Alert missing 'status' body param");
    assert.equal(statusParam.value, "failed", "Log Quota Alert status must be 'failed'");
  });

  test("5.40 — 'Increment QuotaCounter' URL dùng Get QuotaCounter Row results[0].id (AC6: PATCH đúng row)", () => {
    const node = workflow.nodes.find((n) => n.name === "Increment QuotaCounter");
    const url = node?.parameters?.url ?? "";
    assert.ok(
      url.includes("Get QuotaCounter Row") && url.includes("results[0].id"),
      `Increment QuotaCounter URL must reference Get QuotaCounter Row results[0].id, got: ${url}`
    );
  });

  test("5.41 — 'Increment QuotaCounter' body tăng sent_count + 1 (AC6: đếm đúng số tin đã gửi)", () => {
    const node = workflow.nodes.find((n) => n.name === "Increment QuotaCounter");
    const params = node?.parameters?.bodyParameters?.parameters ?? [];
    const sentCountParam = params.find((p) => p.name === "sent_count");
    assert.ok(sentCountParam, "Increment QuotaCounter missing 'sent_count' body param");
    assert.ok(
      String(sentCountParam.value).includes("sent_count") && String(sentCountParam.value).includes("+ 1"),
      `Increment QuotaCounter sent_count must add 1, got: ${sentCountParam.value}`
    );
  });

  test("5.42 — 'Get QuotaCounter Row' URL lọc theo pharmacy_id VÀ period_month (AC7: isolation đúng tenant+tháng)", () => {
    const node = workflow.nodes.find((n) => n.name === "Get QuotaCounter Row");
    const url = node?.parameters?.url ?? "";
    assert.ok(
      url.includes("pharmacy_id"),
      `Get QuotaCounter Row URL must filter by pharmacy_id, got: ${url}`
    );
    assert.ok(
      url.includes("period_month"),
      `Get QuotaCounter Row URL must filter by period_month, got: ${url}`
    );
  });

  test("5.43 — 'Create QuotaCounter Row' body có sent_count=1 (AC6: tháng mới bắt đầu từ 1)", () => {
    const node = workflow.nodes.find((n) => n.name === "Create QuotaCounter Row");
    const params = node?.parameters?.bodyParameters?.parameters ?? [];
    const sentCountParam = params.find((p) => p.name === "sent_count");
    assert.ok(sentCountParam, "Create QuotaCounter Row missing 'sent_count' body param");
    assert.equal(String(sentCountParam.value), "1", "Create QuotaCounter Row sent_count must be 1 for new month");
  });

  test("5.44 — 'Guard: Quota Row Exists' condition kiểm tra count > 0 (AC6: upsert pattern)", () => {
    const node = workflow.nodes.find((n) => n.name === "Guard: Quota Row Exists");
    const conditions = node?.parameters?.conditions?.conditions ?? [];
    const hasCountGt0 = conditions.some(
      (c) => String(c.leftValue).includes("count") && c.rightValue === 0
    );
    assert.ok(hasCountGt0, "Guard: Quota Row Exists must check count > 0");
  });
});
