// Contract tests — Story 2.1 (Opt-in Gate).
// Unit tests for checkOptIn: mock globalThis.fetch, zero network.
// Integration tests for /send endpoint via real server spawn.
import { test, describe, beforeEach, before, after } from "node:test";
import assert from "node:assert/strict";
import { checkOptIn } from "../../zalo-bridge/src/opt-in-gate.ts";
import { startServer } from "../helpers/server.js";
import http from "node:http";

// ── helpers ──────────────────────────────────────────────────

function mockBaserowRow(friendStatus) {
  return {
    ok: true,
    json: async () => ({
      results: [{ friend_status: { value: friendStatus }, phone: "0901234567" }],
    }),
  };
}

function mockBaserowEmpty() {
  return {
    ok: true,
    json: async () => ({ results: [] }),
  };
}

function mockFetch(impl) {
  globalThis.fetch = impl;
}

function post(port, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      { host: "127.0.0.1", port, path, method: "POST", timeout: 4000,
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } },
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

// ── unit contract: checkOptIn ─────────────────────────────────

describe("checkOptIn — opt-in gate unit contract", () => {
  beforeEach(() => {
    process.env.BASEROW_URL = "http://baserow-test:80";
    process.env.BASEROW_TOKEN = "test-token";
    process.env.CUSTOMERS_TABLE_ID = "999";
  });

  test("friend_status=none → blocked opt_in_required", async () => {
    mockFetch(async () => mockBaserowRow("none"));
    const result = await checkOptIn("tructam", "0901111111");
    assert.deepEqual(result, { blocked: true, reason: "opt_in_required", friend_status: "none" });
  });

  test("friend_status=pending → blocked opt_in_required", async () => {
    mockFetch(async () => mockBaserowRow("pending"));
    const result = await checkOptIn("tructam", "0902222222");
    assert.deepEqual(result, { blocked: true, reason: "opt_in_required", friend_status: "pending" });
  });

  test("friend_status=declined → blocked opt_in_required", async () => {
    mockFetch(async () => mockBaserowRow("declined"));
    const result = await checkOptIn("tructam", "0903333333");
    assert.deepEqual(result, { blocked: true, reason: "opt_in_required", friend_status: "declined" });
  });

  test("friend_status=friended → allowed (blocked: false)", async () => {
    mockFetch(async () => mockBaserowRow("friended"));
    const result = await checkOptIn("tructam", "0904444444");
    assert.deepEqual(result, { blocked: false });
  });

  test("Baserow 0 rows → blocked customer_not_found", async () => {
    mockFetch(async () => mockBaserowEmpty());
    const result = await checkOptIn("tructam", "0905555555");
    assert.deepEqual(result, { blocked: true, reason: "customer_not_found" });
  });

  test("fetch throws → blocked lookup_error (fail-closed)", async () => {
    mockFetch(async () => { throw new Error("network timeout"); });
    const result = await checkOptIn("tructam", "0906666666");
    assert.equal(result.blocked, true);
    assert.equal(result.reason, "lookup_error");
    assert.ok(result.error, "error message must be present");
  });

  test("Baserow HTTP 500 → blocked lookup_error (fail-closed)", async () => {
    mockFetch(async () => ({ ok: false, status: 500 }));
    const result = await checkOptIn("tructam", "0907777777");
    assert.equal(result.blocked, true);
    assert.equal(result.reason, "lookup_error");
  });
});

// ── integration: /send HTTP endpoint ─────────────────────────

const PORT = 31302;
let srv;

describe("/send endpoint integration (Story 2.1 AC#1,#2,#6)", () => {
  before(async () => {
    srv = await startServer({
      entry: "zalo-bridge/src/index.ts",
      port: PORT,
      env: {
        ZALO_BRIDGE_PORT: String(PORT),
        BASEROW_URL: "http://127.0.0.1:19999",
        BASEROW_TOKEN: "test",
        CUSTOMERS_TABLE_ID: "1",
      },
    });
  });
  after(async () => { await srv?.stop(); });

  test("missing fields → 400 missing_fields", async () => {
    const res = await post(PORT, "/send", { pharmacy_id: "tructam" });
    assert.equal(res.status, 400);
    assert.equal(res.json.error, "missing_fields");
    assert.deepEqual(res.json.required, ["pharmacy_id", "customer_phone", "content"]);
  });

  test("invalid JSON body → 400 invalid_json", async () => {
    const result = await new Promise((resolve, reject) => {
      const req = http.request(
        { host: "127.0.0.1", port: PORT, path: "/send", method: "POST", timeout: 4000,
          headers: { "content-type": "application/json" } },
        (res) => {
          let buf = "";
          res.on("data", (c) => (buf += c));
          res.on("end", () => {
            let json; try { json = JSON.parse(buf); } catch { /* */ }
            resolve({ status: res.statusCode, json });
          });
        }
      );
      req.on("error", reject);
      req.end("not-json{{");
    });
    assert.equal(result.status, 400);
    assert.equal(result.json.error, "invalid_json");
  });

  test("blocked customer (Baserow unreachable) → 403 blocked lookup_error", async () => {
    // BASEROW_URL points to non-existent port → fetch throws → fail-closed → 403
    const res = await post(PORT, "/send", {
      pharmacy_id: "tructam",
      customer_phone: "0909090909",
      content: "Xin chào",
    });
    assert.equal(res.status, 403);
    assert.equal(res.json.blocked, true);
  });
});
