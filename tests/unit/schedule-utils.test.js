import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { nextDueAt, isBusinessHourGmt7, addMinutes } from "../../n8n/lib/schedule-utils.js";

describe("nextDueAt", () => {
  test("4.2 — weekly +7 days", () => {
    assert.equal(
      nextDueAt("2026-06-07T08:00:00.000Z", "weekly"),
      "2026-06-14T08:00:00.000Z"
    );
  });

  test("4.3 — monthly +30 days", () => {
    assert.equal(
      nextDueAt("2026-06-07T08:00:00.000Z", "monthly"),
      "2026-07-07T08:00:00.000Z"
    );
  });

  test("4.4 — quarterly +90 days", () => {
    assert.equal(
      nextDueAt("2026-06-07T08:00:00.000Z", "quarterly"),
      "2026-09-05T08:00:00.000Z"
    );
  });

  test("4.5 — once → null (one-shot, no recurrence)", () => {
    assert.equal(
      nextDueAt("2026-06-07T08:00:00.000Z", "once"),
      null
    );
  });

  test("4.11 — unknown cadence type → null (no recurrence, defensive)", () => {
    assert.equal(
      nextDueAt("2026-06-07T08:00:00.000Z", "biweekly"),
      null
    );
  });
});

describe("isBusinessHourGmt7", () => {
  // 2026-06-07T00:00:00.000Z UTC = 7:00am GMT+7
  const at7amGmt7 = Date.parse("2026-06-07T00:00:00.000Z");
  // 2026-06-06T23:59:00.000Z UTC = 6:59am GMT+7
  const at659amGmt7 = Date.parse("2026-06-06T23:59:00.000Z");
  // 2026-06-07T14:00:00.000Z UTC = 21:00 GMT+7
  const at21Gmt7 = Date.parse("2026-06-07T14:00:00.000Z");

  test("4.6 — 7:00am GMT+7 → true (within hours)", () => {
    assert.equal(isBusinessHourGmt7(at7amGmt7, 7, 21), true);
  });

  test("4.7 — 6:59am GMT+7 → false (boundary: before start excluded)", () => {
    assert.equal(isBusinessHourGmt7(at659amGmt7, 7, 21), false);
  });

  test("4.8 — 21:00 GMT+7 → false (boundary: end excluded)", () => {
    assert.equal(isBusinessHourGmt7(at21Gmt7, 7, 21), false);
  });

  test("4.12 — 12:00 noon GMT+7 → true (midday, clearly within business hours)", () => {
    // 2026-06-07T05:00:00.000Z UTC = 12:00 noon GMT+7
    const atNoonGmt7 = Date.parse("2026-06-07T05:00:00.000Z");
    assert.equal(isBusinessHourGmt7(atNoonGmt7, 7, 21), true);
  });
});

describe("addMinutes", () => {
  test("4.9 — +90 minutes same day", () => {
    assert.equal(
      addMinutes("2026-06-07T08:00:00.000Z", 90),
      "2026-06-07T09:30:00.000Z"
    );
  });

  test("4.10 — +90 minutes across midnight", () => {
    assert.equal(
      addMinutes("2026-06-07T23:30:00.000Z", 90),
      "2026-06-08T01:00:00.000Z"
    );
  });
});
