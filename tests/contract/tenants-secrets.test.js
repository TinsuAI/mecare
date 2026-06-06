// Contract — no real tenant secrets committed (Story 1.1, AC4).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { repoPath } from "../helpers/server.js";

const ROOT = repoPath(".").replace(/\/$/, "");

function tracked() {
  const out = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

describe("no committed tenant secrets (AC4)", () => {
  const files = tracked();

  test("no tenants/<slug>.env tracked except _template.env", () => {
    const leaks = files.filter((f) => /^tenants\/.+\.env$/.test(f) && f !== "tenants/_template.env");
    assert.deepEqual(leaks, [], `leaked tenant env files: ${leaks.join(", ")}`);
  });

  test("no real .env tracked (only .env.example)", () => {
    const leaks = files.filter((f) => /(^|\/)\.env$/.test(f));
    assert.deepEqual(leaks, [], `leaked .env: ${leaks.join(", ")}`);
  });
});
