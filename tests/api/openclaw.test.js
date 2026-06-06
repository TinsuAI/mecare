// API/E2E — openclaw foundation stub (Story 1.1, AC2).
// Spawns server.js with host-test env overrides and probes HTTP.
// Also covers the missing-config error path (process exits non-zero).

import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { startServer, get, repoPath } from "../helpers/server.js";

const PORT = 31401;
const memDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-mem-"));
let srv;

describe("openclaw healthcheck API", () => {
  before(async () => {
    srv = await startServer({
      entry: "openclaw/server.js",
      port: PORT,
      env: {
        OPENCLAW_PORT: String(PORT),
        OPENCLAW_CONFIG_DIR: repoPath("openclaw/config"),
        OPENCLAW_MEMORY_PATH: path.join(memDir, "mecare.db"),
        OPENROUTER_API_KEY: "test-key",
      },
    });
  });
  after(async () => {
    await srv?.stop();
    fs.rmSync(memDir, { recursive: true, force: true });
  });

  test("GET /healthz → 200, config_loaded true", async () => {
    const res = await get(PORT, "/healthz");
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, { status: "ok", service: "openclaw", config_loaded: true });
  });

  test("unknown route → 404 not_found (error case)", async () => {
    const res = await get(PORT, "/nope");
    assert.equal(res.status, 404);
    assert.deepEqual(res.json, { error: "not_found" });
  });

  test("creates memory store dir on boot (self-host volume)", () => {
    assert.ok(fs.existsSync(memDir), "memory dir should exist");
  });

  test("missing config → exits non-zero (fail-fast)", async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-empty-"));
    const code = await new Promise((resolve) => {
      const p = spawn("node", [repoPath("openclaw/server.js")], {
        env: { ...process.env, OPENCLAW_PORT: "31499", OPENCLAW_CONFIG_DIR: empty,
               OPENCLAW_MEMORY_PATH: path.join(empty, "m.db") },
        stdio: "ignore",
      });
      p.on("exit", (c) => resolve(c));
    });
    fs.rmSync(empty, { recursive: true, force: true });
    assert.equal(code, 1);
  });
});
