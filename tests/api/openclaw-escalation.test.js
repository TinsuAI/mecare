// API — POST /tools/create_escalation_case endpoint (Story 5.2, AC2, AC4).
// Tests the HTTP contract for error paths that don't require a live Baserow.

import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { startServer, repoPath } from "../helpers/server.js";

const PORT = 31403;
const memDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-esc-"));

function post(port, urlPath, body, contentType = "application/json") {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: urlPath, method: "POST", timeout: 4000,
        headers: { "content-type": contentType, "content-length": Buffer.byteLength(payload) } },
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
    req.on("timeout", () => { req.destroy(new Error("request timeout")); });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

let srv;
describe("POST /tools/create_escalation_case — HTTP contract (Story 5.2)", () => {
  before(async () => {
    srv = await startServer({
      entry: "openclaw/server.js",
      port: PORT,
      env: {
        OPENCLAW_PORT: String(PORT),
        OPENCLAW_CONFIG_DIR: repoPath("openclaw/config"),
        OPENCLAW_MEMORY_PATH: path.join(memDir, "mecare.db"),
        OPENROUTER_API_KEY: "test-key",
        // No BASEROW_URL — tests 503 path
      },
    });
  });

  after(async () => {
    await srv?.stop();
    fs.rmSync(memDir, { recursive: true, force: true });
  });

  test("POST thiếu required fields → 400 (AC2 validation)", async () => {
    const res = await post(PORT, "/tools/create_escalation_case", { pharmacy_id: "P1" });
    assert.equal(res.status, 400, `expected 400, got ${res.status}`);
    assert.equal(
      res.json?.error,
      "pharmacy_id, customer_id, trigger_type, trigger, customer_content required",
      `unexpected error: ${res.json?.error}`
    );
  });

  test("POST JSON không hợp lệ → 400 invalid_json (AC2 validation)", async () => {
    const res = await post(PORT, "/tools/create_escalation_case", "not valid json{{{");
    assert.equal(res.status, 400, `expected 400, got ${res.status}`);
    assert.equal(res.json?.error, "invalid_json", `unexpected error: ${res.json?.error}`);
  });

  test("POST đủ fields nhưng không có BASEROW_URL → 503 escalation_store_unavailable (AC2, AC4)", async () => {
    const res = await post(PORT, "/tools/create_escalation_case", {
      pharmacy_id: "P1",
      customer_id: "C1",
      trigger_type: "emergency",
      trigger: "khó thở",
      customer_content: "tôi bị khó thở nặng",
    });
    assert.equal(res.status, 503, `expected 503, got ${res.status}`);
    assert.equal(
      res.json?.error,
      "escalation_store_unavailable",
      `unexpected error: ${res.json?.error}`
    );
  });
});
