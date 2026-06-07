// Contract tests — Story 2.3 (risk-monitor module).
// Unit tests for recordSignal, getRiskState, resetToNormal, _resetForTesting.

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  recordSignal,
  getRiskState,
  resetToNormal,
  _resetForTesting,
} from "../../zalo-bridge/src/risk-monitor.ts";

beforeEach(() => {
  delete process.env.RISK_BLOCK_COUNT_THRESHOLD;
  delete process.env.RISK_ERROR_COUNT_THRESHOLD;
  delete process.env.RISK_WINDOW_MINUTES;
  delete process.env.RISK_AUTO_RESUME;
  delete process.env.ALERT_WEBHOOK_URL;
  _resetForTesting();
});

// ── recordSignal + block/spam threshold ───────────────────────

describe("recordSignal + block threshold", () => {
  test("1 block → state still normal", () => {
    process.env.RISK_BLOCK_COUNT_THRESHOLD = "2";
    recordSignal("block");
    assert.equal(getRiskState().state, "normal");
  });

  test("2 blocks → state paused", () => {
    process.env.RISK_BLOCK_COUNT_THRESHOLD = "2";
    recordSignal("block");
    recordSignal("block");
    assert.equal(getRiskState().state, "paused");
  });

  test("block + spam_report = 2 → paused at threshold=2", () => {
    process.env.RISK_BLOCK_COUNT_THRESHOLD = "2";
    recordSignal("block");
    recordSignal("spam_report");
    assert.equal(getRiskState().state, "paused");
  });
});

// ── send_error threshold ──────────────────────────────────────

describe("recordSignal + error threshold", () => {
  test("2 send_errors → state paused at threshold=2", () => {
    process.env.RISK_ERROR_COUNT_THRESHOLD = "2";
    recordSignal("send_error");
    recordSignal("send_error");
    assert.equal(getRiskState().state, "paused");
  });

  test("1 send_error → state normal at threshold=2", () => {
    process.env.RISK_ERROR_COUNT_THRESHOLD = "2";
    recordSignal("send_error");
    assert.equal(getRiskState().state, "normal");
  });
});

// ── getRiskState counts ───────────────────────────────────────

describe("getRiskState signal_counts", () => {
  test("1 block + 1 spam_report + 1 send_error → counts match", () => {
    process.env.RISK_BLOCK_COUNT_THRESHOLD = "10";
    process.env.RISK_ERROR_COUNT_THRESHOLD = "10";
    recordSignal("block");
    recordSignal("spam_report");
    recordSignal("send_error");
    const { signal_counts } = getRiskState();
    assert.equal(signal_counts.block, 1);
    assert.equal(signal_counts.spam_report, 1);
    assert.equal(signal_counts.send_error, 1);
  });

  test("returns correct window_minutes and since_epoch_ms", () => {
    process.env.RISK_WINDOW_MINUTES = "30";
    const nowMs = Date.now();
    const result = getRiskState(nowMs);
    assert.equal(result.window_minutes, 30);
    assert.equal(result.since_epoch_ms, nowMs - 30 * 60_000);
  });
});

// ── window prune ──────────────────────────────────────────────

describe("window prune", () => {
  test("expired signal pruned — counts = 0", () => {
    process.env.RISK_WINDOW_MINUTES = "60";
    process.env.RISK_BLOCK_COUNT_THRESHOLD = "100";
    const windowMs = 60 * 60_000;
    const expiredMs = Date.now() - windowMs - 1;
    recordSignal("block", expiredMs);
    // getRiskState at current time prunes the expired signal → counts = 0
    const result = getRiskState();
    assert.equal(result.signal_counts.block, 0);
  });
});

// ── auto-resume ───────────────────────────────────────────────

describe("auto-resume", () => {
  test("RISK_AUTO_RESUME=true: paused + window expires → getRiskState auto-resumes to normal", () => {
    process.env.RISK_AUTO_RESUME = "true";
    process.env.RISK_BLOCK_COUNT_THRESHOLD = "1";
    const windowMs = 60 * 60_000;
    const past = Date.now();
    recordSignal("block", past);
    assert.equal(getRiskState().state, "paused");
    // Simulate window expiry: future nowMs causes prune → signals.length=0 → auto-resume
    const future = past + windowMs + 1000;
    const result = getRiskState(future);
    assert.equal(result.state, "normal");
    assert.equal(result.signal_counts.block, 0);
  });
});

// ── resetToNormal ─────────────────────────────────────────────

describe("resetToNormal", () => {
  test("paused → resetToNormal → state normal, signals preserved", () => {
    process.env.RISK_BLOCK_COUNT_THRESHOLD = "1";
    recordSignal("block");
    assert.equal(getRiskState().state, "paused");
    resetToNormal();
    assert.equal(getRiskState().state, "normal");
    // signals NOT cleared (historical audit)
    assert.equal(getRiskState().signal_counts.block, 1);
  });
});

// ── default thresholds (no env override) ─────────────────────

describe("default thresholds", () => {
  test("2 blocks below default threshold=3 → normal", () => {
    recordSignal("block");
    recordSignal("block");
    assert.equal(getRiskState().state, "normal");
  });

  test("3 blocks at default threshold=3 → paused", () => {
    recordSignal("block");
    recordSignal("block");
    recordSignal("block");
    assert.equal(getRiskState().state, "paused");
  });

  test("4 send_errors below default threshold=5 → normal", () => {
    for (let i = 0; i < 4; i++) recordSignal("send_error");
    assert.equal(getRiskState().state, "normal");
  });

  test("5 send_errors at default threshold=5 → paused", () => {
    for (let i = 0; i < 5; i++) recordSignal("send_error");
    assert.equal(getRiskState().state, "paused");
  });
});

// ── RISK_AUTO_RESUME=false boundary ──────────────────────────

describe("RISK_AUTO_RESUME=false — window expires, stays paused", () => {
  test("paused + window expires + RISK_AUTO_RESUME=false → stays paused", () => {
    process.env.RISK_AUTO_RESUME = "false";
    process.env.RISK_BLOCK_COUNT_THRESHOLD = "1";
    const windowMs = 60 * 60_000;
    const past = Date.now();
    recordSignal("block", past);
    assert.equal(getRiskState().state, "paused");
    // Future nowMs: signals pruned, but auto-resume is disabled → stays paused
    const future = past + windowMs + 1000;
    const result = getRiskState(future);
    assert.equal(result.state, "paused");
    assert.equal(result.signal_counts.block, 0);
  });
});
