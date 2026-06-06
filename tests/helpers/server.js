// Test helper — spawn a stub HTTP server, wait until it answers, probe it.
// Zero deps (Node built-ins). Used by API/E2E tests for openclaw + zalo-bridge.

import { spawn } from "node:child_process";
import http from "node:http";

const ROOT = new URL("../..", import.meta.url).pathname;

export function repoPath(rel) {
  return ROOT.replace(/\/$/, "") + "/" + rel;
}

// GET a path, resolve { status, json } (or { status, body } if not JSON).
export function get(port, path = "/") {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port, path, timeout: 4000 }, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        let json;
        try { json = JSON.parse(buf); } catch { /* not json */ }
        resolve({ status: res.statusCode, json, body: buf });
      });
    });
    req.on("timeout", () => { req.destroy(new Error("request timeout")); });
    req.on("error", reject);
  });
}

// Poll the port until a request succeeds or we time out.
async function waitForReady(port, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try { await get(port, "/healthz"); return; }
    catch {
      if (Date.now() > deadline) throw new Error(`server not ready on :${port}`);
      await new Promise((r) => setTimeout(r, 150));
    }
  }
}

// Spawn `node <entry>` with env, wait until /healthz answers.
// Returns { proc, port, stop() }. Caller picks a free-ish port via portEnv.
export async function startServer({ entry, port, env = {}, ready = true }) {
  const proc = spawn("node", [repoPath(entry)], {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  proc.stderr.on("data", (c) => (stderr += c));

  const stop = () => new Promise((resolve) => {
    if (proc.exitCode !== null || proc.signalCode) return resolve();
    proc.once("exit", () => resolve());
    proc.kill("SIGTERM");
  });

  if (ready) {
    try { await waitForReady(port); }
    catch (e) { await stop(); throw new Error(`${e.message}\n--- stderr ---\n${stderr}`); }
  }
  return { proc, port, stop, getStderr: () => stderr };
}
