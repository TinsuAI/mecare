// Contract tests — Story 2.4 (openzca-client module).
// Unit tests for sendViaOpenzca: stub mode, 2xx, 5xx, fetch throw.

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sendViaOpenzca } from "../../zalo-bridge/src/openzca-client.ts";

let savedFetch;

beforeEach(() => {
  savedFetch = globalThis.fetch;
  delete process.env.OPENZCA_URL;
});

afterEach(() => {
  globalThis.fetch = savedFetch;
});

// ── sendViaOpenzca ─────────────────────────────────────────────

describe("sendViaOpenzca", () => {
  test("stub mode (OPENZCA_URL unset) → { ok: true }, no fetch call", async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => { fetchCalled = true; return { ok: true, status: 200 }; };
    const result = await sendViaOpenzca("pharm-1", "0901111111", "Hello");
    assert.deepEqual(result, { ok: true });
    assert.ok(!fetchCalled, "fetch should not be called in stub mode");
  });

  test("2xx response → { ok: true }", async () => {
    process.env.OPENZCA_URL = "http://mock-openzca:3000";
    globalThis.fetch = async () => ({ ok: true, status: 200 });
    const result = await sendViaOpenzca("pharm-1", "0901111111", "Hello");
    assert.deepEqual(result, { ok: true });
    delete process.env.OPENZCA_URL;
  });

  test("5xx response → { ok: false, error: 'HTTP 500' }", async () => {
    process.env.OPENZCA_URL = "http://mock-openzca:3000";
    globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => "err" });
    const result = await sendViaOpenzca("pharm-1", "0901111111", "Hello");
    assert.deepEqual(result, { ok: false, error: "HTTP 500" });
    delete process.env.OPENZCA_URL;
  });

  test("fetch throws → { ok: false, error: 'ETIMEDOUT' } (KHÔNG throw)", async () => {
    process.env.OPENZCA_URL = "http://mock-openzca:3000";
    globalThis.fetch = async () => { throw new Error("ETIMEDOUT"); };
    const result = await sendViaOpenzca("pharm-1", "0901111111", "Hello");
    assert.deepEqual(result, { ok: false, error: "ETIMEDOUT" });
    delete process.env.OPENZCA_URL;
  });
});
