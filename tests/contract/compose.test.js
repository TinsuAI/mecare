// Contract — docker-compose stack invariants (Story 1.1, AC2/AC3/AC4).
// Parses the resolved config via `docker compose config --format json`
// (the real compose engine), then asserts structural guarantees.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { repoPath } from "../helpers/server.js";

const ROOT = repoPath(".").replace(/\/$/, "");
const EXPECTED_SERVICES = ["postgres", "baserow", "n8n", "openclaw", "zalo-bridge"];

let cfg;
before(() => {
  const json = execFileSync("docker", ["compose", "config", "--format", "json"],
    { cwd: ROOT, encoding: "utf8" });
  cfg = JSON.parse(json);
});

describe("docker-compose stack (AC2/AC3/AC4)", () => {
  test("all foundation services present", () => {
    const names = Object.keys(cfg.services);
    for (const s of EXPECTED_SERVICES) assert.ok(names.includes(s), `missing service ${s}`);
  });

  test("every service has restart: unless-stopped (AC3)", () => {
    for (const s of EXPECTED_SERVICES) {
      assert.equal(cfg.services[s].restart, "unless-stopped", `${s} restart policy`);
    }
  });

  test("every service has a healthcheck (AC2)", () => {
    for (const s of EXPECTED_SERVICES) {
      assert.ok(cfg.services[s].healthcheck, `${s} missing healthcheck`);
    }
  });

  test("images are pinned, never :latest (anti-drift)", () => {
    for (const s of ["postgres", "baserow", "n8n"]) {
      const img = cfg.services[s].image;
      assert.ok(img, `${s} has no image`);
      assert.doesNotMatch(img, /:latest$/, `${s} must not use :latest`);
      assert.match(img, /:[\w.\-]+$/, `${s} image must be tag-pinned`);
    }
  });

  test("baserow + n8n depend on postgres healthy (AC2)", () => {
    for (const s of ["baserow", "n8n"]) {
      assert.equal(cfg.services[s].depends_on?.postgres?.condition, "service_healthy",
        `${s} must wait for postgres healthy`);
    }
  });

  test("postgres data persisted via named volume (AC3)", () => {
    assert.ok(cfg.volumes && cfg.volumes.pgdata !== undefined, "pgdata named volume missing");
    const mounts = (cfg.services.postgres.volumes ?? []).map((v) => v.source);
    assert.ok(mounts.includes("pgdata"), "postgres must mount pgdata");
  });

  test("no hardcoded secrets in committed compose file (AC4)", () => {
    const raw = fs.readFileSync(repoPath("docker-compose.yml"), "utf8");
    assert.doesNotMatch(raw, /sk-or-[A-Za-z0-9]{10,}/, "no OpenRouter key literal");
    // Postgres password must come from env interpolation, not a baked literal.
    assert.match(raw, /POSTGRES_PASSWORD:\s*\$\{?/m, "POSTGRES_PASSWORD must be env-driven");
  });
});
