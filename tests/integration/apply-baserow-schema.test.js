// Integration — applier script `scripts/apply-baserow-schema.mjs` (Story 1.2, Task 2).
// Offline: exercises the REAL script entrypoint (load/validate/dry-run + auth-guard die path).
// No Baserow live needed — dry-run returns before any API call; the error case dies in
// authenticate() before the first network request.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "apply-baserow-schema.mjs");

// Run the applier with a clean env (no BASEROW_* leakage from the host shell).
function runApplier(extraArgs, { withAuth = false } = {}) {
  const env = { PATH: process.env.PATH, HOME: process.env.HOME };
  if (withAuth) {
    env.BASEROW_EMAIL = "you@example.com";
    env.BASEROW_PASSWORD = "x";
  }
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [SCRIPT, ...extraArgs],
      { env, cwd: ROOT, timeout: 15000 },
      (err, stdout, stderr) => {
        resolve({ code: err ? (err.code ?? 1) : 0, stdout, stderr });
      },
    );
  });
}

describe("applier --dry-run (happy path, offline)", () => {
  test("exit 0 + báo đủ 9 bảng + Dry-run OK", async () => {
    const r = await runApplier(["--dry-run"]);
    assert.equal(r.code, 0, `dry-run phải exit 0\nstderr: ${r.stderr}`);
    assert.match(r.stdout, /Dry-run OK/, "thiếu xác nhận Dry-run OK");
    assert.match(r.stdout, /9 bảng/, "phải báo 9 bảng schema");
  });

  test("dry-run KHÔNG gọi API (chạy được khi không có auth env)", async () => {
    // env không có BASEROW_EMAIL/PASSWORD/JWT/TOKEN — dry-run vẫn xanh.
    const r = await runApplier(["--dry-run"]);
    assert.equal(r.code, 0);
  });
});

describe("applier auth-guard (error cases, offline)", () => {
  test("không auth + không --dry-run -> exit ≠0 + 'Thiếu auth'", async () => {
    const r = await runApplier([]); // schema+seed mode, no auth env
    assert.notEqual(r.code, 0, "thiếu auth phải exit khác 0");
    assert.match(r.stderr, /Thiếu auth/, `phải báo lỗi thiếu auth\nstderr: ${r.stderr}`);
  });

  test("--schema không auth -> exit ≠0 + 'Thiếu auth' (AC2 Story 1.8)", async () => {
    const r = await runApplier(["--schema"]);
    assert.notEqual(r.code, 0, "--schema không auth phải exit khác 0");
    assert.match(r.stderr, /Thiếu auth/, `--schema phải báo thiếu auth\nstderr: ${r.stderr}`);
  });

  test("--seed không auth -> exit ≠0 + 'Thiếu auth' (AC3 Story 1.8)", async () => {
    const r = await runApplier(["--seed"]);
    assert.notEqual(r.code, 0, "--seed không auth phải exit khác 0");
    assert.match(r.stderr, /Thiếu auth/, `--seed phải báo thiếu auth\nstderr: ${r.stderr}`);
  });
});
