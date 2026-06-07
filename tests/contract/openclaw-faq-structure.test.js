// Contract — OpenClaw FAQ plugin + guardrail + gateway hook (Story 5.1, AC2-AC5, AC10).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const read = (rel) => fs.readFileSync(repoPath(rel), "utf8");
const readJSON = (rel) => JSON.parse(read(rel));

describe("OpenClaw FAQ plugin + guardrail structure (Story 5.1)", () => {
  test("10.1 — faq-lookup.json plugin tồn tại (AC10)", () => {
    const plugin = readJSON("openclaw/plugins/faq-lookup.json");
    assert.ok(plugin, "faq-lookup.json not found or invalid");
    assert.equal(plugin.name, "faq_lookup", "plugin name must be faq_lookup");
  });

  test("10.2 — faq-lookup.json khai báo endpoint /tools/faq_lookup (AC10)", () => {
    const plugin = readJSON("openclaw/plugins/faq-lookup.json");
    assert.equal(plugin.endpoint, "/tools/faq_lookup", "endpoint must be /tools/faq_lookup");
  });

  test("10.3 — faq-lookup.json input schema có pharmacy_id + message_content (AC2)", () => {
    const plugin = readJSON("openclaw/plugins/faq-lookup.json");
    const props = plugin.input_schema?.properties ?? {};
    assert.ok(props.pharmacy_id, "input schema must have pharmacy_id");
    assert.ok(props.message_content, "input schema must have message_content");
    const required = plugin.input_schema?.required ?? [];
    assert.ok(required.includes("pharmacy_id") && required.includes("message_content"), "both fields required");
  });

  test("10.4 — faq-lookup.json output schema có can_answer, answer, is_tpcn, mandatory_suffix, scope (AC2)", () => {
    const plugin = readJSON("openclaw/plugins/faq-lookup.json");
    const props = plugin.output_schema?.properties ?? {};
    assert.ok(props.can_answer, "output must have can_answer");
    assert.ok(props.answer, "output must have answer");
    assert.ok(props.is_tpcn, "output must have is_tpcn");
    assert.ok(props.mandatory_suffix, "output must have mandatory_suffix");
    assert.ok(props.scope, "output must have scope");
  });

  test("10.5 — faq-lookup.json RAG threshold = 0.75 (catch_all_rule AC5)", () => {
    const plugin = readJSON("openclaw/plugins/faq-lookup.json");
    assert.equal(plugin.rag?.similarity_threshold, 0.75, "RAG threshold must be 0.75");
  });

  test("10.6 — faq-guardrail.yml tồn tại với 3 rules (AC3, AC4, AC5)", () => {
    const guardrail = read("openclaw/guardrails/faq-guardrail.yml");
    assert.ok(guardrail.includes("no_diagnosis_rule"), "must have no_diagnosis_rule (NFR-2)");
    assert.ok(guardrail.includes("tpcn_suffix_rule"), "must have tpcn_suffix_rule (AC4)");
    assert.ok(guardrail.includes("catch_all_rule"), "must have catch_all_rule (AC5)");
  });

  test("10.7 — faq-guardrail.yml no_diagnosis_rule từ chối chẩn đoán/đổi liều (NFR-2)", () => {
    const guardrail = read("openclaw/guardrails/faq-guardrail.yml");
    assert.ok(guardrail.includes("chẩn đoán") || guardrail.includes("chan_doan"), "must block diagnosis terms");
    assert.ok(guardrail.includes("liều") || guardrail.includes("lieu"), "must block dose-change terms");
  });

  test("10.8 — faq-guardrail.yml tpcn_suffix_rule enforce mandatory_suffix (AC4)", () => {
    const guardrail = read("openclaw/guardrails/faq-guardrail.yml");
    assert.ok(guardrail.includes("mandatory_suffix"), "tpcn_suffix_rule must reference mandatory_suffix");
    assert.ok(guardrail.includes("tpcn"), "tpcn_suffix_rule must reference tpcn scope");
  });

  test("10.9 — gateway.yml có on_inbound_message hook trỏ tới n8n MC-Handle-InboundReply (AC10)", () => {
    const gateway = read("openclaw/config/gateway.yml");
    assert.ok(gateway.includes("on_inbound_message"), "gateway must have on_inbound_message hook");
    assert.ok(
      gateway.includes("MC-Handle-InboundReply"),
      "on_inbound_message hook must point to MC-Handle-InboundReply"
    );
    assert.ok(gateway.includes("n8n:5678"), "hook URL must use n8n internal service address");
  });

  test("10.10 — gateway.yml payload_fields có đủ 6 trường (AC10)", () => {
    const gateway = read("openclaw/config/gateway.yml");
    const requiredFields = ["customer_id", "pharmacy_id", "care_group", "message_content", "is_opted_out", "is_complaint_active"];
    for (const field of requiredFields) {
      assert.ok(gateway.includes(field), `gateway.yml payload_fields must include ${field}`);
    }
  });
});

