// Contract — OpenClaw escalation tool plugin và guardrail (Story 5.2, AC8, AC9).
// Tests 11.1–11.10: create_escalation_case.json + trigger-guardrail.yml.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const PLUGIN_FILE = repoPath("openclaw/plugins/tools/create_escalation_case.json");
const GUARDRAIL_FILE = repoPath("openclaw/guardrails/trigger-guardrail.yml");

let plugin;
describe("OpenClaw escalation tool — plugin + guardrail (Story 5.2)", () => {
  test("11.1 — create_escalation_case.json tồn tại (AC8)", () => {
    assert.ok(fs.existsSync(PLUGIN_FILE), `plugin file not found: ${PLUGIN_FILE}`);
    const raw = fs.readFileSync(PLUGIN_FILE, "utf8");
    plugin = JSON.parse(raw);
    assert.ok(plugin, "plugin JSON parsed");
  });

  test("11.2 — plugin có field name = 'create_escalation_case' (AC8)", () => {
    assert.equal(plugin.name, "create_escalation_case", `plugin.name must be 'create_escalation_case', got '${plugin.name}'`);
  });

  test("11.3 — plugin có endpoint = '/tools/create_escalation_case' (AC8)", () => {
    assert.equal(
      plugin.endpoint,
      "/tools/create_escalation_case",
      `plugin.endpoint must be '/tools/create_escalation_case', got '${plugin.endpoint}'`
    );
  });

  test("11.4 — input_schema.required chứa tất cả 5 required fields (AC8, AC2)", () => {
    const required = plugin.input_schema?.required ?? [];
    const expected = ["pharmacy_id", "customer_id", "trigger_type", "trigger", "customer_content"];
    for (const field of expected) {
      assert.ok(required.includes(field), `input_schema.required must include '${field}'`);
    }
  });

  test("11.5 — trigger_type là enum với 9 giá trị (8 loại FR-8 + emergency) (AC8, AC1)", () => {
    const triggerType = plugin.input_schema?.properties?.trigger_type ?? {};
    const enumValues = triggerType.enum ?? [];
    const expected9 = [
      "emergency",
      "adverse_reaction",
      "out_of_range_vitals",
      "otc_red_flag",
      "otc_no_improvement",
      "medication_change",
      "drug_interaction",
      "complaint_serious",
      "ai_uncertainty"
    ];
    assert.ok(
      enumValues.length >= 9,
      `trigger_type enum must have >= 9 values, got ${enumValues.length}`
    );
    for (const v of expected9) {
      assert.ok(enumValues.includes(v), `trigger_type enum must include '${v}'`);
    }
  });

  test("11.6 — output_schema có case_id, state, created (AC8, AC2, AC4)", () => {
    const props = plugin.output_schema?.properties ?? {};
    assert.ok(props.case_id, "output_schema must have case_id");
    assert.ok(props.state, "output_schema must have state");
    assert.ok(props.created, "output_schema must have created");
  });

  test("11.7 — trigger-guardrail.yml tồn tại (AC9)", () => {
    assert.ok(fs.existsSync(GUARDRAIL_FILE), `guardrail file not found: ${GUARDRAIL_FILE}`);
  });

  test("11.8 — trigger-guardrail.yml có 'guardrail: trigger-guardrail' field (AC9)", () => {
    const src = fs.readFileSync(GUARDRAIL_FILE, "utf8");
    assert.ok(
      src.includes("guardrail: trigger-guardrail"),
      "trigger-guardrail.yml must have 'guardrail: trigger-guardrail'"
    );
  });

  test("11.9 — trigger-guardrail.yml có >= 8 rules (AC9, AC1)", () => {
    const src = fs.readFileSync(GUARDRAIL_FILE, "utf8");
    const matches = src.match(/^\s+- id:/gm) ?? [];
    assert.ok(
      matches.length >= 8,
      `trigger-guardrail.yml must have >= 8 rules, got ${matches.length}`
    );
  });

  test("11.10 — mỗi rule có action: escalate (AC9)", () => {
    const src = fs.readFileSync(GUARDRAIL_FILE, "utf8");
    const ruleBlocks = src.split(/^\s+- id:/m).slice(1);
    for (const block of ruleBlocks) {
      assert.ok(
        block.includes("action: escalate"),
        `all rules must have 'action: escalate'; rule missing it:\n${block.slice(0, 200)}`
      );
    }
  });
});
