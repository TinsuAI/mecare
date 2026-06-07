// Contract tests — Story 2.4 (messages-client module).
// Unit tests for makeCustomerRef, createMessageRecord, updateMessageStatus, queueDeadLetter.

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  createMessageRecord,
  updateMessageStatus,
  queueDeadLetter,
  makeCustomerRef,
} from "../../zalo-bridge/src/messages-client.ts";

let savedFetch;

beforeEach(() => {
  savedFetch = globalThis.fetch;
  process.env.BASEROW_URL = "http://mock-baserow:80";
  process.env.BASEROW_TOKEN = "test-token";
  process.env.MESSAGES_TABLE_ID = "42";
});

afterEach(() => {
  globalThis.fetch = savedFetch;
  delete process.env.BASEROW_URL;
  delete process.env.BASEROW_TOKEN;
  delete process.env.MESSAGES_TABLE_ID;
});

// ── makeCustomerRef ────────────────────────────────────────────

describe("makeCustomerRef", () => {
  test("same inputs → same output (deterministic)", () => {
    const a = makeCustomerRef("pharm-1", "0901111111");
    const b = makeCustomerRef("pharm-1", "0901111111");
    assert.equal(a, b);
  });

  test("output does not contain customerPhone (PII-min)", () => {
    const ref = makeCustomerRef("pharm-1", "0901111111");
    assert.ok(!ref.includes("0901111111"));
  });

  test("output.length === 16", () => {
    const ref = makeCustomerRef("pharm-1", "0901111111");
    assert.equal(ref.length, 16);
  });
});

// ── createMessageRecord ────────────────────────────────────────

describe("createMessageRecord", () => {
  test("2xx response → returns id", async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 42 }),
    });
    const result = await createMessageRecord({
      message_id: "uuid-1",
      pharmacy_id: "pharm-1",
      customer_phone: "0901111111",
      content: "Hello",
    });
    assert.equal(result, 42);
  });

  test("non-2xx response → returns null (KHÔNG throw)", async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });
    const result = await createMessageRecord({
      message_id: "uuid-2",
      pharmacy_id: "pharm-1",
      customer_phone: "0901111111",
      content: "Hello",
    });
    assert.equal(result, null);
  });

  test("fetch throws → returns null (KHÔNG throw)", async () => {
    globalThis.fetch = async () => { throw new Error("network"); };
    const result = await createMessageRecord({
      message_id: "uuid-3",
      pharmacy_id: "pharm-1",
      customer_phone: "0901111111",
      content: "Hello",
    });
    assert.equal(result, null);
  });
});

// ── updateMessageStatus ────────────────────────────────────────

describe("updateMessageStatus", () => {
  test("2xx response → resolves without throw", async () => {
    globalThis.fetch = async () => ({ ok: true, status: 200 });
    await assert.doesNotReject(() => updateMessageStatus(100, "sent"));
  });

  test("fetch throws → does NOT throw (non-blocking)", async () => {
    globalThis.fetch = async () => { throw new Error("network"); };
    await assert.doesNotReject(() => updateMessageStatus(100, "sent"));
  });

  test("non-2xx response → does NOT throw (swallowed)", async () => {
    globalThis.fetch = async () => ({ ok: false, status: 503, text: async () => "unavailable" });
    await assert.doesNotReject(() => updateMessageStatus(100, "queued"));
  });
});

// ── queueDeadLetter ────────────────────────────────────────────

describe("queueDeadLetter", () => {
  test("rowId non-null → calls PATCH (update), not POST (create)", async () => {
    const calls = [];
    globalThis.fetch = async (url, opts) => {
      calls.push({ method: opts.method, url });
      return { ok: true, status: 200 };
    };
    await queueDeadLetter(100, {
      message_id: "uuid-dead",
      pharmacy_id: "pharm-1",
      customer_phone: "0901111111",
      content: "Hello",
      error_text: "HTTP 500",
    });
    const methods = calls.map((c) => c.method);
    assert.ok(methods.includes("PATCH"), "should call PATCH");
    assert.ok(!methods.includes("POST"), "should NOT call POST");
  });

  test("rowId null → calls POST (create) then PATCH (update)", async () => {
    const calls = [];
    globalThis.fetch = async (url, opts) => {
      calls.push({ method: opts.method, url });
      if (opts.method === "POST") {
        return { ok: true, status: 200, json: async () => ({ id: 99 }) };
      }
      return { ok: true, status: 200 };
    };
    await queueDeadLetter(null, {
      message_id: "uuid-dead-null",
      pharmacy_id: "pharm-1",
      customer_phone: "0901111111",
      content: "Hello",
      error_text: "HTTP 500",
    });
    const methods = calls.map((c) => c.method);
    assert.ok(methods.includes("POST"), "should call POST to create");
    assert.ok(methods.includes("PATCH"), "should call PATCH to update");
    assert.ok(methods.indexOf("POST") < methods.indexOf("PATCH"), "POST before PATCH");
  });

  test("fetch throws → does NOT throw (non-blocking)", async () => {
    globalThis.fetch = async () => { throw new Error("network failure"); };
    await assert.doesNotReject(() =>
      queueDeadLetter(100, {
        message_id: "uuid-dl-throw",
        pharmacy_id: "pharm-1",
        customer_phone: "0901111111",
        content: "Hello",
        error_text: "HTTP 500",
      })
    );
  });
});

// ── createMessageRecord request body ─────────────────────────────

describe("createMessageRecord — request body fields", () => {
  test("sends status=pending and customer_ref (16-char hex) in body", async () => {
    let sentBody;
    globalThis.fetch = async (url, opts) => {
      sentBody = JSON.parse(opts.body);
      return { ok: true, status: 200, json: async () => ({ id: 1 }) };
    };
    await createMessageRecord({
      message_id: "uuid-body-check",
      pharmacy_id: "pharm-body",
      customer_phone: "0901111111",
      content: "Hello body",
    });
    assert.equal(sentBody.status, "pending", "body must include status=pending");
    assert.equal(sentBody.message_id, "uuid-body-check");
    assert.equal(sentBody.pharmacy_id, "pharm-body");
    assert.equal(sentBody.content, "Hello body");
    assert.ok(
      typeof sentBody.customer_ref === "string" && sentBody.customer_ref.length === 16,
      "customer_ref must be 16-char string"
    );
    assert.ok(!sentBody.customer_ref.includes("0901111111"), "customer_ref must not contain PII");
  });
});
