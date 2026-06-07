// Contract — n8n workflow structure cho MC-Relay-Watchdog (Story 5.3, AC8).
// Tests 12.1–12.5: file tồn tại, Cron Trigger, Baserow query node, reminder send node, workflow name.
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
});
