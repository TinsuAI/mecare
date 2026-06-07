// API tests — Story 2.3 (risk-monitor: /risk-state, /risk-report, /risk-resume, /send 503 when paused).
// Spawns real zalo-bridge server. Tests 6 ACs via HTTP.

import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { startServer, get } from "../helpers/server.js";

function post(port, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "POST",
        timeout: 8000,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          let json;
          try { json = JSON.parse(buf); } catch { /* not json */ }
          resolve({ status: res.statusCode, json, body: buf });
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("request timeout")));
    req.on("error", reject);
    req.end(payload);
  });
}

// ── Shared mock Baserow ────────────────────────────────────────
const MOCK_BASEROW_PORT = 31324;
let mockBaserowSrv;

before(async () => {
  mockBaserowSrv = http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        results: [{ friend_status: { value: "friended" }, phone: "0901111111" }],
      })
    );
  });
  await new Promise((resolve) => mockBaserowSrv.listen(MOCK_BASEROW_PORT, "127.0.0.1", resolve));
});

after(async () => {
  await new Promise((resolve) => mockBaserowSrv.close(resolve));
});

// ── GET /risk-state schema (AC5) ──────────────────────────────

describe("GET /risk-state → 200 correct schema (AC5)", () => {
  const PORT = 31323;
  let srv;

  before(async () => {
    srv = await startServer({
      entry: "zalo-bridge/src/index.ts",
      port: PORT,
      env: {
        ZALO_BRIDGE_PORT: String(PORT),
        BASEROW_URL: `http://127.0.0.1:${MOCK_BASEROW_PORT}`,
        BASEROW_TOKEN: "test",
        CUSTOMERS_TABLE_ID: "1",
        RISK_WINDOW_MINUTES: "60",
      },
    });
  });

  after(async () => { await srv.stop(); });

  test("returns 200 with required schema fields", async () => {
    const { status, json } = await get(PORT, "/risk-state");
    assert.equal(status, 200);
    assert.ok("state" in json);
    assert.ok("signal_counts" in json);
    assert.ok("block" in json.signal_counts);
    assert.ok("spam_report" in json.signal_counts);
    assert.ok("send_error" in json.signal_counts);
    assert.ok("window_minutes" in json);
    assert.ok("since_epoch_ms" in json);
    assert.equal(json.state, "normal");
  });
});

// ── POST /risk-report (AC6) ───────────────────────────────────

describe("POST /risk-report — valid and invalid signals (AC6)", () => {
  const PORT = 31325;
  let srv;

  before(async () => {
    srv = await startServer({
      entry: "zalo-bridge/src/index.ts",
      port: PORT,
      env: {
        ZALO_BRIDGE_PORT: String(PORT),
        BASEROW_URL: `http://127.0.0.1:${MOCK_BASEROW_PORT}`,
        BASEROW_TOKEN: "test",
        CUSTOMERS_TABLE_ID: "1",
        RISK_BLOCK_COUNT_THRESHOLD: "100",
        RISK_ERROR_COUNT_THRESHOLD: "100",
      },
    });
  });

  after(async () => { await srv.stop(); });

  test("valid block signal → 200 { recorded: true }", async () => {
    const { status, json } = await post(PORT, "/risk-report", { signal_type: "block" });
    assert.equal(status, 200);
    assert.equal(json.recorded, true);
    assert.ok("state" in json);
  });

  test("valid spam_report → 200", async () => {
    const { status, json } = await post(PORT, "/risk-report", { signal_type: "spam_report" });
    assert.equal(status, 200);
    assert.equal(json.recorded, true);
  });

  test("valid send_error → 200", async () => {
    const { status, json } = await post(PORT, "/risk-report", { signal_type: "send_error" });
    assert.equal(status, 200);
    assert.equal(json.recorded, true);
  });

  test("invalid signal_type 'unknown' → 400", async () => {
    const { status, json } = await post(PORT, "/risk-report", { signal_type: "unknown" });
    assert.equal(status, 400);
    assert.equal(json.error, "invalid_signal_type");
  });

  test("missing signal_type → 400", async () => {
    const { status, json } = await post(PORT, "/risk-report", {});
    assert.equal(status, 400);
    assert.equal(json.error, "invalid_signal_type");
  });
});

// ── POST /risk-resume (AC4) ───────────────────────────────────

describe("POST /risk-resume — manual resume from paused (AC4)", () => {
  const PORT = 31326;
  let srv;

  before(async () => {
    srv = await startServer({
      entry: "zalo-bridge/src/index.ts",
      port: PORT,
      env: {
        ZALO_BRIDGE_PORT: String(PORT),
        BASEROW_URL: `http://127.0.0.1:${MOCK_BASEROW_PORT}`,
        BASEROW_TOKEN: "test",
        CUSTOMERS_TABLE_ID: "1",
        RISK_BLOCK_COUNT_THRESHOLD: "2",
        RISK_ERROR_COUNT_THRESHOLD: "100",
        RISK_AUTO_RESUME: "false",
      },
    });
  });

  after(async () => { await srv.stop(); });

  test("inject 2 block signals → paused → POST /risk-resume → normal", async () => {
    // Trigger pause
    await post(PORT, "/risk-report", { signal_type: "block" });
    await post(PORT, "/risk-report", { signal_type: "block" });

    // Verify paused
    const stateBeforeResume = await get(PORT, "/risk-state");
    assert.equal(stateBeforeResume.json.state, "paused");

    // Resume
    const { status, json } = await post(PORT, "/risk-resume", {});
    assert.equal(status, 200);
    assert.equal(json.resumed, true);
    assert.equal(json.state, "normal");

    // Verify normal
    const stateAfterResume = await get(PORT, "/risk-state");
    assert.equal(stateAfterResume.json.state, "normal");
  });
});

// ── POST /send → 503 when paused (AC1) ───────────────────────

describe("POST /send → 503 risk_throttled when state=paused (AC1)", () => {
  const PORT = 31327;
  let srv;

  before(async () => {
    srv = await startServer({
      entry: "zalo-bridge/src/index.ts",
      port: PORT,
      env: {
        ZALO_BRIDGE_PORT: String(PORT),
        BASEROW_URL: `http://127.0.0.1:${MOCK_BASEROW_PORT}`,
        BASEROW_TOKEN: "test",
        CUSTOMERS_TABLE_ID: "1",
        RISK_BLOCK_COUNT_THRESHOLD: "2",
        RISK_ERROR_COUNT_THRESHOLD: "100",
        BUSINESS_HOUR_START: "0",
        BUSINESS_HOUR_END: "24",
        JITTER_MIN_MS: "1",
        JITTER_MAX_MS: "5",
      },
    });
  });

  after(async () => { await srv.stop(); });

  test("/send returns 503 risk_throttled when risk state is paused", async () => {
    // Inject signals to trigger pause
    await post(PORT, "/risk-report", { signal_type: "block" });
    await post(PORT, "/risk-report", { signal_type: "block" });

    // Verify paused
    const stateCheck = await get(PORT, "/risk-state");
    assert.equal(stateCheck.json.state, "paused");

    // /send should return 503
    const { status, json } = await post(PORT, "/send", {
      pharmacy_id: "pharmacy-001",
      customer_phone: "0901111111",
      content: "Chào anh/chị",
    });
    assert.equal(status, 503);
    assert.equal(json.error, "risk_throttled");
    assert.equal(json.state, "paused");
  });
});
