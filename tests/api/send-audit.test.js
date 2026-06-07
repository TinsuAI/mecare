// API E2E — Story 2.4: audit-first + retry/queue for Zalo sends.
// 3 mock servers: bridge (spawned), mock-Baserow (31333), mock-openzca (31334).

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { startServer } from "../helpers/server.js";

const BRIDGE_PORT = 31332;
const MOCK_BASEROW_PORT = 31333;
const MOCK_OPENZCA_PORT = 31334;

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

describe("Story 2.4: audit-first + retry + dead-letter", () => {
  let bridge;
  let mockBaserow;
  let mockOpenzca;

  // Shared state for mock servers — reset per test
  let eventLog = [];
  let seqCounter = 0;
  let openzcaSendStatus = 200;

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

  before(async () => {
    mockBaserow = http.createServer(async (req, res) => {
      const body = await readBody(req);
      const seq = seqCounter++;
      eventLog.push({ seq, source: "baserow", method: req.method, url: req.url, body });

      res.writeHead(200, { "content-type": "application/json" });
      if (req.method === "GET") {
        res.end(JSON.stringify({ results: [{ friend_status: "friended", phone: "0901111111" }] }));
      } else {
        res.end(JSON.stringify({ id: 100 }));
      }
    });
    await new Promise((resolve) => mockBaserow.listen(MOCK_BASEROW_PORT, "127.0.0.1", resolve));

    mockOpenzca = http.createServer(async (req, res) => {
      const body = await readBody(req);
      const seq = seqCounter++;

      if (req.url === "/send") {
        eventLog.push({ seq, source: "openzca", url: "/send" });
        res.writeHead(openzcaSendStatus, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: openzcaSendStatus < 300 }));
      } else if (req.url === "/alert") {
        eventLog.push({ seq, source: "openzca", url: "/alert", body });
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
      },
    });
  });

  after(async () => {
    await bridge?.stop();
    await new Promise((resolve) => mockBaserow?.close(resolve));
    await new Promise((resolve) => mockOpenzca?.close(resolve));
  });

  test("AC1: audit-first — Baserow POST pending before openzca /send", async () => {
    eventLog = [];
    seqCounter = 0;
    openzcaSendStatus = 200;

    const res = await post(BRIDGE_PORT, "/send", {
      pharmacy_id: "pharm-ac1",
      customer_phone: "0901111111",
      content: "Test audit-first",
    });

    assert.equal(res.status, 202);
    assert.ok(res.json.sent === true, "should be sent=true in stub mode");
    assert.ok(typeof res.json.message_id === "string", "should include message_id");

    const baserowPost = eventLog.find(
      (e) => e.source === "baserow" && e.method === "POST" && e.body?.status === "pending"
    );
    assert.ok(baserowPost, "Baserow should receive POST with status=pending");

    const openzcaSend = eventLog.find((e) => e.source === "openzca" && e.url === "/send");
    assert.ok(openzcaSend, "openzca should receive /send call");

    assert.ok(
      baserowPost.seq < openzcaSend.seq,
      `Baserow POST (seq=${baserowPost.seq}) must precede openzca /send (seq=${openzcaSend.seq})`
    );

    const baserowPatch = eventLog.find(
      (e) => e.source === "baserow" && e.method === "PATCH" && e.body?.status === "sent"
    );
    assert.ok(baserowPatch, "Baserow should receive PATCH with status=sent after success");
  });

  test("AC2: 3 retries then dead-letter + session.lost alert", async () => {
    eventLog = [];
    seqCounter = 0;
    openzcaSendStatus = 500;

    const res = await post(BRIDGE_PORT, "/send", {
      pharmacy_id: "pharm-ac2",
      customer_phone: "0901111111",
      content: "Test retry dead-letter",
    });

    openzcaSendStatus = 200;

    // Wait for fire-and-forget alert to arrive at mock server.
    await new Promise((r) => setTimeout(r, 100));

    assert.equal(res.status, 202);
    assert.ok(res.json.queued === true, "should be queued=true after 3 failed retries");
    assert.ok(typeof res.json.message_id === "string", "should include message_id");

    const sendCalls = eventLog.filter((e) => e.source === "openzca" && e.url === "/send");
    assert.equal(sendCalls.length, 3, "openzca /send should be called exactly 3 times");

    const queuedPatch = eventLog.find(
      (e) => e.source === "baserow" && e.method === "PATCH" && e.body?.status === "queued"
    );
    assert.ok(queuedPatch, "Baserow should receive PATCH with status=queued on dead-letter");

    const alertCall = eventLog.find((e) => e.source === "openzca" && e.url === "/alert");
    assert.ok(alertCall, "session.lost alert should be fired");
    assert.equal(alertCall.body?.event, "session.lost");
    assert.equal(alertCall.body?.service, "zalo-bridge");
    assert.ok(typeof alertCall.body?.message_id === "string");
    assert.equal(alertCall.body?.pharmacy_id, "pharm-ac2", "alert body must include pharmacy_id");
  });

  test("AC3: idempotent — exactly one POST and one PATCH per send", async () => {
    eventLog = [];
    seqCounter = 0;
    openzcaSendStatus = 200;

    const res = await post(BRIDGE_PORT, "/send", {
      pharmacy_id: "pharm-ac3",
      customer_phone: "0901111111",
      content: "Test idempotent",
    });

    assert.equal(res.status, 202);
    assert.ok(res.json.sent === true);

    const creates = eventLog.filter((e) => e.source === "baserow" && e.method === "POST");
    assert.equal(creates.length, 1, "should create exactly one Messages record");

    const sentPatches = eventLog.filter(
      (e) => e.source === "baserow" && e.method === "PATCH" && e.body?.status === "sent"
    );
    assert.equal(sentPatches.length, 1, "should have exactly one status=sent PATCH");
  });

  test("400 on missing required fields", async () => {
    const res = await post(BRIDGE_PORT, "/send", {});
    assert.equal(res.status, 400);
    assert.equal(res.json?.error, "missing_fields");
    assert.ok(Array.isArray(res.json?.required), "response should list required fields");
  });

  test("400 when only some fields present", async () => {
    const res = await post(BRIDGE_PORT, "/send", { pharmacy_id: "pharm-x" });
    assert.equal(res.status, 400);
    assert.equal(res.json?.error, "missing_fields");
  });
});
