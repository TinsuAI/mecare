// Contract — n8n workflow structure cho MC-Relay-Watchdog (Story 5.3, AC8).
// Tests 12.1–12.13: file tồn tại, Cron Trigger, Baserow query node, reminder send node, workflow name,
//   business hours guard, SLA cutoff logic, full node inventory, connection chain.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const WATCHDOG_FILE = repoPath("n8n/workflows/MC-Relay-Watchdog.json");

let watchdog;
describe("MC-Relay-Watchdog structure (Story 5.3 AC8)", () => {
  test("12.1 — MC-Relay-Watchdog.json tồn tại (AC8)", () => {
    const exists = fs.existsSync(WATCHDOG_FILE);
    assert.ok(exists, `MC-Relay-Watchdog.json not found at ${WATCHDOG_FILE}`);
    const raw = fs.readFileSync(WATCHDOG_FILE, "utf8");
    watchdog = JSON.parse(raw);
    assert.ok(watchdog, "MC-Relay-Watchdog.json JSON parsed");
  });

  test("12.2 — workflow name là 'MC-Relay-Watchdog' (AC8 naming)", () => {
    assert.equal(
      watchdog.name,
      "MC-Relay-Watchdog",
      `workflow name must be 'MC-Relay-Watchdog', got '${watchdog.name}'`
    );
  });

  test("12.3 — có Cron Trigger (scheduleTrigger) node (AC8 30-phút trigger)", () => {
    const found = watchdog.nodes.some(
      (n) => n.type === "n8n-nodes-base.scheduleTrigger"
    );
    assert.ok(found, "MC-Relay-Watchdog missing scheduleTrigger (Cron) node");
  });

  test("12.4 — có HTTP GET node query Baserow cho overdue cases (AC8 SLA query)", () => {
    const found = watchdog.nodes.some(
      (n) =>
        n.type === "n8n-nodes-base.httpRequest" &&
        n.parameters?.method === "GET" &&
        (n.name?.toLowerCase().includes("query") || n.name?.toLowerCase().includes("overdue"))
    );
    assert.ok(found, "MC-Relay-Watchdog missing Baserow query (GET) node for overdue cases");
  });

  test("12.5 — có HTTP POST node gửi reminder cho pharmacist (AC8 reminder send)", () => {
    const found = watchdog.nodes.some(
      (n) =>
        n.type === "n8n-nodes-base.httpRequest" &&
        n.parameters?.method === "POST" &&
        (n.name?.toLowerCase().includes("reminder") || n.name?.toLowerCase().includes("send"))
    );
    assert.ok(found, "MC-Relay-Watchdog missing Send Reminder HTTP POST node");
  });

  // ─── Gap-fill: Missing node inventory (Story 5.3 QA) ───
  test("12.6 — 'Guard: Is Business Hours' code node tồn tại (AC8 giờ làm việc check)", () => {
    const found = watchdog.nodes.some(
      (n) => n.name === "Guard: Is Business Hours" && n.type === "n8n-nodes-base.code"
    );
    assert.ok(found, "MC-Relay-Watchdog missing 'Guard: Is Business Hours' code node");
  });

  test("12.7 — 'Guard: In Business Hours' if node tồn tại (AC8 ngoài giờ skip)", () => {
    const found = watchdog.nodes.some(
      (n) => n.name === "Guard: In Business Hours" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "MC-Relay-Watchdog missing 'Guard: In Business Hours' if node");
  });

  test("12.8 — 'Compute SLA Cutoff' code node tồn tại (AC8 SLA timestamp)", () => {
    const found = watchdog.nodes.some(
      (n) => n.name === "Compute SLA Cutoff" && n.type === "n8n-nodes-base.code"
    );
    assert.ok(found, "MC-Relay-Watchdog missing 'Compute SLA Cutoff' code node");
  });

  test("12.9 — 'Guard: Has Overdue Cases' if node tồn tại (AC8 empty result guard)", () => {
    const found = watchdog.nodes.some(
      (n) => n.name === "Guard: Has Overdue Cases" && n.type === "n8n-nodes-base.if"
    );
    assert.ok(found, "MC-Relay-Watchdog missing 'Guard: Has Overdue Cases' if node");
  });

  test("12.10 — 'Expand Overdue Cases' code node tồn tại (AC8 iterate cases)", () => {
    const found = watchdog.nodes.some(
      (n) => n.name === "Expand Overdue Cases" && n.type === "n8n-nodes-base.code"
    );
    assert.ok(found, "MC-Relay-Watchdog missing 'Expand Overdue Cases' code node");
  });

  // ─── Gap-fill: Content / behavior tests ───
  test("12.11 — Compute SLA Cutoff code tham chiếu RELAY_SLA_MINUTES env var (AC8 configurable SLA)", () => {
    const node = watchdog.nodes.find((n) => n.name === "Compute SLA Cutoff");
    const code = node?.parameters?.jsCode || "";
    assert.ok(
      code.includes("RELAY_SLA_MINUTES"),
      "Compute SLA Cutoff must read RELAY_SLA_MINUTES from process.env"
    );
  });

  test("12.12 — Guard: Is Business Hours code chứa isBusinessHourGmt7 inline (AC8 no local import)", () => {
    const node = watchdog.nodes.find((n) => n.name === "Guard: Is Business Hours");
    const code = node?.parameters?.jsCode || "";
    assert.ok(
      code.includes("isBusinessHour"),
      "Guard: Is Business Hours must contain inline isBusinessHourGmt7 logic (no local require)"
    );
  });

  // ─── Gap-fill: Connection chain ───
  test("12.13 — Cron Trigger → Guard: Is Business Hours (AC8 entry chain)", () => {
    const next = watchdog.connections?.["Cron Trigger"]?.main?.[0]?.[0]?.node;
    assert.equal(
      next,
      "Guard: Is Business Hours",
      `Cron Trigger must connect to 'Guard: Is Business Hours', got '${next}'`
    );
  });
});
