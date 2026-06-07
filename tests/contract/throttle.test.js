// Contract tests — Story 2.2 (Throttle module).
// Unit tests for isBusinessHour, checkDailyCap, incrementDailyCount,
// isWarmupActive, jitterMs, applyVariant. Zero network calls.

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  isBusinessHour,
  checkDailyCap,
  incrementDailyCount,
  isWarmupActive,
  jitterMs,
  applyVariant,
} from "../../zalo-bridge/src/throttle.ts";

// ── Timestamp helpers (GMT+7 = UTC+7) ─────────────────────────
// toGmt7Hour: UTC ms that represents H:MM GMT+7 on 2026-01-02
function gmt7Ms(utcHour, utcMin = 0) {
  // We want GMT+7 hour H → UTC hour = H - 7
  // For H < 7, this crosses midnight: use Jan 1 UTC
  const utcDate = utcHour - 7 < 0 ? 1 : 2;
  const resolvedUtcHour = (utcHour - 7 + 24) % 24;
  return Date.UTC(2026, 0, utcDate, resolvedUtcHour, utcMin, 0);
}

// Two distinct GMT+7 calendar days (for reset tests)
const DAY1_MS = Date.UTC(2026, 0, 2, 0, 0, 0); // Jan 2 07:00 GMT+7 (= Jan 2 00:00 UTC)
const DAY2_MS = Date.UTC(2026, 0, 3, 0, 0, 0); // Jan 3 07:00 GMT+7 (= Jan 3 00:00 UTC)

// ── isBusinessHour ─────────────────────────────────────────────

describe("isBusinessHour", () => {
  beforeEach(() => {
    delete process.env.BUSINESS_HOUR_START;
    delete process.env.BUSINESS_HOUR_END;
  });

  test("06:59 GMT+7 → false (before window)", () => {
    const nowMs = gmt7Ms(6, 59); // 06:59 GMT+7
    assert.equal(isBusinessHour(nowMs), false);
  });

  test("07:00 GMT+7 → true (window start, inclusive)", () => {
    const nowMs = gmt7Ms(7, 0);
    assert.equal(isBusinessHour(nowMs), true);
  });

  test("20:59 GMT+7 → true (inside window)", () => {
    const nowMs = gmt7Ms(20, 59);
    assert.equal(isBusinessHour(nowMs), true);
  });

  test("21:00 GMT+7 → false (window end, exclusive)", () => {
    const nowMs = gmt7Ms(21, 0);
    assert.equal(isBusinessHour(nowMs), false);
  });

  test("custom BUSINESS_HOUR_START=9 BUSINESS_HOUR_END=17: 08:59 → false", () => {
    process.env.BUSINESS_HOUR_START = "9";
    process.env.BUSINESS_HOUR_END = "17";
    assert.equal(isBusinessHour(gmt7Ms(8, 59)), false);
    assert.equal(isBusinessHour(gmt7Ms(9, 0)), true);
    assert.equal(isBusinessHour(gmt7Ms(16, 59)), true);
    assert.equal(isBusinessHour(gmt7Ms(17, 0)), false);
  });
});

// ── isWarmupActive ─────────────────────────────────────────────

describe("isWarmupActive", () => {
  beforeEach(() => {
    delete process.env.WARMUP_UNTIL_EPOCH_MS;
  });

  test("env not set → false", () => {
    assert.equal(isWarmupActive(DAY1_MS), false);
  });

  test("env set to far future → true", () => {
    process.env.WARMUP_UNTIL_EPOCH_MS = "9999999999999";
    assert.equal(isWarmupActive(DAY1_MS), true);
  });

  test("env set to past → false", () => {
    process.env.WARMUP_UNTIL_EPOCH_MS = "1";
    assert.equal(isWarmupActive(DAY1_MS), false);
  });

  test("env set to NaN → false", () => {
    process.env.WARMUP_UNTIL_EPOCH_MS = "not-a-number";
    assert.equal(isWarmupActive(DAY1_MS), false);
  });
});

// ── checkDailyCap + incrementDailyCount ───────────────────────

