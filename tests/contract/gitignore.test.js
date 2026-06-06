// Contract — secret isolation via .gitignore (Story 1.1, AC1 + AC4).
// Uses `git check-ignore` (exit 0 = ignored, 1 = tracked) — the real enforcer.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { repoPath } from "../helpers/server.js";

const ROOT = repoPath(".").replace(/\/$/, "");

function isIgnored(rel) {
  try {
    execFileSync("git", ["check-ignore", "-q", rel], { cwd: ROOT });
    return true; // exit 0
  } catch (e) {
    if (e.status === 1) return false; // not ignored
    throw e;
  }
}

describe("secret isolation (AC1/AC4)", () => {
  test("real tenant env files are ignored", () => {
    assert.ok(isIgnored("tenants/tructam.env"), "tenants/tructam.env must be ignored");
    assert.ok(isIgnored(".env"), ".env must be ignored");
  });

  test("placeholder/template files stay trackable", () => {
    assert.equal(isIgnored("tenants/_template.env"), false, "_template.env must NOT be ignored");
    assert.equal(isIgnored(".env.example"), false, ".env.example must NOT be ignored");
  });

  test("data volume bind-mount dirs are ignored", () => {
    assert.ok(isIgnored("baserow/data/x") || isIgnored("postgres/data/x"),
      "at least one data volume path should be ignored");
  });
});
