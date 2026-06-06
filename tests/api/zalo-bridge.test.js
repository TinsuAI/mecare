// API/E2E — zalo-bridge stub healthcheck contract (Story 1.1, AC2).
// Spawns the real src/index.ts (Node 24 native TS) and probes HTTP.

import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { startServer, get } from "../helpers/server.js";

const PORT = 31301;
let srv;

describe("zalo-bridge healthcheck API", () => {
  before(async () => {
    srv = await startServer({
      entry: "zalo-bridge/src/index.ts",
      port: PORT,
      env: { ZALO_BRIDGE_PORT: String(PORT) },
    });
  });
  after(async () => { await srv?.stop(); });

  test("GET /healthz → 200 with snake_case ok payload", async () => {
    const res = await get(PORT, "/healthz");
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, { status: "ok", service: "zalo-bridge" });
  });

  test("unknown route → 404 not_found (error case)", async () => {
    const res = await get(PORT, "/does-not-exist");
    assert.equal(res.status, 404);
    assert.deepEqual(res.json, { error: "not_found" });
  });
});
