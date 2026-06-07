// API tests — Story 2.2 (Send throttle: business hours + daily cap enforcement).
// Spawns real zalo-bridge server with mock Baserow (always returns friended customer).
// Tests 503 outside_business_hours and 429 daily_cap_exceeded endpoints.

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { startServer } from "../helpers/server.js";

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

// Shared mock Baserow — always returns a friended customer so throttle checks execute.
const MOCK_BASEROW_PORT = 31318;
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

// ── Business hours enforcement (AC1) ──────────────────────────

describe("/send outside business hours → 503 (AC1)", () => {
  const PORT = 31317;
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
        // BUSINESS_HOUR_START=0 BUSINESS_HOUR_END=0 → hour>=0 && hour<0 always false
        BUSINESS_HOUR_START: "0",
        BUSINESS_HOUR_END: "0",
        JITTER_MIN_MS: "1",
        JITTER_MAX_MS: "5",
      },
    });
  });

  after(async () => { await srv?.stop(); });

  test("POST /send with BUSINESS_HOUR_END=0 → 503 outside_business_hours", async () => {
    const res = await post(PORT, "/send", {
      pharmacy_id: "biz-hours-pharm",
      customer_phone: "0901111111",
      content: "Chào anh/chị",
    });
    assert.equal(res.status, 503);
    assert.equal(res.json?.error, "outside_business_hours");
  });

  test("response body has no queued field (no message sent)", async () => {
    const res = await post(PORT, "/send", {
      pharmacy_id: "biz-hours-pharm-2",
      customer_phone: "0901111111",
      content: "Chào anh/chị",
    });
    assert.equal(res.status, 503);
    assert.equal(res.json?.queued, undefined);
  });
});

// ── Daily cap enforcement (AC2) ───────────────────────────────

describe("/send daily cap exceeded → 429 (AC2)", () => {
  const PORT = 31319;
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
        // DAILY_SEND_CAP=0 → even first request is over cap
        DAILY_SEND_CAP: "0",
        // Ensure we're inside business hours
        BUSINESS_HOUR_START: "0",
        BUSINESS_HOUR_END: "24",
        JITTER_MIN_MS: "1",
        JITTER_MAX_MS: "5",
      },
    });
  });

  after(async () => { await srv?.stop(); });

  test("POST /send with DAILY_SEND_CAP=0 → 429 daily_cap_exceeded", async () => {
    const res = await post(PORT, "/send", {
      pharmacy_id: "daily-cap-pharm",
      customer_phone: "0901111111",
      content: "Chào anh/chị",
    });
    assert.equal(res.status, 429);
    assert.equal(res.json?.error, "daily_cap_exceeded");
    assert.equal(res.json?.pharmacy_id, "daily-cap-pharm");
  });

  test("429 response includes pharmacy_id", async () => {
    const res = await post(PORT, "/send", {
      pharmacy_id: "specific-pharm-id",
      customer_phone: "0901111111",
      content: "Chào anh/chị",
    });
    assert.equal(res.status, 429);
    assert.equal(res.json?.pharmacy_id, "specific-pharm-id");
  });
});

// ── Warmup cap enforced via HTTP (AC3) ───────────────────────

describe("/send warmup active → WARMUP_DAILY_CAP enforced → 429 (AC3)", () => {
  const PORT = 31321;
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
        // Warmup active: far-future epoch
        WARMUP_UNTIL_EPOCH_MS: "9999999999999",
        // Warmup cap = 0 → any request is over cap; regular cap = 50 (should NOT be used)
        WARMUP_DAILY_CAP: "0",
        DAILY_SEND_CAP: "50",
        BUSINESS_HOUR_START: "0",
        BUSINESS_HOUR_END: "24",
        JITTER_MIN_MS: "1",
        JITTER_MAX_MS: "5",
      },
    });
  });

  after(async () => { await srv?.stop(); });

  test("warmup active with WARMUP_DAILY_CAP=0 → 429 daily_cap_exceeded", async () => {
    const res = await post(PORT, "/send", {
      pharmacy_id: "warmup-cap-pharm",
      customer_phone: "0901111111",
      content: "Chào anh/chị",
    });
    assert.equal(res.status, 429);
    assert.equal(res.json?.error, "daily_cap_exceeded");
  });

  test("warmup cap response includes pharmacy_id", async () => {
    const res = await post(PORT, "/send", {
      pharmacy_id: "warmup-id-pharm",
      customer_phone: "0901111111",
      content: "Chào anh/chị",
    });
    assert.equal(res.status, 429);
    assert.equal(res.json?.pharmacy_id, "warmup-id-pharm");
  });
});

// ── incrementDailyCount wired into pipeline (AC2+AC5) ─────────

describe("/send increments counter — second request hits cap → 429", () => {
  const PORT = 31322;
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
        DAILY_SEND_CAP: "1",
        BUSINESS_HOUR_START: "0",
        BUSINESS_HOUR_END: "24",
        JITTER_MIN_MS: "1",
        JITTER_MAX_MS: "5",
      },
    });
  });

  after(async () => { await srv?.stop(); });

  test("first request within cap → 202", async () => {
    const res = await post(PORT, "/send", {
      pharmacy_id: "counter-pharm",
      customer_phone: "0901111111",
      content: "Chào anh/chị",
    });
    assert.equal(res.status, 202);
    assert.deepEqual(res.json, { queued: true });
  });

  test("second request exceeds cap → 429 (proves incrementDailyCount called)", async () => {
    const res = await post(PORT, "/send", {
      pharmacy_id: "counter-pharm",
      customer_phone: "0901111111",
      content: "Chào anh/chị",
    });
    assert.equal(res.status, 429);
    assert.equal(res.json?.error, "daily_cap_exceeded");
    assert.equal(res.json?.pharmacy_id, "counter-pharm");
  });
});

// ── Happy path: throttle pass → 202 (AC5) ────────────────────

describe("/send throttle pass → 202 (AC5)", () => {
  const PORT = 31320;
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
        DAILY_SEND_CAP: "50",
        BUSINESS_HOUR_START: "0",
        BUSINESS_HOUR_END: "24",
        JITTER_MIN_MS: "1",
        JITTER_MAX_MS: "5",
      },
    });
  });

  after(async () => { await srv?.stop(); });

  test("friended customer within hours and cap → 202 queued", async () => {
    const res = await post(PORT, "/send", {
      pharmacy_id: "happy-pharm",
      customer_phone: "0901111111",
      content: "Chào anh/chị",
    });
    assert.equal(res.status, 202);
    assert.deepEqual(res.json, { queued: true });
  });
});
