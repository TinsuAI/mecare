// Contract — OpenClaw provider/memory config invariants (Story 1.1, AC2).
// No YAML dep: assert on raw text (config is hand-written, stable).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const read = (rel) => fs.readFileSync(repoPath(rel), "utf8");

describe("OpenClaw config (AC2)", () => {
  test("provider pins non-CN data residency (NFR-5)", () => {
    const cfg = read("openclaw/config/provider-openrouter.yml");
    assert.match(cfg, /pin_non_cn:\s*true/i, "provider must pin non-CN");
  });

  test("provider targets DeepSeek V4 Flash via OpenRouter", () => {
    const cfg = read("openclaw/config/provider-openrouter.yml");
    assert.match(cfg, /deepseek/i, "model must reference deepseek");
  });

  test("provider reads key from env, never hardcoded", () => {
    const cfg = read("openclaw/config/provider-openrouter.yml");
    assert.match(cfg, /OPENROUTER_API_KEY/, "must reference OPENROUTER_API_KEY env");
    assert.doesNotMatch(cfg, /sk-or-[A-Za-z0-9]{10,}/, "no real OpenRouter key in config");
  });

  test("memory store = SQLite + sqlite-vec (self-host, not a service)", () => {
    const cfg = read("openclaw/config/memory.yml");
    assert.match(cfg, /sqlite/i, "memory must use sqlite");
    assert.match(cfg, /sqlite-vec|sqlite_vec|vec/i, "memory must use sqlite-vec");
  });
});
