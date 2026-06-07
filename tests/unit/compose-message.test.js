import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  substituteTemplate,
  detectMissingPlaceholders,
  appendTpcnSuffix,
  buildCustomerRef,
} from "../../n8n/lib/compose-message.js";

const TPCN_SUFFIX = "Lưu ý: thực phẩm bảo vệ sức khỏe, không phải thuốc điều trị bệnh.";

describe("substituteTemplate", () => {
  test("all placeholders present → ok + filled content", () => {
    const result = substituteTemplate("Dạ, [TÊN] ơi...", { TÊN: "Lan" });
    assert.deepEqual(result, { ok: true, content: "Dạ, Lan ơi..." });
  });

  test("missing placeholder → ok=false + missing list", () => {
    const result = substituteTemplate("Dạ, [TÊN] ơi, thuốc [TÊN THUỐC]...", { TÊN: "Lan" });
    assert.equal(result.ok, false);
    assert.deepEqual(result.missing, ["TÊN THUỐC"]);
  });

  test("multiple missing placeholders → all listed in missing", () => {
    const result = substituteTemplate("[TÊN] mua [TÊN THUỐC] tái khám [NGÀY TÁI KHÁM]", { TÊN: "An" });
    assert.equal(result.ok, false);
    assert.deepEqual(result.missing, ["TÊN THUỐC", "NGÀY TÁI KHÁM"]);
  });

  test("no placeholders in template → ok=true, content unchanged", () => {
    const result = substituteTemplate("Dạ, chào anh/chị.", {});
    assert.deepEqual(result, { ok: true, content: "Dạ, chào anh/chị." });
  });

  test("empty string value treated as missing (falsy guard)", () => {
    const result = substituteTemplate("Thuốc [TÊN THUỐC] ạ.", { "TÊN THUỐC": "" });
    assert.equal(result.ok, false);
    assert.deepEqual(result.missing, ["TÊN THUỐC"]);
  });
});

describe("detectMissingPlaceholders", () => {
  test("return missing field names only", () => {
    const missing = detectMissingPlaceholders(
      "Thuốc [TÊN THUỐC], tái khám [NGÀY TÁI KHÁM]",
      { "TÊN THUỐC": "Metformin" }
    );
    assert.deepEqual(missing, ["NGÀY TÁI KHÁM"]);
  });

  test("no missing → empty array", () => {
    const missing = detectMissingPlaceholders("[TÊN]", { TÊN: "An" });
    assert.deepEqual(missing, []);
  });

  test("no placeholders in template → empty array", () => {
    const missing = detectMissingPlaceholders("Dạ, chào anh/chị.", {});
    assert.deepEqual(missing, []);
  });

  test("duplicate [TÊN] in template → deduplicated, only one entry", () => {
    const missing = detectMissingPlaceholders("[TÊN] ơi, [TÊN] nhé.", {});
    assert.deepEqual(missing, ["TÊN"]);
  });

  test("empty string value in map → treated as missing", () => {
    const missing = detectMissingPlaceholders("[TÊN THUỐC]", { "TÊN THUỐC": "" });
    assert.deepEqual(missing, ["TÊN THUỐC"]);
  });
});

describe("appendTpcnSuffix", () => {
  test("care_group=4 → appends TPCN disclaimer verbatim", () => {
    const result = appendTpcnSuffix("Chào anh/chị.", 4);
    assert.ok(result.endsWith(TPCN_SUFFIX), `expected suffix not found in: ${result}`);
  });

  test("care_group=4 → separator is exactly \\n\\n before disclaimer", () => {
    const result = appendTpcnSuffix("Chào anh/chị.", 4);
    assert.equal(result, `Chào anh/chị.\n\n${TPCN_SUFFIX}`);
  });

  test("care_group=1 → no TPCN suffix added", () => {
    const result = appendTpcnSuffix("Chào anh/chị.", 1);
    assert.equal(result, "Chào anh/chị.");
  });

  test("care_group=5 → no TPCN suffix added", () => {
    const result = appendTpcnSuffix("Chào anh/chị.", 5);
    assert.equal(result, "Chào anh/chị.");
  });

  test("care_group='4' as string → no suffix (strict === 4 int check)", () => {
    const result = appendTpcnSuffix("Chào anh/chị.", "4");
    assert.equal(result, "Chào anh/chị.");
  });
});

describe("buildCustomerRef", () => {
  test("returns 64-char hex string (SHA-256 output)", () => {
    const ref = buildCustomerRef("ph-001", "cust-123");
    assert.match(ref, /^[0-9a-f]{64}$/);
  });

  test("same input → same output (deterministic)", () => {
    const a = buildCustomerRef("ph-001", "cust-123");
    const b = buildCustomerRef("ph-001", "cust-123");
    assert.equal(a, b);
  });

  test("different inputs → different hashes (collision guard)", () => {
    const a = buildCustomerRef("ph-001", "cust-123");
    const b = buildCustomerRef("ph-002", "cust-123");
    assert.notEqual(a, b);
  });

  test("output is lowercase hex only", () => {
    const ref = buildCustomerRef("ph-001", "cust-456");
    assert.match(ref, /^[0-9a-f]+$/, "output must be lowercase hex");
  });
});