describe("checkDailyCap / incrementDailyCount", () => {
  beforeEach(() => {
    delete process.env.DAILY_SEND_CAP;
    delete process.env.WARMUP_DAILY_CAP;
    delete process.env.WARMUP_UNTIL_EPOCH_MS;
  });

  test("fresh pharmacyId → allowed: true, count: 0", () => {
    const result = checkDailyCap("fresh-pharm-001", DAY1_MS);
    assert.equal(result.allowed, true);
    assert.equal(result.count, 0);
  });

  test("after N increments = cap → allowed: false", () => {
    process.env.DAILY_SEND_CAP = "3";
    const id = "cap-pharm-001";
    incrementDailyCount(id, DAY1_MS);
    incrementDailyCount(id, DAY1_MS);
    incrementDailyCount(id, DAY1_MS);
    const result = checkDailyCap(id, DAY1_MS);
    assert.equal(result.allowed, false);
    assert.equal(result.count, 3);
    assert.equal(result.cap, 3);
  });

  test("new GMT+7 day → counter resets to 0", () => {
    process.env.DAILY_SEND_CAP = "2";
    const id = "reset-pharm-001";
    incrementDailyCount(id, DAY1_MS);
    incrementDailyCount(id, DAY1_MS);
    // Day 1: exhausted
    assert.equal(checkDailyCap(id, DAY1_MS).allowed, false);
    // Day 2: should reset
    const result = checkDailyCap(id, DAY2_MS);
    assert.equal(result.allowed, true);
    assert.equal(result.count, 0);
  });

  test("DAILY_SEND_CAP=0 → fresh pharmacy blocked immediately", () => {
    process.env.DAILY_SEND_CAP = "0";
    const result = checkDailyCap("zero-cap-pharm-001", DAY1_MS);
    assert.equal(result.allowed, false);
    assert.equal(result.cap, 0);
  });

  test("default DAILY_SEND_CAP is 50", () => {
    // No env vars set — default should be 50
    const result = checkDailyCap("default-cap-pharm-001", DAY1_MS);
    assert.equal(result.allowed, true);
    assert.equal(result.cap, 50);
  });

  test("warmup active → uses WARMUP_DAILY_CAP instead of DAILY_SEND_CAP", () => {
    process.env.DAILY_SEND_CAP = "50";
    process.env.WARMUP_DAILY_CAP = "2";
    process.env.WARMUP_UNTIL_EPOCH_MS = "9999999999999"; // far future
    const id = "warmup-pharm-001";
    incrementDailyCount(id, DAY1_MS);
    incrementDailyCount(id, DAY1_MS);
    const result = checkDailyCap(id, DAY1_MS);
    assert.equal(result.allowed, false);
    assert.equal(result.cap, 2);
  });
});

// ── jitterMs ──────────────────────────────────────────────────

describe("jitterMs", () => {
  beforeEach(() => {
    delete process.env.JITTER_MIN_MS;
    delete process.env.JITTER_MAX_MS;
  });

  test("result within [min, max] range (defaults 800–3000)", () => {
    for (let i = 0; i < 20; i++) {
      const ms = jitterMs();
      assert.ok(ms >= 800 && ms <= 3000, `jitter ${ms} out of [800, 3000]`);
    }
  });

  test("custom JITTER_MIN=1 JITTER_MAX=5: result in [1, 5]", () => {
    process.env.JITTER_MIN_MS = "1";
    process.env.JITTER_MAX_MS = "5";
    for (let i = 0; i < 20; i++) {
      const ms = jitterMs();
      assert.ok(ms >= 1 && ms <= 5, `jitter ${ms} out of [1, 5]`);
    }
  });

  test("returns integer (Math.floor — no fractional ms)", () => {
    for (let i = 0; i < 20; i++) {
      const ms = jitterMs();
      assert.equal(ms % 1, 0, `jitter ${ms} is not an integer`);
    }
  });
});

// ── applyVariant ──────────────────────────────────────────────

describe("applyVariant", () => {
  const BASE = "Chào anh/chị, nhà thuốc có cập nhật cho anh/chị.";

  test("seed 0 → unchanged content", () => {
    assert.equal(applyVariant(BASE, 0), BASE);
  });

  test("seed 1 → normalize whitespace + trim", () => {
    const input = "  Xin chào   anh/chị  ";
    const result = applyVariant(input, 1);
    assert.equal(result, "Xin chào anh/chị");
  });

  test("seed 1 → double-space collapsed", () => {
    const input = "Xin  chào  anh";
    assert.equal(applyVariant(input, 1), "Xin chào anh");
  });

  test("seed 2 → trailing period removed when present", () => {
    const input = "Chào anh/chị.";
    assert.equal(applyVariant(input, 2), "Chào anh/chị");
  });

  test("seed 2 → trailing period added when absent", () => {
    const input = "Chào anh/chị";
    assert.equal(applyVariant(input, 2), "Chào anh/chị.");
  });

  test("seed 3 → wraps to seed 0 (mod 3), unchanged", () => {
    assert.equal(applyVariant(BASE, 3), BASE);
  });

  test("seed 6 → wraps to seed 0, unchanged", () => {
    assert.equal(applyVariant(BASE, 6), BASE);
  });

  test("seed 4 → wraps to seed 1, normalizes whitespace", () => {
    const input = "Xin  chào";
    assert.equal(applyVariant(input, 4), "Xin chào");
  });
});
