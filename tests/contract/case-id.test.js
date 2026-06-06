// Contract — module thuần mã ca (Story 1.3, AC1 + AC4). Offline, zero-dep.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildCaseId,
  parseCaseId,
  isValidCaseId,
  vnDateStamp,
  caseIdPrefix,
} from "../../openclaw/lib/case-id.mjs";

describe("AC1/AC4 — buildCaseId format", () => {
  test("format ESC-<slug>-<YYYYMMDD>-<seq>, pad ≥4", () => {
    assert.equal(buildCaseId({ slug: "tructam", date: "20260606", seq: 1 }), "ESC-tructam-20260606-0001");
    assert.equal(buildCaseId({ slug: "tructam", date: "20260606", seq: 42 }), "ESC-tructam-20260606-0042");
    assert.equal(buildCaseId({ slug: "tructam", date: "20260607", seq: 1 }), "ESC-tructam-20260607-0001");
  });

  test("seq > 9999 KHÔNG bị cắt", () => {
    assert.equal(buildCaseId({ slug: "tructam", date: "20260606", seq: 12345 }), "ESC-tructam-20260606-12345");
  });

  test("reject slug có '-' / hoa / space / rỗng", () => {
    for (const slug of ["truc-tam", "TrucTam", "truc tam", "", "trúctâm"]) {
      assert.throws(() => buildCaseId({ slug, date: "20260606", seq: 1 }), /slug/, `phải reject slug ${JSON.stringify(slug)}`);
    }
  });

  test("reject date sai 8-digit", () => {
    for (const date of ["2026606", "2026-06-06", "abcdefgh", "202606060"]) {
      assert.throws(() => buildCaseId({ slug: "tructam", date, seq: 1 }), /date/);
    }
  });

  test("reject seq < 1 hoặc không integer", () => {
    for (const seq of [0, -1, 1.5, "1"]) {
      assert.throws(() => buildCaseId({ slug: "tructam", date: "20260606", seq }), /seq/);
    }
  });
});

describe("AC4 — parseCaseId + round-trip", () => {
  test("parse đúng thành phần", () => {
    assert.deepEqual(parseCaseId("ESC-tructam-20260606-0042"), { slug: "tructam", date: "20260606", seq: 42 });
  });

  test("round-trip parse(build(x)) === x (giá trị)", () => {
    for (const x of [
      { slug: "tructam", date: "20260606", seq: 1 },
      { slug: "abc123", date: "20251231", seq: 9999 },
      { slug: "x", date: "20260101", seq: 12345 },
    ]) {
      assert.deepEqual(parseCaseId(buildCaseId(x)), x);
    }
  });

  test("parse defensively với slug nhiều ký tự (anchor date=8 digit, seq=đuôi)", () => {
    assert.deepEqual(parseCaseId("ESC-tructam2026-20260606-0007"), { slug: "tructam2026", date: "20260606", seq: 7 });
  });

  test("reject format sai", () => {
    for (const bad of [
      "esc-tructam-20260606-0001", // prefix thường
      "ESC-truc-tam-20260606-0001", // slug có '-'
      "ESC-tructam-2026606-0001", // date 7 digit
      "ESC-tructam-20260606-", // thiếu seq
      "ESC-tructam-20260606-abc", // seq không số
      "XYZ-tructam-20260606-0001", // prefix sai
      "ESC-tructam-20260606-0001-extra", // dư đuôi
      42,
      null,
    ]) {
      assert.throws(() => parseCaseId(bad));
      assert.equal(isValidCaseId(bad), false, `isValidCaseId phải false: ${JSON.stringify(bad)}`);
    }
  });

  test("isValidCaseId true cho mã hợp lệ", () => {
    assert.equal(isValidCaseId("ESC-tructam-20260606-0001"), true);
  });
});

describe("AC1 — vnDateStamp quy đổi UTC→VN (UTC+7, không DST)", () => {
  test("giữa ngày VN", () => {
    assert.equal(vnDateStamp("2026-06-06T03:00:00Z"), "20260606"); // 10:00 VN
  });

  test("qua nửa đêm VN: 23:30 UTC = 06:30 VN hôm sau", () => {
    assert.equal(vnDateStamp("2026-06-06T23:30:00Z"), "20260607");
  });

  test("mốc 17:00 UTC = 00:00 VN hôm sau", () => {
    assert.equal(vnDateStamp("2026-06-06T17:00:00Z"), "20260607");
  });

  test("mốc 16:59 UTC = 23:59 VN cùng ngày", () => {
    assert.equal(vnDateStamp("2026-06-06T16:59:00Z"), "20260606");
  });

  test("nhận Date và epoch ms", () => {
    const d = new Date("2026-06-06T23:30:00Z");
    assert.equal(vnDateStamp(d), "20260607");
    assert.equal(vnDateStamp(d.getTime()), "20260607");
  });

  test("reject input không hợp lệ", () => {
    assert.throws(() => vnDateStamp("not-a-date"));
    assert.throws(() => vnDateStamp({}));
  });
});

describe("caseIdPrefix", () => {
  test("prefix lọc query (slug, ngày)", () => {
    assert.equal(caseIdPrefix("tructam", "20260606"), "ESC-tructam-20260606-");
  });
  test("reject slug/date sai", () => {
    assert.throws(() => caseIdPrefix("truc-tam", "20260606"));
    assert.throws(() => caseIdPrefix("tructam", "bad"));
  });
});

// QA-generated gap coverage: missing-arg guards, NaN/non-finite time, seq=0 parse.
describe("edge cases — guards bổ sung", () => {
  test("buildCaseId reject khi thiếu args (undefined slug/date/seq)", () => {
    assert.throws(() => buildCaseId({ date: "20260606", seq: 1 }), /slug/);
    assert.throws(() => buildCaseId({ slug: "tructam", seq: 1 }), /date/);
    assert.throws(() => buildCaseId({ slug: "tructam", date: "20260606" }), /seq/);
  });

  test("vnDateStamp reject epoch NaN / non-finite", () => {
    assert.throws(() => vnDateStamp(NaN), /không hợp lệ/);
    assert.throws(() => vnDateStamp(Infinity), /không hợp lệ/);
  });

  test("parseCaseId reject seq = 0 (seq phải ≥ 1)", () => {
    assert.throws(() => parseCaseId("ESC-tructam-20260606-0000"), /seq/);
    assert.equal(isValidCaseId("ESC-tructam-20260606-0000"), false);
  });
});
