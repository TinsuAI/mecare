// API E2E — Story 2.5: Session monitor & broken automation alerts.
// Ports: bridge=31335, mock-Baserow=31336, mock-openzca=31337

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { startServer, get } from "../helpers/server.js";

const BRIDGE_PORT = 31335;
const MOCK_BASEROW_PORT = 31336;
const MOCK_OPENZCA_PORT = 31337;

function post(port, path, body, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "POST",
        timeout: timeoutMs,
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

function readBody(req) {
  return new Promise((resolve) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => {
      let parsed = null;
      try { parsed = JSON.parse(buf); } catch { /* not json */ }
      resolve(parsed);
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── AC1: health-check failure ─────────────────────────────────────────────
describe("Story 2.5 AC1: health-check failure", () => {
  let bridge;
  let mockBaserow;
  let mockOpenzca;
  let eventLog = [];
  let seqCounter = 0;
  let healthzStatus = 503;

  before(async () => {
    mockBaserow = http.createServer(async (req, res) => {
      const body = await readBody(req);
      const seq = seqCounter++;
      eventLog.push({ seq, source: "baserow", method: req.method, url: req.url, body });
      res.writeHead(200, { "content-type": "application/json" });
      if (req.method === "GET") {
        res.end(JSON.stringify({ results: [{ friend_status: "friended", phone: "0901111111" }] }));
      } else {
        res.end(JSON.stringify({ id: 200 }));
      }
    });
    await new Promise((resolve) => mockBaserow.listen(MOCK_BASEROW_PORT, "127.0.0.1", resolve));

    mockOpenzca = http.createServer(async (req, res) => {
      const body = await readBody(req);
      const seq = seqCounter++;
      if (req.url === "/healthz") {
        eventLog.push({ seq, source: "openzca", url: "/healthz" });
        res.writeHead(healthzStatus, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: healthzStatus < 300 }));
      } else if (req.url === "/send") {
        eventLog.push({ seq, source: "openzca", url: "/send" });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } else if (req.url === "/alert") {
        eventLog.push({ seq, source: "alert", url: "/alert", body });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.writeHead(404);
        res.end("not found");
      }
    });
    await new Promise((resolve) => mockOpenzca.listen(MOCK_OPENZCA_PORT, "127.0.0.1", resolve));

    bridge = await startServer({
      entry: "zalo-bridge/src/index.ts",
      port: BRIDGE_PORT,
      env: {
        ZALO_BRIDGE_PORT: String(BRIDGE_PORT),
        BASEROW_URL: `http://127.0.0.1:${MOCK_BASEROW_PORT}`,
        BASEROW_TOKEN: "test",
        CUSTOMERS_TABLE_ID: "1",
        MESSAGES_TABLE_ID: "99",
        OPENZCA_URL: `http://127.0.0.1:${MOCK_OPENZCA_PORT}`,
        BUSINESS_HOUR_START: "0",
        BUSINESS_HOUR_END: "24",
        JITTER_MIN_MS: "1",
        JITTER_MAX_MS: "5",
        DAILY_SEND_CAP: "50",
        ALERT_WEBHOOK_URL: `http://127.0.0.1:${MOCK_OPENZCA_PORT}/alert`,
        RISK_ERROR_COUNT_THRESHOLD: "99",
        SESSION_HEALTH_INTERVAL_MS: "100",
      },
    });

    // Wait for at least one polling cycle (100ms interval + buffer)
    await sleep(250);
  });

  after(async () => {
    await bridge?.stop();
    await new Promise((resolve) => mockBaserow?.close(resolve));
    await new Promise((resolve) => mockOpenzca?.close(resolve));
  });

  test("7.1: AC1-a — health_fail → state=lost, POST /send returns queued (no openzca /send call)", async () => {
    const stateRes = await get(BRIDGE_PORT, "/session-state");
    assert.equal(stateRes.status, 200);
    assert.equal(stateRes.json?.state, "lost", "health-check fail should put session in lost state");

    const prevSendCount = eventLog.filter((e) => e.source === "openzca" && e.url === "/send").length;

    const sendRes = await post(BRIDGE_PORT, "/send", {
      pharmacy_id: "pharm-hc1",
      customer_phone: "0901111111",
      content: "Should be dead-lettered",
    });
    assert.equal(sendRes.status, 202);
    assert.ok(sendRes.json?.queued === true, "session lost → should return queued:true");

    const afterSendCount = eventLog.filter((e) => e.source === "openzca" && e.url === "/send").length;
    assert.equal(afterSendCount, prevSendCount, "openzca /send must NOT be called when session is lost");
  });

  test("7.2: AC1-b — alert fired exactly once on health_fail transition (idempotent)", async () => {
    // By now, at least 2 polling cycles have fired (250ms sleep + test 7.1 duration > 200ms)
    // but only 1 alert should have been sent (state=lost is idempotent)
    await sleep(150); // ensure another polling cycle completes while still lost

    const alertEvents = eventLog.filter((e) => e.source === "alert" && e.url === "/alert");
    assert.equal(alertEvents.length, 1, "session.lost alert must be fired exactly once on transition");
    assert.equal(alertEvents[0].body?.event, "session.lost");
    assert.equal(alertEvents[0].body?.service, "zalo-bridge");
    assert.ok(typeof alertEvents[0].body?.reason === "string", "alert must have reason field");
  });
});

// ─── AC2 + AC3 + regression: consecutive send failures ─────────────────────
describe("Story 2.5 AC2+AC3+regression: consecutive send failures", () => {
  let bridge;
  let mockBaserow;
  let mockOpenzca;
  let eventLog = [];
  let seqCounter = 0;
  let openzcaSendStatus = 200;

  before(async () => {
    mockBaserow = http.createServer(async (req, res) => {
      const body = await readBody(req);
      const seq = seqCounter++;
      eventLog.push({ seq, source: "baserow", method: req.method, url: req.url, body });
      res.writeHead(200, { "content-type": "application/json" });
      if (req.method === "GET") {
        res.end(JSON.stringify({ results: [{ friend_status: "friended", phone: "0901111111" }] }));
      } else {
        res.end(JSON.stringify({ id: 201 }));
      }
    });
    await new Promise((resolve) => mockBaserow.listen(MOCK_BASEROW_PORT, "127.0.0.1", resolve));

    mockOpenzca = http.createServer(async (req, res) => {
      const body = await readBody(req);
      const seq = seqCounter++;
      if (req.url === "/healthz") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } else if (req.url === "/send") {
        eventLog.push({ seq, source: "openzca", url: "/send" });
        res.writeHead(openzcaSendStatus, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: openzcaSendStatus < 300 }));
      } else if (req.url === "/alert") {
        eventLog.push({ seq, source: "alert", url: "/alert", body });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.writeHead(404);
        res.end("not found");
      }
    });
    await new Promise((resolve) => mockOpenzca.listen(MOCK_OPENZCA_PORT, "127.0.0.1", resolve));

    bridge = await startServer({
      entry: "zalo-bridge/src/index.ts",
      port: BRIDGE_PORT,
      env: {
        ZALO_BRIDGE_PORT: String(BRIDGE_PORT),
        BASEROW_URL: `http://127.0.0.1:${MOCK_BASEROW_PORT}`,
        BASEROW_TOKEN: "test",
        CUSTOMERS_TABLE_ID: "1",
        MESSAGES_TABLE_ID: "99",
        OPENZCA_URL: `http://127.0.0.1:${MOCK_OPENZCA_PORT}`,
        BUSINESS_HOUR_START: "0",
        BUSINESS_HOUR_END: "24",
        JITTER_MIN_MS: "1",
        JITTER_MAX_MS: "5",
        DAILY_SEND_CAP: "50",
        ALERT_WEBHOOK_URL: `http://127.0.0.1:${MOCK_OPENZCA_PORT}/alert`,
        RISK_ERROR_COUNT_THRESHOLD: "99",
        SESSION_HEALTH_INTERVAL_MS: "3600000",
      },
    });
  });

  after(async () => {
    await bridge?.stop();
    await new Promise((resolve) => mockBaserow?.close(resolve));
    await new Promise((resolve) => mockOpenzca?.close(resolve));
  });

  test("7.3: AC2-a — ≥3 consecutive send failures → state=lost; 4th send short-circuits", async () => {
    eventLog = [];
    seqCounter = 0;
    openzcaSendStatus = 500;

    for (let i = 0; i < 3; i++) {
      await post(BRIDGE_PORT, "/send", {
        pharmacy_id: "pharm-sf1",
        customer_phone: "0901111111",
        content: `Fail message ${i + 1}`,
      });
    }

    const stateRes = await get(BRIDGE_PORT, "/session-state");
    assert.equal(stateRes.json?.state, "lost", "3 consecutive failures should mark session as lost");
    assert.equal(stateRes.json?.consecutive_errors, 3);

    const prevSendCount = eventLog.filter((e) => e.source === "openzca" && e.url === "/send").length;

    const fourthRes = await post(BRIDGE_PORT, "/send", {
      pharmacy_id: "pharm-sf1",
      customer_phone: "0901111111",
      content: "4th message should short-circuit",
    });
    assert.equal(fourthRes.status, 202);
    assert.ok(fourthRes.json?.queued === true, "4th send when lost should return queued:true");

    const afterSendCount = eventLog.filter((e) => e.source === "openzca" && e.url === "/send").length;
    assert.equal(afterSendCount, prevSendCount, "4th send must NOT call openzca when session is lost");
  });

  test("7.4: AC2-b — alert reason field not empty, contains error text from openzca", async () => {
    // State is still lost from test 7.3
    await sleep(50); // fire-and-forget alerts should have arrived

    const alertEvents = eventLog.filter((e) => e.source === "alert" && e.url === "/alert");
    assert.ok(alertEvents.length >= 1, "at least one session.lost alert should have been fired");

    const sessionLostAlerts = alertEvents.filter((e) => e.body?.event === "session.lost");
    assert.ok(sessionLostAlerts.length >= 1, "session.lost alert must have been fired");

    // session-monitor fires with reason=lastError (e.g. 'HTTP 500') or send.ts fires with 'pharmacy_id:error'
    const hasNonEmptyReason = sessionLostAlerts.some((e) => {
      const r = e.body?.reason ?? "";
      return typeof r === "string" && r.length > 0;
    });
    assert.ok(hasNonEmptyReason, "at least one alert must have a non-empty reason field");

    const hasErrorText = sessionLostAlerts.some((e) =>
      (e.body?.reason ?? "").includes("500")
    );
    assert.ok(hasErrorText, "alert reason should include openzca error text (HTTP 500)");
  });

  test("7.5: AC2-c — dead-letter preserved in Baserow (Baserow PATCH queued called)", async () => {
    // 3 failed messages + 1 short-circuited = 4 messages dead-lettered
    const queuedPatches = eventLog.filter(
      (e) => e.source === "baserow" && e.method === "PATCH" && e.body?.status === "queued"
    );
    assert.ok(queuedPatches.length >= 3, "each failed message should have a Baserow PATCH queued call");
  });

  test("7.6: AC3 — POST /session-reset → state=healthy; next /send calls openzca", async () => {
    openzcaSendStatus = 200;
    eventLog = [];
    seqCounter = 0;

    const resetRes = await post(BRIDGE_PORT, "/session-reset", {});
    assert.equal(resetRes.status, 200);
    assert.ok(resetRes.json?.reset === true);
    assert.equal(resetRes.json?.state, "healthy");

    const stateRes = await get(BRIDGE_PORT, "/session-state");
    assert.equal(stateRes.json?.state, "healthy");
    assert.equal(stateRes.json?.consecutive_errors, 0);

    const sendRes = await post(BRIDGE_PORT, "/send", {
      pharmacy_id: "pharm-reset1",
      customer_phone: "0901111111",
      content: "After reset, should actually send",
    });
    assert.equal(sendRes.status, 202);
    assert.ok(sendRes.json?.sent === true, "after reset, send should reach openzca and succeed");

    const sendCalls = eventLog.filter((e) => e.source === "openzca" && e.url === "/send");
    assert.ok(sendCalls.length >= 1, "openzca /send must be called after session reset");
  });

  test("7.7: regression — 2 failures + 1 success keeps state healthy", async () => {
    // Reset first (state was healthy after 7.6, but let's ensure clean)
    await post(BRIDGE_PORT, "/session-reset", {});

    eventLog = [];
    seqCounter = 0;

    // 2 failures
    openzcaSendStatus = 500;
    for (let i = 0; i < 2; i++) {
      await post(BRIDGE_PORT, "/send", {
        pharmacy_id: "pharm-reg",
        customer_phone: "0901111111",
        content: `Fail ${i + 1}`,
      });
    }

    // 1 success
    openzcaSendStatus = 200;
    await post(BRIDGE_PORT, "/send", {
      pharmacy_id: "pharm-reg",
      customer_phone: "0901111111",
      content: "Success resets counter",
    });

    const stateRes = await get(BRIDGE_PORT, "/session-state");
    assert.equal(stateRes.json?.state, "healthy", "2 fails + 1 success should not trigger lost state");
    assert.equal(stateRes.json?.consecutive_errors, 0, "send_success should reset consecutive_errors to 0");
  });
});
