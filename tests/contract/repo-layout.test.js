// Contract — AR-9 repo layout (Story 1.1, AC1).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

// Paths mandated by AC1 / AR-9.
const REQUIRED = [
  "docker-compose.yml",
  ".env.example",
  "README.md",
  ".gitignore",
  "tenants/_template.env",
  "baserow/schema", "baserow/seed", "baserow/views",
  "n8n/workflows",
  "openclaw/config", "openclaw/plugins", "openclaw/kichban",
  "openclaw/guardrails", "openclaw/prompts",
  "zalo-bridge/src",
  "docs", "scripts",
];

describe("AR-9 repo layout (AC1)", () => {
  for (const rel of REQUIRED) {
    test(`exists: ${rel}`, () => {
      assert.ok(fs.existsSync(repoPath(rel)), `missing ${rel}`);
    });
  }

  test("openclaw config trio present", () => {
    for (const f of ["gateway.yml", "provider-openrouter.yml", "memory.yml"]) {
      assert.ok(fs.existsSync(repoPath(`openclaw/config/${f}`)), `missing openclaw/config/${f}`);
    }
  });
});