describe("FaqEntries seed data đủ cho e2e test (Story 5.1, AC2, AC4)", () => {
  // Draft seed: verified for ≥2 TPCN and ≥1 dung-cu (new scopes added in Story 5.1).
  // Approved seed: separate file 09-faq-entries-approved.json for RAG e2e (Task 5.2).

  test("10.11 — draft seed có ≥2 TPCN records với mandatory_suffix không rỗng", () => {
    const seed = JSON.parse(fs.readFileSync(repoPath("baserow/seed/09-faq-entries-draft.json"), "utf8"));
    const tpcnRows = seed.rows.filter(
      (r) => String(r.scope ?? "").toLowerCase().includes("tpcn") && r.mandatory_suffix
    );
    assert.ok(tpcnRows.length >= 2, `expected >= 2 TPCN rows with mandatory_suffix in draft seed, got ${tpcnRows.length}`);
  });

  test("10.12 — draft seed có ≥1 record scope=cach-dung-thuoc (AC2)", () => {
    const seed = JSON.parse(fs.readFileSync(repoPath("baserow/seed/09-faq-entries-draft.json"), "utf8"));
    const found = seed.rows.some((r) => String(r.scope ?? "").includes("cach-dung-thuoc"));
    assert.ok(found, "draft seed must have at least 1 cach-dung-thuoc record");
  });

  test("10.13 — draft seed có ≥1 record scope=dung-cu (AC2)", () => {
    const seed = JSON.parse(fs.readFileSync(repoPath("baserow/seed/09-faq-entries-draft.json"), "utf8"));
    const found = seed.rows.some((r) => String(r.scope ?? "").includes("dung-cu"));
    assert.ok(found, "draft seed must have at least 1 dung-cu record");
  });

  test("10.14 — approved seed có ≥3 records status=approved (Story 5.1 Task 5.2)", () => {
    const seed = JSON.parse(fs.readFileSync(repoPath("baserow/seed/09-faq-entries-approved.json"), "utf8"));
    const approved = seed.rows.filter((r) => r.status === "approved");
    assert.ok(approved.length >= 3, `expected >= 3 approved rows in approved seed, got ${approved.length}`);
  });

  test("10.15 — approved seed có ≥2 TPCN records với mandatory_suffix (AC4)", () => {
    const seed = JSON.parse(fs.readFileSync(repoPath("baserow/seed/09-faq-entries-approved.json"), "utf8"));
    const tpcnRows = seed.rows.filter(
      (r) => String(r.scope ?? "").toLowerCase().includes("tpcn") && r.mandatory_suffix && r.status === "approved"
    );
    assert.ok(tpcnRows.length >= 2, `expected >= 2 approved TPCN rows with mandatory_suffix in approved seed, got ${tpcnRows.length}`);
  });
});
